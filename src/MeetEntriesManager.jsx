// src/MeetEntriesManager.jsx
// Coach interface for uploading SD3 files and managing meet entries
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';
import { parseSD3File, formatTime, groupEntriesBySwimmer } from './utils/sd3Parser';
import {
  Upload, FileText, Calendar, Users, ChevronLeft, Check, X, Clock,
  AlertTriangle, CheckCircle, Send, Eye, Trash2, Edit3, MoreVertical,
  ChevronDown, ChevronRight, Search, Filter, Download, Bell, RefreshCw,
  Loader2, User, Waves, MapPin, Timer
} from 'lucide-react';

// Helper function to format seed time for display
function formatSeedTime(seconds, displayStr) {
  // If we have a display string from the original parsing, use it
  if (displayStr && displayStr !== 'NT') {
    return displayStr;
  }
  
  // Otherwise format from seconds
  if (!seconds || seconds === 0) {
    return 'NT';
  }
  
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2).padStart(5, '0');
    return `${mins}:${secs}`;
  }
  
  return seconds.toFixed(2);
}

// Status badge component
function StatusBadge({ status }) {
  const config = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Draft' },
    open: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Open' },
    closed: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Closed' },
    completed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Completed' }
  };
  
  const { bg, text, label } = config[status] || config.draft;
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      {label}
    </span>
  );
}

// Confirmation status badge
function ConfirmationBadge({ status }) {
  const config = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    confirmed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
    change_requested: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Edit3 },
    scratched: { bg: 'bg-red-100', text: 'text-red-700', icon: X }
  };
  
  const { bg, text, icon: Icon } = config[status] || config.pending;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <Icon size={12} />
      {status.replace('_', ' ')}
    </span>
  );
}

// Meet Card Component
function MeetCard({ meet, stats, onClick, onStatusChange }) {
  const deadline = meet.entry_deadline ? new Date(meet.entry_deadline) : null;
  const isDeadlineSoon = deadline && (deadline - new Date()) < 48 * 60 * 60 * 1000; // 48 hours
  const isDeadlinePassed = deadline && deadline < new Date();
  
  return (
    <div 
      className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg text-slate-800">{meet.name}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
            <Calendar size={14} />
            <span>
              {(() => {
                const [year, month, day] = meet.start_date.split('T')[0].split('-');
                const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              })()}
              {meet.end_date && meet.end_date !== meet.start_date && 
                ` - ${(() => {
                  const [year, month, day] = meet.end_date.split('T')[0].split('-');
                  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                })()}`
              }
            </span>
          </div>
        </div>
        <StatusBadge status={meet.status} />
      </div>
      
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 mb-3">
          <div className="bg-slate-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-slate-800">{stats.total_swimmers || 0}</p>
            <p className="text-xs text-slate-500">Swimmers</p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-emerald-600">{stats.confirmed || 0}</p>
            <p className="text-xs text-emerald-600">Confirmed</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-amber-600">{stats.pending || 0}</p>
            <p className="text-xs text-amber-600">Pending</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 text-center">
            <p className="text-lg font-bold text-blue-600">{stats.change_requested || 0}</p>
            <p className="text-xs text-blue-600">Changes</p>
          </div>
        </div>
      )}
      
      {/* Deadline */}
      {deadline && meet.status === 'open' && (
        <div className={`flex items-center gap-2 text-sm ${
          isDeadlinePassed ? 'text-red-600' : isDeadlineSoon ? 'text-amber-600' : 'text-slate-500'
        }`}>
          <Timer size={14} />
          <span>
            {isDeadlinePassed 
              ? 'Deadline passed' 
              : `Deadline: ${deadline.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
            }
          </span>
        </div>
      )}
    </div>
  );
}

// Upload Modal Component
function UploadModal({ onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [meetName, setMeetName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [matchResults, setMatchResults] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);
    setParsing(true);
    
    try {
      const content = await selectedFile.text();
      const parsed = parseSD3File(content);
      
      setParsedData(parsed);
      
      // Pre-fill meet info from parsed data
      if (parsed.meet) {
        setMeetName(parsed.meet.name || selectedFile.name.replace('.sd3', ''));
        if (parsed.meet.startDate) setStartDate(parsed.meet.startDate);
        if (parsed.meet.endDate) setEndDate(parsed.meet.endDate);
      }
      
      // Try to match swimmers to database
      await matchSwimmers(parsed.swimmerList);
      
    } catch (err) {
      setError('Failed to parse SD3 file: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  const matchSwimmers = async (swimmerList) => {
    try {
      // Get all swimmers from database
      const { data: dbSwimmers } = await supabase
        .from('swimmers')
        .select('id, name, usa_swimming_id');
      
      // Helper to convert "Last, First MI" to normalized format
      const normalizeSD3Name = (name) => {
        if (!name) return { full: '', first: '', last: '' };
        // SD3 format: "Last, First MI" or "Last, First"
        const parts = name.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          const lastName = parts[0].toLowerCase().replace(/[^a-z]/g, '');
          // Get first name (ignore middle initial)
          const firstPart = parts[1].split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
          return {
            full: firstPart + lastName,
            first: firstPart,
            last: lastName
          };
        }
        const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
        return { full: normalized, first: '', last: '' };
      };
      
      // Helper to normalize database name (assumed "First MI Last" format based on screenshot)
      const normalizeDBName = (name) => {
        if (!name) return { full: '', first: '', last: '' };
        // DB format appears to be "First MI Last" (e.g., "Marielle A Anderson")
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
          const firstName = parts[0].toLowerCase().replace(/[^a-z]/g, '');
          // Last name is the last part
          const lastName = parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, '');
          const full = name.toLowerCase().replace(/[^a-z]/g, '');
          return { full, first: firstName, last: lastName };
        }
        const normalized = name.toLowerCase().replace(/[^a-z]/g, '');
        return { full: normalized, first: '', last: '' };
      };
      
      const matches = swimmerList.map(swimmer => {
        // Try USA Swimming ID match first (most reliable)
        // SD3 truncates to 12 chars, DB has 14 chars, so match on first 12
        let match = null;
        
        if (swimmer.usaSwimmingId) {
          const sd3Id = swimmer.usaSwimmingId.substring(0, 12).toUpperCase();
          match = dbSwimmers?.find(db => {
            if (!db.usa_swimming_id) return false;
            const dbId = db.usa_swimming_id.substring(0, 12).toUpperCase();
            return dbId === sd3Id;
          });
        }
        
        // If no ID match, try name matching
        if (!match) {
          const sd3Name = normalizeSD3Name(swimmer.name);
          
          match = dbSwimmers?.find(db => {
            const dbName = normalizeDBName(db.name);
            
            // Exact match on first + last name
            if (sd3Name.first && sd3Name.last && dbName.first && dbName.last) {
              if (sd3Name.first === dbName.first && sd3Name.last === dbName.last) {
                return true;
              }
            }
            
            // Full normalized name match
            if (dbName.full === sd3Name.full) return true;
            
            // Check if first and last are both present in DB name
            if (sd3Name.first && sd3Name.last) {
              if (dbName.full.includes(sd3Name.first) && dbName.full.includes(sd3Name.last)) {
                return true;
              }
            }
            
            return false;
          });
        }
        
        return {
          ...swimmer,
          matchedSwimmerId: match?.id || null,
          matchedSwimmerName: match?.name || null,
          matchStatus: match ? 'matched' : 'unmatched'
        };
      });
      
      setMatchResults(matches);
    } catch (err) {
      console.error('Error matching swimmers:', err);
    }
  };

  const handleSave = async () => {
    if (!parsedData || !meetName || !startDate) {
      setError('Please fill in required fields');
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Create meet record
      const { data: meet, error: meetError } = await supabase
        .from('meets')
        .insert({
          name: meetName,
          start_date: startDate,
          end_date: endDate || startDate,
          entry_deadline: deadline || null,
          sd3_filename: file.name,
          sd3_uploaded_at: new Date().toISOString(),
          status: 'draft',
          created_by: user.id
        })
        .select()
        .single();
      
      if (meetError) throw meetError;
      
      // Create entry records
      const entries = parsedData.entries.map(entry => {
        const matchedSwimmer = matchResults?.find(m => m.usaSwimmingId === entry.usaSwimmingId);
        
        return {
          meet_id: meet.id,
          swimmer_id: matchedSwimmer?.matchedSwimmerId || null,
          swimmer_name: entry.swimmerName,
          usa_swimming_id: entry.usaSwimmingId,
          event_code: entry.eventCode,
          event_number: entry.eventNumber,
          event_name: entry.eventName,
          seed_time_seconds: entry.seedTimeSeconds,
          seed_time_display: entry.seedTimeDisplay,
          age_group: entry.ageGroup,
          is_bonus: entry.isBonus
        };
      });
      
      const { error: entriesError } = await supabase
        .from('meet_entries')
        .insert(entries);
      
      if (entriesError) throw entriesError;
      
      onSuccess(meet);
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="font-bold text-lg text-slate-800">Upload Meet Entries</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* File Upload */}
          {!parsedData && (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
              <input
                type="file"
                accept=".sd3"
                onChange={handleFileChange}
                className="hidden"
                id="sd3-upload"
              />
              <label htmlFor="sd3-upload" className="cursor-pointer">
                {parsing ? (
                  <Loader2 size={48} className="mx-auto text-blue-500 animate-spin mb-3" />
                ) : (
                  <Upload size={48} className="mx-auto text-slate-300 mb-3" />
                )}
                <p className="font-semibold text-slate-700">
                  {parsing ? 'Parsing file...' : 'Click to upload SD3 file'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  Export from TeamUnify or SwimTopia
                </p>
              </label>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertTriangle className="text-red-500 shrink-0" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          {/* Parsed Data Preview */}
          {parsedData && (
            <>
              {/* Meet Info */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-700">Meet Information</h3>
                <input
                  type="text"
                  placeholder="Meet Name *"
                  value={meetName}
                  onChange={(e) => setMeetName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">Start Date *</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-600 mb-1 block">End Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-600 mb-1 block">Confirmation Deadline</label>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              
              {/* Parse Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Parse Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-600">Swimmers</p>
                    <p className="text-2xl font-bold text-blue-800">{parsedData.swimmerList.length}</p>
                  </div>
                  <div>
                    <p className="text-blue-600">Entries</p>
                    <p className="text-2xl font-bold text-blue-800">{parsedData.entries.length}</p>
                  </div>
                  <div>
                    <p className="text-blue-600">Matched</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {matchResults?.filter(m => m.matchStatus === 'matched').length || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Swimmer Matching Preview */}
              {matchResults && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">
                    Swimmer Matching ({matchResults.filter(m => m.matchStatus === 'unmatched').length} unmatched)
                  </h3>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    {matchResults.map((swimmer, idx) => (
                      <div 
                        key={idx}
                        className={`flex items-center justify-between px-4 py-2 ${
                          idx !== matchResults.length - 1 ? 'border-b border-slate-100' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            swimmer.matchStatus === 'matched' ? 'bg-emerald-500' : 'bg-amber-500'
                          }`} />
                          <span className="text-sm text-slate-700">{swimmer.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {swimmer.matchStatus === 'matched' 
                            ? `→ ${swimmer.matchedSwimmerName}` 
                            : 'No match'
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Footer */}
        {parsedData && (
          <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !meetName || !startDate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Save Meet
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Meet Detail View Component
function MeetDetail({ meet, onBack, onUpdate }) {
  const [entries, setEntries] = useState([]);
  const [confirmations, setConfirmations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('entries');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadMeetData();
  }, [meet.id]);

  const loadMeetData = async () => {
    setLoading(true);
    try {
      // Load entries
      const { data: entriesData } = await supabase
        .from('meet_entries')
        .select(`
          *,
          swimmers (id, name, group_name)
        `)
        .eq('meet_id', meet.id)
        .order('swimmer_name');
      
      setEntries(entriesData || []);
      
      // Load confirmations
      const { data: confirmData } = await supabase
        .from('entry_confirmations')
        .select(`
          *,
          swimmers (id, name),
          parents (id, account_name)
        `)
        .eq('meet_id', meet.id);
      
      setConfirmations(confirmData || []);
      
      // Get stats
      const { data: statsData } = await supabase
        .rpc('get_meet_confirmation_stats', { meet_uuid: meet.id });
      
      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
      }
    } catch (error) {
      console.error('Error loading meet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Publish entries to parents? They will be able to view and confirm their swimmer\'s entries.')) return;
    
    try {
      const { error } = await supabase
        .from('meets')
        .update({ status: 'open' })
        .eq('id', meet.id);
      
      if (error) throw error;
      
      // Create an announcement about the meet
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      
      await supabase
        .from('announcements')
        .insert({
          title: `ACTION REQUIRED: ${meet.name} Entries`,
          content: `Meet entries are now available for review. Please confirm your swimmer's events${meet.entry_deadline ? ` by ${(() => {
            const [year, month, day] = meet.entry_deadline.split('T')[0].split('-');
            const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            return dateObj.toLocaleDateString();
          })()}` : ''}.`,
          type: 'meet',
          is_urgent: true,
          author_id: user.id,
          author_name: profile?.display_name || 'Coach'
        });
      
      onUpdate({ ...meet, status: 'open' });
    } catch (error) {
      alert('Error publishing: ' + error.message);
    }
  };

  const handleClose = async () => {
    if (!confirm('Close entries? Parents will no longer be able to make changes.')) return;
    
    try {
      const { error } = await supabase
        .from('meets')
        .update({ status: 'closed' })
        .eq('id', meet.id);
      
      if (error) throw error;
      onUpdate({ ...meet, status: 'closed' });
    } catch (error) {
      alert('Error closing: ' + error.message);
    }
  };

  // Group entries by swimmer
  const groupedEntries = entries.reduce((acc, entry) => {
    const key = entry.swimmer_name;
    if (!acc[key]) {
      acc[key] = {
        swimmerName: entry.swimmer_name,
        swimmer: entry.swimmers,
        entries: []
      };
    }
    acc[key].entries.push(entry);
    return acc;
  }, {});

  const swimmerGroups = Object.values(groupedEntries).filter(group =>
    group.swimmerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-800">{meet.name}</h2>
              <StatusBadge status={meet.status} />
            </div>
            <p className="text-slate-500">
              {(() => {
                const [year, month, day] = meet.start_date.split('T')[0].split('-');
                const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                return dateObj.toLocaleDateString('en-US', { 
                  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' 
                });
              })()}
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {meet.status === 'draft' && (
            <button
              onClick={handlePublish}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700"
            >
              <Send size={18} />
              Publish to Parents
            </button>
          )}
          {meet.status === 'open' && (
            <button
              onClick={handleClose}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-semibold hover:bg-amber-700"
            >
              <X size={18} />
              Close Entries
            </button>
          )}
        </div>
      </div>
      
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{stats.total_swimmers}</p>
            <p className="text-sm text-slate-500">Swimmers</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{stats.confirmed}</p>
            <p className="text-sm text-emerald-600">Confirmed</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-sm text-amber-600">Pending</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.change_requested}</p>
            <p className="text-sm text-blue-600">Changes Requested</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{stats.scratched}</p>
            <p className="text-sm text-red-600">Scratched</p>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('entries')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'entries' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
          }`}
        >
          Entries ({entries.length})
        </button>
        <button
          onClick={() => setActiveTab('confirmations')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
            activeTab === 'confirmations' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'
          }`}
        >
          Confirmations ({confirmations.length})
        </button>
      </div>
      
      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search swimmers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl"
        />
      </div>
      
      {/* Content */}
      {activeTab === 'entries' && (
        <div className="space-y-3">
          {swimmerGroups.map((group, idx) => (
            <SwimmerEntryCard key={idx} group={group} confirmations={confirmations} />
          ))}
        </div>
      )}
      
      {activeTab === 'confirmations' && (
        <div className="space-y-3">
          {confirmations.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center">
              <Clock size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No confirmations yet</p>
            </div>
          ) : (
            confirmations.map(conf => (
              <div key={conf.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{conf.swimmers?.name}</p>
                    <p className="text-sm text-slate-500">by {conf.parents?.account_name}</p>
                  </div>
                  <ConfirmationBadge status={conf.status} />
                </div>
                {conf.parent_notes && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">{conf.parent_notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Swimmer Entry Card (for coach view)
function SwimmerEntryCard({ group, confirmations }) {
  const [expanded, setExpanded] = useState(false);
  
  const confirmation = confirmations.find(c => c.swimmer_id === group.swimmer?.id);
  
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
            {group.swimmerName.charAt(0)}
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800">{group.swimmerName}</p>
            <p className="text-sm text-slate-500">
              {group.entries.length} event{group.entries.length !== 1 ? 's' : ''}
              {group.swimmer?.group_name && ` • ${group.swimmer.group_name}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {confirmation && <ConfirmationBadge status={confirmation.status} />}
          <ChevronDown 
            size={20} 
            className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>
      
      {expanded && (
        <div className="border-t border-slate-100 p-4">
          <div className="space-y-2">
            {group.entries.map((entry, idx) => (
              <div 
                key={idx}
                className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Waves size={16} className="text-blue-500" />
                  <span className="font-medium text-slate-700">
                    {entry.event_number ? `#${entry.event_number} - ` : ''}{entry.event_name}
                  </span>
                  {entry.is_bonus && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                      Bonus
                    </span>
                  )}
                </div>
                <span className="text-slate-600 font-mono">
                  {formatSeedTime(entry.seed_time_seconds, entry.seed_time_display)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main Component
export default function MeetEntriesManager({ onBack }) {
  const [meets, setMeets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedMeet, setSelectedMeet] = useState(null);
  const [meetsStats, setMeetsStats] = useState({});

  useEffect(() => {
    loadMeets();
  }, []);

  const loadMeets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meets')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      setMeets(data || []);
      
      // Load stats for each meet
      const stats = {};
      for (const meet of (data || [])) {
        const { data: statData } = await supabase
          .rpc('get_meet_confirmation_stats', { meet_uuid: meet.id });
        if (statData && statData.length > 0) {
          stats[meet.id] = statData[0];
        }
      }
      setMeetsStats(stats);
    } catch (error) {
      console.error('Error loading meets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (meet) => {
    setMeets(prev => [meet, ...prev]);
    setShowUpload(false);
    setSelectedMeet(meet);
  };

  const handleMeetUpdate = (updatedMeet) => {
    setMeets(prev => prev.map(m => m.id === updatedMeet.id ? updatedMeet : m));
    setSelectedMeet(updatedMeet);
    loadMeets(); // Refresh stats
  };

  if (selectedMeet) {
    return (
      <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
        <MeetDetail 
          meet={selectedMeet} 
          onBack={() => setSelectedMeet(null)}
          onUpdate={handleMeetUpdate}
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <ChevronLeft size={24} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Meet Entries</h2>
            <p className="text-sm text-slate-500">Upload and manage meet entries</p>
          </div>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
        >
          <Upload size={18} />
          <span className="hidden md:inline">Upload SD3</span>
        </button>
      </header>
      
      {/* Meets List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : meets.length === 0 ? (
        <div className="bg-slate-50 rounded-2xl p-12 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="font-semibold text-slate-700 mb-2">No meets yet</h3>
          <p className="text-slate-500 mb-4">Upload an SD3 file to get started</p>
          <button
            onClick={() => setShowUpload(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
          >
            <Upload size={18} />
            Upload SD3 File
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {meets.map(meet => (
            <MeetCard
              key={meet.id}
              meet={meet}
              stats={meetsStats[meet.id]}
              onClick={() => setSelectedMeet(meet)}
            />
          ))}
        </div>
      )}
      
      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
