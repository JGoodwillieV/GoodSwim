// src/TestSetDisplay.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import {
  Timer, TrendingUp, TrendingDown, ChevronRight, Calendar,
  Users, Zap, Target, ChevronDown, ChevronUp, BarChart3
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// Import centralized utilities
import { formatTimeMs } from './utils/timeUtils';
import { formatDateCompact } from './utils/dateUtils';

// Alias for backward compatibility
const formatTime = formatTimeMs;
const formatDate = (dateStr) => {
  // For timestamps, use Date directly (created_at is already a timestamp)
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: '2-digit'
  });
};

// ==========================================
// DASHBOARD: Recent Test Sets Overview
// ==========================================
export function RecentTestSets({ onViewAll, onStartNew }) {
  const [testSets, setTestSets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentSets = async () => {
      const { data, error } = await supabase
        .from('test_sets')
        .select(`
          *,
          test_set_results (
            swimmer_id,
            rep_number,
            time_ms,
            lane_number,
            lane_position,
            start_offset_ms,
            swimmers (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!error && data) {
        setTestSets(data);
      }
      setLoading(false);
    };

    fetchRecentSets();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-20 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Timer size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Practice Test Sets</h3>
            <p className="text-xs text-slate-400">Track practice performance</p>
          </div>
        </div>
        <button
          onClick={onStartNew}
          className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-sm flex items-center gap-2 shadow-md shadow-indigo-500/20"
        >
          <Zap size={16} />
          New Set
        </button>
      </div>

      {/* Content */}
      {testSets.length === 0 ? (
        <div className="p-8 text-center">
          <Timer size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No test sets recorded yet</p>
          <p className="text-slate-400 text-sm mt-1">Start a test set to track practice times</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {testSets.map(set => {
            // Calculate stats
            const results = set.test_set_results || [];
            const uniqueSwimmers = [...new Set(results.map(r => r.swimmer_id))].length;
            const allTimes = results.map(r => r.time_ms).filter(Boolean);
            const avgTime = allTimes.length > 0 
              ? allTimes.reduce((a, b) => a + b, 0) / allTimes.length 
              : null;
            const bestTime = allTimes.length > 0 ? Math.min(...allTimes) : null;

            return (
              <div key={set.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{set.name}</span>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                        {set.group_name}
                      </span>
                      {set.use_lanes && (
                        <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                          <Users size={10} />
                          Lanes
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(set.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {uniqueSwimmers} swimmers
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-mono font-bold text-indigo-600">
                      {formatTime(avgTime)}
                    </div>
                    <div className="text-xs text-slate-400">avg time</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {testSets.length > 0 && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={onViewAll}
            className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
          >
            View All Test Sets
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SWIMMER PROFILE: Practice Tab
// ==========================================
export function SwimmerPracticeTab({ swimmerId, swimmerName }) {
  const [testSets, setTestSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSet, setExpandedSet] = useState(null);

  useEffect(() => {
    const fetchSwimmerTestSets = async () => {
      // Get all test set results for this swimmer
      const { data: results, error } = await supabase
        .from('test_set_results')
        .select(`
          *,
          test_sets (
            *
          )
        `)
        .eq('swimmer_id', swimmerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching test sets:', error);
        setLoading(false);
        return;
      }

      if (results) {
        // Group by test set
        const setMap = {};
        results.forEach(r => {
          if (!r.test_sets) return;
          const setId = r.test_sets.id;
          if (!setMap[setId]) {
            setMap[setId] = {
              ...r.test_sets,
              results: []
            };
          }
          setMap[setId].results.push(r);
        });
        setTestSets(Object.values(setMap));
      }
      setLoading(false);
    };

    if (swimmerId) {
      fetchSwimmerTestSets();
    }
  }, [swimmerId]);

  // Group test sets by name to show progress over time
  const groupedSets = useMemo(() => {
    const groups = {};
    testSets.forEach(set => {
      const key = `${set.distance}-${set.stroke}-${set.type}`;
      if (!groups[key]) {
        groups[key] = {
          name: `${set.distance} ${set.stroke} ${set.type}`,
          sets: []
        };
      }
      
      // Calculate stats for this set
      const times = set.results.map(r => r.time_ms).filter(Boolean);
      const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
      const best = times.length > 0 ? Math.min(...times) : null;
      
      groups[key].sets.push({
        ...set,
        avg,
        best,
        repsCompleted: times.length
      });
    });
    
    // Sort sets within each group by date
    Object.values(groups).forEach(g => {
      g.sets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    });
    
    return groups;
  }, [testSets]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-40 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (testSets.length === 0) {
    return (
      <div className="p-8 text-center">
        <Timer size={48} className="mx-auto text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-600 mb-1">No Practice Data Yet</h3>
        <p className="text-slate-400">
          Test set results for {swimmerName} will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {Object.entries(groupedSets).map(([key, group]) => (
        <div key={key} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Group Header */}
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800">{group.name}</h4>
                <p className="text-xs text-slate-400">{group.sets.length} session{group.sets.length !== 1 ? 's' : ''} recorded</p>
              </div>
              {group.sets.length > 1 && (
                <div className="flex items-center gap-2">
                  {/* Trend indicator */}
                  {(() => {
                    const first = group.sets[0].avg;
                    const last = group.sets[group.sets.length - 1].avg;
                    if (!first || !last) return null;
                    const diff = last - first;
                    const improved = diff < 0;
                    return (
                      <div className={`flex items-center gap-1 text-sm font-bold ${
                        improved ? 'text-emerald-600' : 'text-rose-500'
                      }`}>
                        {improved ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                        {improved ? '' : '+'}{(diff / 1000).toFixed(2)}s
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Progress Chart (if multiple sessions) */}
          {group.sets.length > 1 && (
            <div className="p-4 bg-slate-50/50">
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={group.sets.map(s => ({
                  date: formatDate(s.created_at),
                  avg: s.avg ? s.avg / 1000 : null,
                  best: s.best ? s.best / 1000 : null
                }))}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    axisLine={false}
                    tickLine={false}
                    domain={['dataMin - 1', 'dataMax + 1']}
                    tickFormatter={(v) => `${v.toFixed(0)}s`}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value.toFixed(2)}s`]}
                    labelStyle={{ color: '#475569' }}
                    contentStyle={{ 
                      background: 'white', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avg" 
                    stroke="#6366f1" 
                    strokeWidth={2}
                    dot={{ fill: '#6366f1', r: 4 }}
                    name="Average"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="best" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={{ fill: '#10b981', r: 3 }}
                    name="Best"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Individual Sessions */}
          <div className="divide-y divide-slate-100">
            {group.sets.slice().reverse().map((set, idx) => (
              <div key={set.id}>
                <button
                  onClick={() => setExpandedSet(expandedSet === set.id ? null : set.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-slate-500">{formatDate(set.created_at)}</div>
                    <div className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                      {set.reps}x{set.distance}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-mono font-bold text-indigo-600">{formatTime(set.avg)}</div>
                      <div className="text-xs text-slate-400">avg</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-600">{formatTime(set.best)}</div>
                      <div className="text-xs text-slate-400">best</div>
                    </div>
                    {expandedSet === set.id ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedSet === set.id && (
                  <div className="px-4 pb-4 bg-slate-50">
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {set.results
                        .sort((a, b) => a.rep_number - b.rep_number)
                        .map((r, i) => {
                          const isBest = r.time_ms === set.best;
                          return (
                            <div 
                              key={i}
                              className={`text-center p-2 rounded-lg ${
                                isBest ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600'
                              }`}
                            >
                              <div className="text-[10px] text-slate-400 mb-0.5">R{r.rep_number}</div>
                              <div className="font-mono text-xs font-bold">
                                {formatTime(r.time_ms)}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==========================================
// FULL TEST SETS LIST PAGE
// ==========================================
export function TestSetsList({ onBack, onStartNew }) {
  const [testSets, setTestSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedSet, setExpandedSet] = useState(null);

  useEffect(() => {
    const fetchAllSets = async () => {
      const { data, error } = await supabase
        .from('test_sets')
        .select(`
          *,
          test_set_results (
            swimmer_id,
            rep_number,
            time_ms,
            lane_number,
            lane_position,
            start_offset_ms,
            swimmers (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTestSets(data);
      }
      setLoading(false);
    };

    fetchAllSets();
  }, []);

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-40 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <ChevronDown size={24} className="rotate-90" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">All Test Sets</h1>
              <p className="text-sm text-slate-500">{testSets.length} sets recorded</p>
            </div>
          </div>
          <button
            onClick={onStartNew}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl text-sm flex items-center gap-2"
          >
            <Zap size={16} />
            New Set
          </button>
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto space-y-4">
        {testSets.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <Timer size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-1">No Test Sets Yet</h3>
            <p className="text-slate-400 mb-4">Start tracking practice performance</p>
            <button
              onClick={onStartNew}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl"
            >
              Create First Test Set
            </button>
          </div>
        ) : (
          testSets.map(set => {
            const results = set.test_set_results || [];
            
            // Group results by swimmer
            const swimmerResults = {};
            results.forEach(r => {
              if (!swimmerResults[r.swimmer_id]) {
                swimmerResults[r.swimmer_id] = [];
              }
              swimmerResults[r.swimmer_id].push(r);
            });

            // Calculate swimmer averages
            const swimmerStats = Object.entries(swimmerResults).map(([id, reps]) => {
              const times = reps.map(r => r.time_ms).filter(Boolean);
              const avg = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null;
              const best = times.length > 0 ? Math.min(...times) : null;
              // Get swimmer name from the first result (all should have same swimmer)
              const swimmerName = reps.length > 0 && reps[0].swimmers ? reps[0].swimmers.name : 'Unknown';
              return { id, name: swimmerName, avg, best, reps: times.length };
            }).sort((a, b) => (a.avg || 999999) - (b.avg || 999999));

            const isExpanded = expandedSet === set.id;

            return (
              <div key={set.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Set Header */}
                <button
                  onClick={() => setExpandedSet(isExpanded ? null : set.id)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{set.name}</span>
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                        {set.group_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(set.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        {Object.keys(swimmerResults).length} swimmers
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 size={12} />
                        {set.reps} reps
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {swimmerStats.length > 0 && swimmerStats[0].avg && (
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-600">{formatTime(swimmerStats[0].best)}</div>
                        <div className="text-xs text-slate-400">fastest split</div>
                      </div>
                    )}
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded Results */}
                {isExpanded && (
                  <div className="border-t border-slate-100">
                    {/* Lane info header */}
                    {set.use_lanes && (
                      <div className="bg-cyan-50 px-4 py-2 border-b border-cyan-100 flex items-center gap-2">
                        <Users size={14} className="text-cyan-600" />
                        <span className="text-xs font-medium text-cyan-700">
                          Lane-based set • {set.lane_stagger_seconds}s stagger between swimmers
                        </span>
                      </div>
                    )}
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-slate-500">#</th>
                          <th className="text-left px-4 py-2 font-medium text-slate-500">Swimmer</th>
                          {set.use_lanes && <th className="text-center px-2 py-2 font-medium text-slate-500">Lane</th>}
                          <th className="text-center px-3 py-2 font-medium text-emerald-600">Avg</th>
                          <th className="text-center px-3 py-2 font-medium text-blue-600">Best</th>
                          <th className="text-center px-3 py-2 font-medium text-slate-500">Reps</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {swimmerStats.map((s, idx) => {
                          // Get lane info from first result
                          const swimmerResults = results.filter(r => r.swimmer_id === s.id);
                          const laneInfo = swimmerResults.length > 0 && swimmerResults[0].lane_number 
                            ? { lane: swimmerResults[0].lane_number, position: swimmerResults[0].lane_position }
                            : null;
                          
                          return (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="px-4 py-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  idx === 0 ? 'bg-amber-100 text-amber-700' :
                                  idx === 1 ? 'bg-slate-200 text-slate-600' :
                                  idx === 2 ? 'bg-orange-100 text-orange-700' :
                                  'bg-slate-100 text-slate-500'
                                }`}>
                                  {idx + 1}
                                </div>
                              </td>
                              <td className="px-4 py-2 font-medium text-slate-800">{s.name}</td>
                              {set.use_lanes && (
                                <td className="px-2 py-2 text-center">
                                  {laneInfo ? (
                                    <div className="inline-flex flex-col items-center gap-0.5">
                                      <span className="text-xs font-bold text-cyan-600">L{laneInfo.lane}</span>
                                      <span className="text-[10px] text-slate-400">#{laneInfo.position + 1}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              )}
                              <td className="px-3 py-2 text-center font-mono font-bold text-emerald-600">
                                {formatTime(s.avg)}
                              </td>
                              <td className="px-3 py-2 text-center font-mono text-blue-600">
                                {formatTime(s.best)}
                              </td>
                              <td className="px-3 py-2 text-center text-slate-500">
                                {s.reps}/{set.reps}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
