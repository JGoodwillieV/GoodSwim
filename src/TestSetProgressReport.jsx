// src/TestSetProgressReport.jsx
// Shows progress over time for each stroke category (Free, Back, Breast, Fly, IM) - TEST SETS ONLY
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import { 
  ChevronLeft, TrendingDown, TrendingUp, Activity, Timer, 
  Info, Zap, ChevronDown, ChevronUp, Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { formatTimeMs } from './utils/timeUtils';

// Stroke display configuration
const STROKE_CONFIG = {
  free: { label: 'Freestyle', color: '#3b82f6', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
  back: { label: 'Backstroke', color: '#8b5cf6', bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
  breast: { label: 'Breaststroke', color: '#10b981', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600' },
  fly: { label: 'Butterfly', color: '#f59e0b', bgColor: 'bg-amber-100', textColor: 'text-amber-600' },
  IM: { label: 'Individual Medley', color: '#ec4899', bgColor: 'bg-pink-100', textColor: 'text-pink-600' }
};

const STROKE_ORDER = ['free', 'back', 'breast', 'fly', 'IM'];

// Format date for display
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
};

// Calculate average pace (time per 100 yards/meters) for comparison across distances
const calculatePacePer100 = (timeMs, distance) => {
  if (!timeMs || !distance || distance === 0) return null;
  // Calculate seconds per 100 yards
  const seconds = timeMs / 1000;
  return (seconds / distance) * 100;
};

// Full Test Set Progress Report Component
export function TestSetProgressReport({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [testSets, setTestSets] = useState([]);
  const [selectedStrokes, setSelectedStrokes] = useState(STROKE_ORDER);
  const [expandedStroke, setExpandedStroke] = useState(null);
  const [normalizeByDistance, setNormalizeByDistance] = useState(true);

  useEffect(() => {
    fetchCategoryData();
  }, []);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      
      // Fetch all test sets with results
      const { data: testSetsData, error } = await supabase
        .from('test_sets')
        .select(`
          id,
          name,
          stroke,
          distance,
          reps,
          created_at,
          test_set_results (
            id,
            time_ms,
            rep_number
          )
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filter to only include main competitive strokes
      const filteredSets = testSetsData?.filter(set => 
        STROKE_ORDER.includes(set.stroke)
      ) || [];

      setTestSets(filteredSets);
    } catch (err) {
      console.error('Error fetching category data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Process data for chart
  const chartData = useMemo(() => {
    if (!testSets.length) return [];

    // Group test sets by stroke
    const strokeGroups = {};
    
    testSets.forEach(set => {
      const stroke = set.stroke;
      if (!strokeGroups[stroke]) {
        strokeGroups[stroke] = [];
      }
      
      // Calculate average time for this test set
      const results = set.test_set_results || [];
      const validTimes = results.map(r => r.time_ms).filter(Boolean);
      
      if (validTimes.length > 0) {
        const avgTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
        
        // Use pace per 100 if normalizing, otherwise use raw average
        const value = normalizeByDistance 
          ? calculatePacePer100(avgTime, set.distance)
          : avgTime / 1000; // Convert to seconds
        
        strokeGroups[stroke].push({
          date: set.created_at,
          value,
          avgTime,
          distance: set.distance,
          name: set.name,
          reps: set.reps,
          count: validTimes.length
        });
      }
    });

    // Create timeline data combining all strokes
    const dateMap = {};
    
    Object.entries(strokeGroups).forEach(([stroke, sessions]) => {
      sessions.forEach(session => {
        const dateKey = formatDate(session.date);
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = { date: dateKey, timestamp: session.date };
        }
        dateMap[dateKey][stroke] = session.value;
        dateMap[dateKey][`${stroke}_data`] = session; // Store full data for tooltips
      });
    });

    // Convert to array and sort by date
    return Object.values(dateMap).sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  }, [testSets, normalizeByDistance]);

  // Calculate statistics for each stroke
  const strokeStats = useMemo(() => {
    const stats = {};
    
    STROKE_ORDER.forEach(stroke => {
      const strokeSets = testSets.filter(s => s.stroke === stroke);
      
      if (strokeSets.length === 0) {
        stats[stroke] = { count: 0, improvement: null, avgPace: null };
        return;
      }

      // Calculate average paces for all sets
      const paces = strokeSets.map(set => {
        const results = set.test_set_results || [];
        const validTimes = results.map(r => r.time_ms).filter(Boolean);
        if (validTimes.length === 0) return null;
        
        const avgTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
        return normalizeByDistance 
          ? calculatePacePer100(avgTime, set.distance)
          : avgTime / 1000;
      }).filter(Boolean);

      if (paces.length === 0) {
        stats[stroke] = { count: 0, improvement: null, avgPace: null };
        return;
      }

      const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
      
      // Calculate improvement (first session vs last session)
      const firstPace = paces[0];
      const lastPace = paces[paces.length - 1];
      const improvement = firstPace && lastPace ? ((firstPace - lastPace) / firstPace) * 100 : 0;
      
      stats[stroke] = {
        count: strokeSets.length,
        avgPace,
        improvement,
        firstPace,
        lastPace
      };
    });
    
    return stats;
  }, [testSets, normalizeByDistance]);

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <div className="font-bold text-slate-700 mb-2">{label}</div>
        {payload.map((entry, idx) => {
          const strokeData = entry.payload[`${entry.dataKey}_data`];
          if (!strokeData) return null;
          
          return (
            <div key={idx} className="mb-1">
              <div className="flex items-center gap-2 mb-0.5">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="font-medium text-slate-700">
                  {STROKE_CONFIG[entry.dataKey]?.label}
                </span>
              </div>
              <div className="ml-5 text-slate-600 space-y-0.5">
                <div className="font-mono text-sm">
                  {normalizeByDistance 
                    ? `${entry.value.toFixed(2)}s per 100` 
                    : `${entry.value.toFixed(2)}s avg`}
                </div>
                <div className="text-xs text-slate-500">
                  {strokeData.distance}yd × {strokeData.reps} • {strokeData.count} swimmers
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="h-96 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-4 mb-3">
            <button 
              onClick={onBack} 
              className="p-2 hover:bg-slate-100 rounded-full text-slate-500"
            >
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">Test Set Progress Report</h1>
              <p className="text-sm text-slate-500">Track practice test set improvement across stroke categories</p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setNormalizeByDistance(!normalizeByDistance)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                normalizeByDistance 
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' 
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Zap size={14} />
                {normalizeByDistance ? 'Pace per 100' : 'Raw Average'}
              </div>
            </button>
            
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Info size={14} />
              <span>
                {normalizeByDistance 
                  ? 'Normalized to compare different distances' 
                  : 'Shows actual average times'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STROKE_ORDER.map(stroke => {
            const config = STROKE_CONFIG[stroke];
            const stats = strokeStats[stroke];
            
            return (
              <button
                key={stroke}
                onClick={() => setExpandedStroke(expandedStroke === stroke ? null : stroke)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedStrokes.includes(stroke)
                    ? `${config.bgColor} border-current ${config.textColor}`
                    : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                <div className="text-xs font-medium mb-1">{config.label}</div>
                <div className="text-2xl font-bold mb-1">
                  {stats.count}
                </div>
                <div className="text-xs opacity-75">sessions</div>
                {stats.improvement !== null && stats.improvement !== 0 && (
                  <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${
                    stats.improvement > 0 ? 'text-emerald-600' : 'text-rose-500'
                  }`}>
                    {stats.improvement > 0 ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                    {Math.abs(stats.improvement).toFixed(1)}%
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Main Chart */}
        {chartData.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="mb-4">
              <h3 className="font-bold text-slate-800">Progress Over Time</h3>
              <p className="text-sm text-slate-500">
                Lower is better • {normalizeByDistance ? 'Pace per 100 yards' : 'Average time in seconds'}
              </p>
            </div>
            
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickLine={{ stroke: '#cbd5e1' }}
                  label={{ 
                    value: normalizeByDistance ? 'Pace (seconds per 100)' : 'Time (seconds)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: 12, fill: '#64748b' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => STROKE_CONFIG[value]?.label || value}
                />
                
                {STROKE_ORDER.map(stroke => (
                  selectedStrokes.includes(stroke) && (
                    <Line
                      key={stroke}
                      type="monotone"
                      dataKey={stroke}
                      stroke={STROKE_CONFIG[stroke].color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: STROKE_CONFIG[stroke].color }}
                      activeDot={{ r: 6 }}
                      name={stroke}
                      connectNulls
                    />
                  )
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Activity size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">No Test Set Data Yet</h3>
            <p className="text-slate-400">
              Record test sets to see category progress over time
            </p>
          </div>
        )}

        {/* Detailed Breakdown by Stroke */}
        <div className="space-y-3">
          {STROKE_ORDER.map(stroke => {
            const config = STROKE_CONFIG[stroke];
            const stats = strokeStats[stroke];
            const strokeSets = testSets.filter(s => s.stroke === stroke);
            const isExpanded = expandedStroke === stroke;

            if (stats.count === 0) return null;

            return (
              <div key={stroke} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpandedStroke(isExpanded ? null : stroke)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${config.bgColor} ${config.textColor} rounded-xl flex items-center justify-center font-bold`}>
                      {stroke.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800">{config.label}</h4>
                      <p className="text-sm text-slate-500">{stats.count} sessions recorded</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {stats.improvement !== null && stats.improvement !== 0 && (
                      <div className={`text-right ${
                        stats.improvement > 0 ? 'text-emerald-600' : 'text-rose-500'
                      }`}>
                        <div className="flex items-center gap-1 font-bold">
                          {stats.improvement > 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                          {Math.abs(stats.improvement).toFixed(1)}%
                        </div>
                        <div className="text-xs">improvement</div>
                      </div>
                    )}
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50">
                    <div className="space-y-2">
                      {strokeSets.map(set => {
                        const results = set.test_set_results || [];
                        const validTimes = results.map(r => r.time_ms).filter(Boolean);
                        if (validTimes.length === 0) return null;

                        const avgTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
                        const pace = calculatePacePer100(avgTime, set.distance);

                        return (
                          <div key={set.id} className="bg-white rounded-lg p-3 flex items-center justify-between">
                            <div>
                              <div className="font-medium text-slate-800">{set.name}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-3 mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar size={12} />
                                  {formatDate(set.created_at)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Timer size={12} />
                                  {set.distance}yd × {set.reps}
                                </span>
                                <span>{validTimes.length} swimmers</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-bold text-indigo-600">
                                {formatTimeMs(avgTime)}
                              </div>
                              {pace && (
                                <div className="text-xs text-slate-500">
                                  {pace.toFixed(2)}s / 100
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// DASHBOARD WIDGET: Test Set Progress Preview
// ==========================================
export function TestSetProgressWidget({ onViewFull }) {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [strokeStats, setStrokeStats] = useState({});

  useEffect(() => {
    fetchWidgetData();
  }, []);

  const fetchWidgetData = async () => {
    try {
      setLoading(true);
      
      // Fetch recent test sets (last 30 days) with results
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: testSetsData, error } = await supabase
        .from('test_sets')
        .select(`
          id,
          stroke,
          distance,
          created_at,
          test_set_results (
            time_ms
          )
        `)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Filter to main competitive strokes
      const filteredSets = testSetsData?.filter(set => 
        STROKE_ORDER.includes(set.stroke)
      ) || [];

      // Process for mini chart - just show trend for each stroke
      const strokeGroups = {};
      const stats = {};
      
      filteredSets.forEach(set => {
        const stroke = set.stroke;
        if (!strokeGroups[stroke]) {
          strokeGroups[stroke] = [];
        }
        
        const results = set.test_set_results || [];
        const validTimes = results.map(r => r.time_ms).filter(Boolean);
        
        if (validTimes.length > 0) {
          const avgTime = validTimes.reduce((a, b) => a + b, 0) / validTimes.length;
          const pace = calculatePacePer100(avgTime, set.distance);
          
          strokeGroups[stroke].push({
            date: set.created_at,
            pace
          });
        }
      });

      // Calculate stats for each stroke
      STROKE_ORDER.forEach(stroke => {
        const sessions = strokeGroups[stroke] || [];
        if (sessions.length > 0) {
          const paces = sessions.map(s => s.pace);
          const avgPace = paces.reduce((a, b) => a + b, 0) / paces.length;
          const firstPace = paces[0];
          const lastPace = paces[paces.length - 1];
          const improvement = ((firstPace - lastPace) / firstPace) * 100;
          
          stats[stroke] = {
            count: sessions.length,
            avgPace,
            improvement
          };
        }
      });

      // Create simplified chart data (last 5 data points for each stroke)
      const dateMap = {};
      Object.entries(strokeGroups).forEach(([stroke, sessions]) => {
        sessions.slice(-5).forEach(session => {
          const dateKey = formatDate(session.date);
          if (!dateMap[dateKey]) {
            dateMap[dateKey] = { date: dateKey, timestamp: session.date };
          }
          dateMap[dateKey][stroke] = session.pace;
        });
      });

      const chart = Object.values(dateMap).sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      setChartData(chart);
      setStrokeStats(stats);
    } catch (err) {
      console.error('Error fetching widget data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-32 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  const hasData = chartData.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Activity size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Test Set Progress</h3>
            <p className="text-xs text-slate-400">Practice performance trends</p>
          </div>
        </div>
        {hasData && (
          <button
            onClick={onViewFull}
            className="px-3 py-1.5 text-sm font-medium text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
          >
            View Report
          </button>
        )}
      </div>

      {/* Content */}
      {!hasData ? (
        <div className="p-8 text-center">
          <Activity size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No category data yet</p>
          <p className="text-slate-400 text-sm mt-1">Record test sets to track stroke progress</p>
        </div>
      ) : (
        <>
          {/* Mini Chart */}
          <div className="p-4">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData}>
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
                  label={{ 
                    value: 'Pace/100', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: 10, fill: '#94a3b8' }
                  }}
                />
                <Tooltip 
                  contentStyle={{ 
                    background: 'white', 
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                  formatter={(value) => [`${value.toFixed(2)}s`, '']}
                />
                
                {STROKE_ORDER.map(stroke => (
                  strokeStats[stroke] && (
                    <Line
                      key={stroke}
                      type="monotone"
                      dataKey={stroke}
                      stroke={STROKE_CONFIG[stroke].color}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  )
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Stats Summary */}
          <div className="px-4 pb-4 grid grid-cols-5 gap-2">
            {STROKE_ORDER.map(stroke => {
              const stats = strokeStats[stroke];
              if (!stats) return null;
              
              const config = STROKE_CONFIG[stroke];
              
              return (
                <div key={stroke} className="text-center">
                  <div className={`text-xs font-medium ${config.textColor} mb-1`}>
                    {config.label.split(' ')[0]}
                  </div>
                  {stats.improvement !== null && stats.improvement !== 0 && (
                    <div className={`text-xs font-bold flex items-center justify-center gap-0.5 ${
                      stats.improvement > 0 ? 'text-emerald-600' : 'text-rose-500'
                    }`}>
                      {stats.improvement > 0 ? <TrendingDown size={10} /> : <TrendingUp size={10} />}
                      {Math.abs(stats.improvement).toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

