import React, { useState, useEffect } from 'react';
import { Upload, Search, Trash2, ChevronDown, ChevronRight, Clock, Globe, MapPin, FileText, Calendar } from 'lucide-react';
import { supabase } from '../supabase';
import { useTeamRole } from '../hooks/useTeamRole';
import TimeStandardsUpload from './TimeStandardsUpload';
import TimeStandardsBrowser from './TimeStandardsBrowser';

export default function TimeStandardsTab() {
  const { teamId } = useTeamRole();
  const [selections, setSelections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSet, setExpandedSet] = useState(null);
  const [expandedEntries, setExpandedEntries] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (teamId) fetchSelections();
  }, [teamId]);

  const fetchSelections = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_standard_selections')
        .select(`
          id,
          set_id,
          created_at,
          time_standard_sets (
            id, name, organization, season, course, is_public, status, created_at, created_by_team_id
          )
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSelections(data || []);
    } catch (err) {
      console.error('Error fetching standard selections:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (selectionId) => {
    if (!confirm('Remove this standard set from your team?')) return;
    setRemoving(selectionId);
    try {
      const { error } = await supabase
        .from('team_standard_selections')
        .delete()
        .eq('id', selectionId);
      if (error) throw error;
      setSelections(prev => prev.filter(s => s.id !== selectionId));
      if (expandedSet === selectionId) {
        setExpandedSet(null);
        setExpandedEntries([]);
      }
    } catch (err) {
      console.error('Error removing selection:', err);
      alert('Failed to remove. Please try again.');
    } finally {
      setRemoving(null);
    }
  };

  const handleExpand = async (selectionId, setId) => {
    if (expandedSet === selectionId) {
      setExpandedSet(null);
      setExpandedEntries([]);
      return;
    }
    setExpandedSet(selectionId);
    try {
      const { data, error } = await supabase
        .from('time_standard_entries')
        .select('*')
        .eq('set_id', setId)
        .order('event')
        .order('gender')
        .order('age_min');
      if (error) throw error;
      setExpandedEntries(data || []);
    } catch (err) {
      console.error('Error fetching entries:', err);
      setExpandedEntries([]);
    }
  };

  const handleUploadComplete = () => {
    setShowUpload(false);
    fetchSelections();
  };

  const handleBrowseSelect = () => {
    setShowBrowser(false);
    fetchSelections();
  };

  const groupEntriesByEvent = (entries) => {
    const grouped = {};
    for (const e of entries) {
      const key = `${e.event}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(e);
    }
    return grouped;
  };

  const courseBadgeColor = (course) => {
    if (course === 'SCY') return 'bg-blue-100 text-blue-700';
    if (course === 'LCM') return 'bg-emerald-100 text-emerald-700';
    if (course === 'SCM') return 'bg-purple-100 text-purple-700';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="overflow-y-auto h-full">
      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Custom Time Standards</h2>
            <p className="text-sm text-slate-500">
              Upload meet cuts, state qualifying times, or browse standards shared by other teams.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBrowser(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors shadow-sm"
            >
              <Search size={16} />
              Browse
            </button>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Upload size={16} />
              Upload
            </button>
          </div>
        </div>

        {/* Active standard sets */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-white rounded-xl border border-slate-200 p-5 h-20" />
            ))}
          </div>
        ) : selections.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center">
            <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Clock size={24} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No Custom Standards Yet</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Upload time standards from your state, LSC, or meet — or browse standards that other teams have already shared.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setShowBrowser(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
              >
                <Search size={16} />
                Browse Library
              </button>
              <button
                onClick={() => setShowUpload(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                <Upload size={16} />
                Upload Standards
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {selections.map((sel) => {
              const set = sel.time_standard_sets;
              if (!set) return null;
              const isExpanded = expandedSet === sel.id;

              return (
                <div key={sel.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  {/* Set header */}
                  <div className="flex items-center gap-3 p-4">
                    <button
                      onClick={() => handleExpand(sel.id, set.id)}
                      className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-900 truncate">{set.name}</h3>
                        {set.course && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${courseBadgeColor(set.course)}`}>
                            {set.course}
                          </span>
                        )}
                        {set.is_public && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-medium flex items-center gap-1">
                            <Globe size={10} /> Shared
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        {set.organization && (
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {set.organization}
                          </span>
                        )}
                        {set.season && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} /> {set.season}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemove(sel.id)}
                      disabled={removing === sel.id}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove from team"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Expanded entries */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4 max-h-96 overflow-y-auto">
                      {expandedEntries.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No entries found.</p>
                      ) : (
                        <div className="space-y-4">
                          {Object.entries(groupEntriesByEvent(expandedEntries)).map(([event, entries]) => (
                            <div key={event}>
                              <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">{event}</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                                {entries.map((e) => (
                                  <div key={e.id} className="flex items-center justify-between text-sm bg-white px-3 py-1.5 rounded-lg">
                                    <span className="text-slate-600">
                                      {e.gender === 'M' ? 'Boys' : 'Girls'} {e.age_min === 0 ? `${e.age_max} & Under` : e.age_max >= 99 ? `${e.age_min} & Over` : `${e.age_min}-${e.age_max}`}
                                      {e.standard_name && <span className="text-slate-400 ml-1">({e.standard_name})</span>}
                                    </span>
                                    <span className="font-mono text-slate-900 font-medium">{e.time_string}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Info note */}
        <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <FileText size={18} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">How it works</p>
            <p className="text-blue-600">
              Custom standards appear alongside USA Swimming motivational times in each swimmer's standards ladder. Upload a PDF, CSV, or Excel file with your state's qualifying times, meet cuts, or any other time standards.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showUpload && (
        <TimeStandardsUpload
          onClose={() => setShowUpload(false)}
          onComplete={handleUploadComplete}
        />
      )}

      {showBrowser && (
        <TimeStandardsBrowser
          onClose={() => setShowBrowser(false)}
          onSelect={handleBrowseSelect}
        />
      )}
    </div>
  );
}
