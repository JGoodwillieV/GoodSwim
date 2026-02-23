import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Check, ChevronDown, ChevronRight, Globe, MapPin, Calendar, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { useTeamRole } from '../hooks/useTeamRole';
import { LSC_LIST } from '../utils/lscList';

export default function TimeStandardsBrowser({ onClose, onSelect }) {
  const { teamId } = useTeamRole();
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [lscFilter, setLscFilter] = useState('all');
  const [addedSetIds, setAddedSetIds] = useState(new Set());
  const [teamSelections, setTeamSelections] = useState(new Set());
  const [adding, setAdding] = useState(null);
  const [expandedSet, setExpandedSet] = useState(null);
  const [expandedEntries, setExpandedEntries] = useState([]);

  useEffect(() => {
    fetchSets();
    if (teamId) fetchTeamSelections();
  }, [teamId]);

  const fetchSets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('time_standard_sets')
        .select('*')
        .eq('is_public', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSets(data || []);
    } catch (err) {
      console.error('Error fetching standard sets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamSelections = async () => {
    if (!teamId) return;
    try {
      const { data, error } = await supabase
        .from('team_standard_selections')
        .select('set_id')
        .eq('team_id', teamId);
      if (error) throw error;
      setTeamSelections(new Set((data || []).map(d => d.set_id)));
    } catch (err) {
      console.error('Error fetching team selections:', err);
    }
  };

  const handleAdd = async (setId) => {
    if (!teamId) return;
    setAdding(setId);
    try {
      const { error } = await supabase
        .from('team_standard_selections')
        .insert({ team_id: teamId, set_id: setId });
      if (error && error.code !== '23505') throw error;
      setAddedSetIds(prev => new Set([...prev, setId]));
      setTeamSelections(prev => new Set([...prev, setId]));
      onSelect();
    } catch (err) {
      console.error('Error adding standard set:', err);
      alert('Failed to add. Please try again.');
    } finally {
      setAdding(null);
    }
  };

  const handleExpand = async (setId) => {
    if (expandedSet === setId) {
      setExpandedSet(null);
      setExpandedEntries([]);
      return;
    }
    setExpandedSet(setId);
    try {
      const { data, error } = await supabase
        .from('time_standard_entries')
        .select('*')
        .eq('set_id', setId)
        .order('event')
        .order('gender')
        .order('age_min')
        .limit(100);
      if (error) throw error;
      setExpandedEntries(data || []);
    } catch (err) {
      console.error('Error fetching entries:', err);
      setExpandedEntries([]);
    }
  };

  const filteredSets = sets.filter(s => {
    if (courseFilter !== 'all' && s.course !== courseFilter) return false;
    if (lscFilter !== 'all' && s.organization !== lscFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (s.name || '').toLowerCase().includes(q) ||
        (s.organization || '').toLowerCase().includes(q) ||
        (s.season || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const availableLSCs = [...new Set(sets.map(s => s.organization).filter(Boolean))].sort();

  const courseBadgeColor = (course) => {
    if (course === 'SCY') return 'bg-blue-100 text-blue-700';
    if (course === 'LCM') return 'bg-emerald-100 text-emerald-700';
    if (course === 'SCM') return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-600';
  };

  const groupEntriesByEvent = (entries) => {
    const grouped = {};
    for (const e of entries) {
      if (!grouped[e.event]) grouped[e.event] = [];
      grouped[e.event].push(e);
    }
    return grouped;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Browse Standards Library</h2>
            <p className="text-sm text-slate-500 mt-0.5">Find and add time standards shared by other teams</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, LSC, season..."
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <select
            value={lscFilter}
            onChange={(e) => setLscFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white max-w-[180px]"
          >
            <option value="all">All LSCs</option>
            {availableLSCs.map(lsc => (
              <option key={lsc} value={lsc}>{lsc}</option>
            ))}
          </select>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
          >
            <option value="all">All Courses</option>
            <option value="SCY">SCY</option>
            <option value="LCM">LCM</option>
            <option value="SCM">SCM</option>
          </select>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="text-blue-500 animate-spin" />
            </div>
          ) : filteredSets.length === 0 ? (
            <div className="text-center py-12">
              <Globe size={32} className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No standards found</p>
              <p className="text-sm text-slate-400 mt-1">
                {searchQuery ? 'Try a different search term' : 'Be the first to upload and share time standards!'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredSets.map((set) => {
                const isAlreadyAdded = teamSelections.has(set.id);
                const justAdded = addedSetIds.has(set.id);
                const isExpanded = expandedSet === set.id;

                return (
                  <div key={set.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-3 p-4">
                      <button
                        onClick={() => handleExpand(set.id)}
                        className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-slate-900 text-sm truncate">{set.name}</h3>
                          {set.course && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${courseBadgeColor(set.course)}`}>
                              {set.course}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          {set.organization && (
                            <span className="flex items-center gap-1">
                              <MapPin size={11} /> {set.organization}
                            </span>
                          )}
                          {set.season && (
                            <span className="flex items-center gap-1">
                              <Calendar size={11} /> {set.season}
                            </span>
                          )}
                        </div>
                      </div>

                      {isAlreadyAdded ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded-lg">
                          <Check size={14} />
                          {justAdded ? 'Added!' : 'Added'}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAdd(set.id)}
                          disabled={adding === set.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {adding === set.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Plus size={14} />
                          )}
                          Add to Team
                        </button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-100 bg-slate-50 p-3 max-h-64 overflow-y-auto">
                        {expandedEntries.length === 0 ? (
                          <p className="text-sm text-slate-400 text-center py-3">No entries found.</p>
                        ) : (
                          <div className="space-y-3">
                            {Object.entries(groupEntriesByEvent(expandedEntries)).map(([event, entries]) => (
                              <div key={event}>
                                <h4 className="text-xs font-bold text-slate-500 uppercase mb-1">{event}</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                  {entries.map((e) => (
                                    <div key={e.id} className="flex items-center justify-between text-xs bg-white px-2.5 py-1.5 rounded-lg">
                                      <span className="text-slate-600">
                                        {e.gender === 'M' ? 'Boys' : 'Girls'} {e.age_min === 0 ? `${e.age_max}&U` : e.age_max >= 99 ? `${e.age_min}+` : `${e.age_min}-${e.age_max}`}
                                        {e.standard_name && <span className="text-slate-400 ml-1">({e.standard_name})</span>}
                                      </span>
                                      <span className="font-mono text-slate-900">{e.time_string}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {expandedEntries.length >= 100 && (
                              <p className="text-xs text-slate-400 text-center">Showing first 100 entries</p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
