// src/ParentMeetsView.jsx
// Parent view for swim meets - commit/decline, view entries, see schedule
// Integrates with ParentDashboard

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import {
  Calendar, MapPin, Clock, ChevronLeft, ChevronRight,
  Check, X, AlertCircle, Loader2, Timer, Play, Video,
  Users, Award, ExternalLink, Info, ChevronDown
} from 'lucide-react';

// Import centralized utilities
import { formatDateSafe } from './utils/dateUtils';

// ============================================
// HELPERS
// ============================================

// Format date with weekday for this view
const formatDate = (date) => {
  return formatDateSafe(date, { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
};

const formatTime = (time) => {
  if (!time) return '';
  try {
    // Handle full timestamps like "2025-11-14 09:43:00" or ISO format or just times
    let timeStr = time;
    if (typeof time === 'string') {
      if (time.includes('T')) {
        // ISO format
        timeStr = new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      } else if (time.includes(' ')) {
        // Space-separated timestamp "2025-11-14 09:43:00"
        timeStr = time.split(' ')[1];
      }
    }
    
    if (timeStr.includes(':')) {
      const [hours, mins] = timeStr.split(':');
      const h = parseInt(hours);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${hour12}:${mins.substring(0, 2)} ${ampm}`;
    }
    return timeStr;
  } catch {
    return time;
  }
};

const StatusBadge = ({ status }) => {
  const styles = {
    draft: 'bg-slate-100 text-slate-600',
    open: 'bg-green-100 text-green-700',
    closed: 'bg-amber-100 text-amber-700',
    completed: 'bg-blue-100 text-blue-700'
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft'}
    </span>
  );
};

const CommitmentBadge = ({ status }) => {
  const styles = {
    committed: 'bg-green-100 text-green-700 border-green-200',
    declined: 'bg-red-100 text-red-700 border-red-200',
    pending: 'bg-amber-100 text-amber-700 border-amber-200'
  };
  
  const icons = {
    committed: <Check size={14} />,
    declined: <X size={14} />,
    pending: <Clock size={14} />
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
      {icons[status]}
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Pending'}
    </span>
  );
};

// ============================================
// SWIMMER EVENT HISTORY CARD
// ============================================

const SwimmerEventHistory = ({ swimmerId, eventName }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [swimmerId, eventName]);

  const loadHistory = async () => {
    try {
      // Use the database function to get historical times
      const { data, error } = await supabase.rpc('get_swimmer_event_history', {
        p_swimmer_id: swimmerId,
        p_event_name: eventName,
        p_limit: 5
      });
      
      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Error loading history:', error);
      // Fallback: direct query to results table
      try {
        const { data } = await supabase
          .from('results')
          .select('*')
          .eq('swimmer_id', swimmerId)
          .ilike('event', `%${eventName.replace(/\s+/g, '%')}%`)
          .order('date', { ascending: false })
          .limit(5);
        setHistory(data || []);
      } catch (e) {
        console.error('Fallback query failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-xs text-slate-400">Loading history...</div>;
  if (history.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
      >
        <Timer size={12} />
        {history.length} previous {history.length === 1 ? 'swim' : 'swims'}
        <ChevronDown size={12} className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      
      {expanded && (
        <div className="mt-2 space-y-1 bg-slate-50 rounded-lg p-2">
          {history.map((swim, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-500">{formatDate(swim.result_date || swim.date)}</span>
                <span className="font-mono font-medium">{swim.time_display || swim.time}</span>
              </div>
              {(swim.video_url) && (
                <a
                  href={swim.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <Video size={12} />
                  Video
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// MEET CARD FOR PARENT
// ============================================

const ParentMeetCard = ({ meet, swimmers, commitments, onCommit, onDecline, onViewDetails }) => {
  const isPast = new Date(meet.end_date || meet.start_date) < new Date();
  const isOpen = meet.status === 'open';
  
  // Group commitments by swimmer
  const swimmerCommitments = useMemo(() => {
    const map = {};
    swimmers.forEach(s => {
      const commitment = commitments.find(c => c.swimmer_id === s.id);
      map[s.id] = commitment?.status || 'pending';
    });
    return map;
  }, [swimmers, commitments]);

  const allCommitted = swimmers.every(s => swimmerCommitments[s.id] === 'committed');
  const allDeclined = swimmers.every(s => swimmerCommitments[s.id] === 'declined');
  const hasResponded = swimmers.every(s => swimmerCommitments[s.id] !== 'pending');

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${isPast ? 'opacity-75' : ''}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-slate-800">{meet.name}</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
              <Calendar size={14} />
              <span>
                {formatDate(meet.start_date)}
                {meet.end_date && meet.end_date !== meet.start_date && ` - ${formatDate(meet.end_date)}`}
              </span>
            </div>
          </div>
          <StatusBadge status={meet.status} />
        </div>
        
        {meet.location_name && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <MapPin size={14} />
            <span>{meet.location_name}</span>
          </div>
        )}
        
        {meet.entry_deadline && !isPast && (
          <div className="mt-2 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
            <AlertCircle size={14} />
            <span>Deadline: {formatDate(meet.entry_deadline)}</span>
          </div>
        )}
      </div>

      {/* Swimmer Commitments */}
      <div className="p-4">
        <div className="text-sm font-medium text-slate-700 mb-3">My Swimmers</div>
        <div className="space-y-3">
          {swimmers.map(swimmer => {
            const status = swimmerCommitments[swimmer.id];
            const commitment = commitments.find(c => c.swimmer_id === swimmer.id);
            
            return (
              <div key={swimmer.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                    {swimmer.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{swimmer.name}</div>
                    <div className="text-xs text-slate-500">{swimmer.group_name}</div>
                  </div>
                </div>
                
                {isOpen && status === 'pending' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onCommit(meet.id, swimmer.id)}
                      className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                    >
                      <Check size={14} />
                      Commit
                    </button>
                    <button
                      onClick={() => onDecline(meet.id, swimmer.id)}
                      className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300 flex items-center gap-1"
                    >
                      <X size={14} />
                      Decline
                    </button>
                  </div>
                ) : (
                  <CommitmentBadge status={status} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* View Details Button */}
      {(hasResponded || !isOpen) && (
        <div className="p-4 pt-0">
          <button
            onClick={() => onViewDetails(meet)}
            className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2"
          >
            <Info size={16} />
            View Meet Details
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================
// SWIMMER MEET SCHEDULE VIEW
// ============================================

const SwimmerMeetSchedule = ({ meet, swimmer, entries, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [swimmerEntries, setSwimmerEntries] = useState([]);

  useEffect(() => {
    loadEntries();
  }, [meet.id, swimmer.id]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      // Load session information first
      const { data: sessionsData } = await supabase
        .from('meet_sessions')
        .select('*')
        .eq('meet_id', meet.id)
        .order('session_number');
      
      const sessionMap = {};
      (sessionsData || []).forEach(s => {
        sessionMap[s.session_number] = s;
      });
      
      // Load entries with event info including session_number from meet_events
      const { data } = await supabase
        .from('meet_entries')
        .select(`
          *,
          meet_events(event_number, session_number)
        `)
        .eq('meet_id', meet.id)
        .eq('swimmer_id', swimmer.id)
        .order('estimated_start_time');
      
      // Enhance entries with session data
      // Use session_number from entry, or fall back to meet_events.session_number
      const enhancedEntries = (data || []).map(entry => {
        const sessionNum = entry.session_number || entry.meet_events?.session_number || 0;
        return {
          ...entry,
          session_number: sessionNum, // Ensure we have a session number
          session_info: sessionMap[sessionNum] || null
        };
      });
      
      // Sort by session number, then estimated start time
      enhancedEntries.sort((a, b) => {
        if (a.session_number !== b.session_number) {
          return (a.session_number || 999) - (b.session_number || 999);
        }
        if (a.estimated_start_time && b.estimated_start_time) {
          return a.estimated_start_time.localeCompare(b.estimated_start_time);
        }
        return 0;
      });
      
      setSwimmerEntries(enhancedEntries);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group entries by session/day
  const entriesBySession = useMemo(() => {
    const groups = {};
    swimmerEntries.forEach(entry => {
      const session = entry.session_number || 0;
      if (!groups[session]) {
        const sessionInfo = entry.session_info;
        groups[session] = {
          sessionNumber: session,
          sessionName: sessionInfo?.session_name || `Session ${session || 'TBD'}`,
          sessionDate: sessionInfo?.session_date || null,
          startTime: sessionInfo?.start_time || null,
          entries: []
        };
      }
      groups[session].entries.push(entry);
    });
    // Sort by session number
    return Object.values(groups).sort((a, b) => a.sessionNumber - b.sessionNumber);
  }, [swimmerEntries]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{swimmer.name}'s Schedule</h2>
          <p className="text-slate-500">{meet.name}</p>
        </div>
      </div>

      {/* Meet Info */}
      <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-600">
          <Calendar size={16} />
          <span>{formatDate(meet.start_date)}</span>
        </div>
        {meet.location_name && (
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin size={16} />
            <span>{meet.location_name}</span>
          </div>
        )}
      </div>

      {/* Entries */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : swimmerEntries.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>No events scheduled yet</p>
          <p className="text-sm">Check back once entries have been submitted</p>
        </div>
      ) : (
        <div className="space-y-6">
          {entriesBySession.map((session, idx) => (
            <div key={idx} className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 bg-slate-800 text-white">
                <div className="font-semibold text-lg">{session.sessionName}</div>
                <div className="text-sm text-slate-300 flex gap-4 mt-1">
                  {session.sessionDate && (
                    <span>
                      {(() => {
                        const [year, month, day] = session.sessionDate.split('T')[0].split('-');
                        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        return dateObj.toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short',
                          day: 'numeric'
                        });
                      })()}
                    </span>
                  )}
                  {session.startTime && (
                    <span>Start: {formatTime(session.startTime)}</span>
                  )}
                </div>
              </div>
              <div className="divide-y">
                {session.entries.map(entry => (
                  <div key={entry.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {/* Event Number */}
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold text-lg">
                          {entry.event_number || entry.meet_events?.event_number || '#'}
                        </div>
                        
                        {/* Event Details */}
                        <div>
                          <div className="font-semibold text-slate-800">{entry.event_name}</div>
                          
                          {/* Heat/Lane */}
                          {entry.heat_number && (
                            <div className="text-sm text-slate-600 mt-1">
                              Heat {entry.heat_number}, Lane {entry.lane_number}
                            </div>
                          )}
                          
                          {/* Estimated Time */}
                          {entry.estimated_start_time && (
                            <div className="flex items-center gap-1 text-sm text-blue-600 mt-1">
                              <Clock size={14} />
                              Estimated: {formatTime(entry.estimated_start_time)}
                            </div>
                          )}
                          
                          {/* Historical Times */}
                          <SwimmerEventHistory 
                            swimmerId={swimmer.id} 
                            eventName={entry.event_name} 
                          />
                        </div>
                      </div>
                      
                      {/* Seed Time */}
                      <div className="text-right">
                        <div className="text-sm text-slate-500">Seed</div>
                        <div className="font-mono text-lg font-semibold text-slate-800">
                          {entry.seed_time_display || 'NT'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// MEET DETAIL VIEW FOR PARENT
// ============================================

const ParentMeetDetail = ({ meet, swimmers, commitments, onBack, onRefresh }) => {
  const [activeSwimmer, setActiveSwimmer] = useState(null);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, [meet.id]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      // Load entries for all swimmers
      const { data } = await supabase
        .from('meet_entries')
        .select('*')
        .eq('meet_id', meet.id)
        .in('swimmer_id', swimmers.map(s => s.id));
      
      // Group by swimmer
      const grouped = {};
      (data || []).forEach(entry => {
        if (!grouped[entry.swimmer_id]) grouped[entry.swimmer_id] = [];
        grouped[entry.swimmer_id].push(entry);
      });
      setEntries(grouped);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  // If viewing a swimmer's schedule
  if (activeSwimmer) {
    return (
      <SwimmerMeetSchedule
        meet={meet}
        swimmer={activeSwimmer}
        entries={entries[activeSwimmer.id] || []}
        onBack={() => setActiveSwimmer(null)}
      />
    );
  }

  // Get commitment status for each swimmer
  const getCommitmentStatus = (swimmerId) => {
    const commitment = commitments.find(c => c.swimmer_id === swimmerId);
    return commitment?.status || 'pending';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{meet.name}</h2>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Calendar size={14} />
            <span>
              {formatDate(meet.start_date)}
              {meet.end_date && meet.end_date !== meet.start_date && ` - ${formatDate(meet.end_date)}`}
            </span>
          </div>
        </div>
      </div>

      {/* Meet Info */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        {meet.location_name && (
          <div className="flex items-start gap-3">
            <MapPin size={18} className="text-slate-400 mt-0.5" />
            <div>
              <div className="font-medium text-slate-800">{meet.location_name}</div>
              {meet.location_address && (
                <div className="text-sm text-slate-500">{meet.location_address}</div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-4 text-sm text-slate-600">
          {meet.course && (
            <span className="px-2 py-1 bg-slate-100 rounded">{meet.course}</span>
          )}
          {meet.meet_type && (
            <span className="px-2 py-1 bg-slate-100 rounded">
              {meet.meet_type === 'prelims_finals' ? 'Prelims/Finals' : 'Timed Finals'}
            </span>
          )}
        </div>
      </div>

      {/* Swimmers */}
      <div>
        <h3 className="text-lg font-semibold text-slate-800 mb-4">My Swimmers</h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="animate-spin text-blue-600" size={24} />
          </div>
        ) : (
          <div className="space-y-3">
            {swimmers.map(swimmer => {
              const status = getCommitmentStatus(swimmer.id);
              const swimmerEntries = entries[swimmer.id] || [];
              const isCommitted = status === 'committed';
              
              return (
                <div key={swimmer.id} className="bg-white rounded-xl border overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                        {swimmer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{swimmer.name}</div>
                        <div className="text-sm text-slate-500">{swimmer.group_name}</div>
                      </div>
                    </div>
                    <CommitmentBadge status={status} />
                  </div>
                  
                  {isCommitted && (
                    <div className="px-4 pb-4">
                      {swimmerEntries.length > 0 ? (
                        <>
                          <div className="text-sm text-slate-600 mb-2">
                            {swimmerEntries.length} event{swimmerEntries.length !== 1 ? 's' : ''} entered
                          </div>
                          <button
                            onClick={() => setActiveSwimmer(swimmer)}
                            className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-2"
                          >
                            <Calendar size={16} />
                            View Schedule & Events
                          </button>
                        </>
                      ) : (
                        <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                          Events not yet assigned. Check back after entries are submitted.
                        </div>
                      )}
                    </div>
                  )}
                  
                  {status === 'declined' && (
                    <div className="px-4 pb-4">
                      <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                        Not attending this meet
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN PARENT MEETS VIEW
// ============================================

export default function ParentMeetsView({ user }) {
  const [meets, setMeets] = useState([]);
  const [swimmers, setSwimmers] = useState([]);
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeet, setSelectedMeet] = useState(null);
  const [filter, setFilter] = useState('upcoming');
  const [parentId, setParentId] = useState(null);  // Store parent table ID

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      // First get the parent record
      const { data: parentData } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      let swimmersData = [];
      let fetchedParentId = null;
      
      if (parentData) {
        fetchedParentId = parentData.id;
        setParentId(fetchedParentId);
        
        // Get linked swimmers through swimmer_parents junction table
        const { data: swimmerLinks } = await supabase
          .from('swimmer_parents')
          .select(`
            swimmer_id,
            swimmers (*)
          `)
          .eq('parent_id', parentData.id);
        
        if (swimmerLinks) {
          swimmersData = swimmerLinks
            .map(link => link.swimmers)
            .filter(Boolean);
        }
      }
      
      setSwimmers(swimmersData);
      
      // Load meets that are open or have entries
      const { data: meetsData } = await supabase
        .from('meets')
        .select('*')
        .in('status', ['open', 'closed', 'completed'])
        .order('start_date', { ascending: false });
      
      setMeets(meetsData || []);
      
      // Load all commitments for this parent (use parent table id, not user.id)
      if (fetchedParentId) {
        const { data: commitmentsData } = await supabase
          .from('meet_commitments')
          .select('*')
          .eq('parent_id', fetchedParentId);
        
        setCommitments(commitmentsData || []);
      } else {
        setCommitments([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async (meetId, swimmerId) => {
    if (!parentId) {
      alert('Error: Parent account not found');
      return;
    }
    try {
      const { error } = await supabase
        .from('meet_commitments')
        .upsert({
          meet_id: meetId,
          swimmer_id: swimmerId,
          parent_id: parentId,  // Use parent table ID, not user.id
          status: 'committed',
          committed_at: new Date().toISOString()
        }, { onConflict: 'meet_id,swimmer_id,parent_id' });
      
      if (error) throw error;
      loadData();
    } catch (error) {
      alert('Error committing: ' + error.message);
    }
  };

  const handleDecline = async (meetId, swimmerId) => {
    if (!parentId) {
      alert('Error: Parent account not found');
      return;
    }
    try {
      const { error } = await supabase
        .from('meet_commitments')
        .upsert({
          meet_id: meetId,
          swimmer_id: swimmerId,
          parent_id: parentId,  // Use parent table ID, not user.id
          status: 'declined',
          committed_at: new Date().toISOString()
        }, { onConflict: 'meet_id,swimmer_id,parent_id' });
      
      if (error) throw error;
      loadData();
    } catch (error) {
      alert('Error declining: ' + error.message);
    }
  };

  const filteredMeets = useMemo(() => {
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        return meets.filter(m => new Date(m.end_date || m.start_date) >= now);
      case 'past':
        return meets.filter(m => new Date(m.end_date || m.start_date) < now);
      default:
        return meets;
    }
  }, [meets, filter]);

  const getMeetCommitments = (meetId) => {
    return commitments.filter(c => c.meet_id === meetId);
  };

  // Detail view
  if (selectedMeet) {
    return (
      <ParentMeetDetail
        meet={selectedMeet}
        swimmers={swimmers}
        commitments={getMeetCommitments(selectedMeet.id)}
        onBack={() => {
          setSelectedMeet(null);
          loadData();
        }}
        onRefresh={loadData}
      />
    );
  }

  // List view
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Swim Meets</h2>
        <p className="text-slate-500">Commit to meets and view your swimmers' schedules</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['upcoming', 'past', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f 
                ? 'bg-slate-800 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* No swimmers warning */}
      {swimmers.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="text-amber-600" />
          <div>
            <div className="font-medium text-amber-800">No swimmers linked to your account</div>
            <p className="text-sm text-amber-600">Contact your coach to link your swimmers</p>
          </div>
        </div>
      )}

      {/* Meets */}
      {filteredMeets.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>No meets available</p>
          <p className="text-sm">Check back when new meets are posted</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMeets.map(meet => (
            <ParentMeetCard
              key={meet.id}
              meet={meet}
              swimmers={swimmers}
              commitments={getMeetCommitments(meet.id)}
              onCommit={handleCommit}
              onDecline={handleDecline}
              onViewDetails={setSelectedMeet}
            />
          ))}
        </div>
      )}
    </div>
  );
}
