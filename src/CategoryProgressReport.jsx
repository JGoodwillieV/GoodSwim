// src/CategoryProgressReport.jsx
// Shows progress over time for each TRAINING GROUP (Cat 1, Cat 2, etc.)
// Tracks group improvement across the season using multiple metrics

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import { 
  ChevronLeft, TrendingDown, TrendingUp, Activity, Trophy, 
  Info, Users, ChevronDown, ChevronUp, Calendar, Award,
  Zap, Target, Star
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, AreaChart, Area } from 'recharts';
import { timeToSecondsForSort as timeToSeconds } from './utils/timeUtils';
import { parseEventName } from './utils/eventUtils';

// Color palette for training groups - distinct, professional colors
const GROUP_COLORS = [
  { color: '#3b82f6', bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-300' },
  { color: '#10b981', bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-300' },
  { color: '#f59e0b', bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-300' },
  { color: '#8b5cf6', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-300' },
  { color: '#ec4899', bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-300' },
  { color: '#06b6d4', bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-300' },
  { color: '#84cc16', bg: 'bg-lime-100', text: 'text-lime-600', border: 'border-lime-300' },
  { color: '#f43f5e', bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-300' },
];

// Format date for display
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Format time from seconds to MM:SS.ss
const formatTime = (seconds) => {
  if (!seconds || seconds <= 0) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return mins > 0 ? `${mins}:${secs.padStart(5, '0')}` : secs;
};

// Normalize event name for comparison (e.g., "50 Free" matches "50 Freestyle")
const normalizeEvent = (eventName) => {
  if (!eventName) return null;
  const { distance, stroke } = parseEventName(eventName);
  if (!distance || !stroke) return null;
  return `${distance} ${stroke}`.toLowerCase();
};

// Calculate season date range (Sept 1 to Aug 31)
const getSeasonDateRange = () => {
  const now = new Date();
  const currentMonth = now.getMonth();
  let seasonStart;
  
  if (currentMonth >= 8) { // Sept or later
    seasonStart = new Date(now.getFullYear(), 8, 1);
  } else {
    seasonStart = new Date(now.getFullYear() - 1, 8, 1);
  }
  
  return {
    start: seasonStart,
    end: now,
    seasonLabel: `${seasonStart.getFullYear()}-${seasonStart.getFullYear() + 1}`
  };
};

// =============================================
// PROGRESS CALCULATION ALGORITHM
// =============================================

/**
 * Age adjustment multiplier for time drops
 * Older swimmers get more credit for the same % drop since improvements are harder
 * 
 * Research-based typical improvement rates by age:
 * - Ages 8-10: 5-8% per season (baseline)
 * - Ages 11-12: 3-5% per season
 * - Ages 13-14: 2-4% per season
 * - Ages 15+: 0.5-2% per season
 */
const getAgeAdjustmentFactor = (avgAge) => {
  if (!avgAge || avgAge <= 10) return 1.0;   // Baseline - young kids naturally drop more
  if (avgAge <= 12) return 1.5;               // 11-12 year olds get 1.5x credit
  if (avgAge <= 14) return 2.0;               // 13-14 year olds get 2x credit
  return 3.0;                                  // 15+ get 3x credit for same % drop
};

/**
 * Calculate progress metrics for a group of swimmers
 * 
 * Algorithm Components (Age-Fair Weighting):
 * 1. Age-Adjusted % Time Drop (25%) - Older groups get multiplier credit
 * 2. Best Time Rate (50%) - Naturally age-neutral metric
 * 3. Trend Score (25%) - Is the group's pace improving over time?
 * 
 * Returns a composite "Progress Score" from 0-100
 */
const calculateGroupProgress = (groupResults, allHistoricalResults, avgGroupAge = null) => {
  if (!groupResults.length) {
    return {
      progressScore: 0,
      avgPercentDrop: 0,
      adjustedPercentDrop: 0,
      ageFactor: 1,
      bestTimeRate: 0,
      trendDirection: 'neutral',
      swimmerCount: 0,
      swimCount: 0,
      bestTimes: 0,
      avgAge: avgGroupAge || 0,
      weeklyData: []
    };
  }

  // Sort results by date
  const sorted = [...groupResults].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Get unique swimmers in this group
  const swimmerIds = [...new Set(sorted.map(r => r.swimmer_id))];
  
  // Divide season into thirds for baseline vs current comparison
  const dates = sorted.map(r => new Date(r.date).getTime());
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const seasonLength = maxDate - minDate;
  
  const baselineEnd = minDate + (seasonLength / 3);
  const currentStart = minDate + (2 * seasonLength / 3);
  
  // Calculate metrics per swimmer, then aggregate
  let totalPercentDrop = 0;
  let swimmersWithData = 0;
  let totalBestTimes = 0;
  let totalSwims = sorted.length;

  // Build historical best times per swimmer/event for BT detection
  const historicalBests = {};
  allHistoricalResults.forEach(r => {
    const key = `${r.swimmer_id}-${normalizeEvent(r.event)}`;
    const seconds = timeToSeconds(r.time);
    if (seconds && seconds < 999999) {
      if (!historicalBests[key] || seconds < historicalBests[key]) {
        historicalBests[key] = seconds;
      }
    }
  });

  // Running bests for BT calculation during the season
  const runningBests = { ...historicalBests };

  // Track swims and BTs
  sorted.forEach(r => {
    const key = `${r.swimmer_id}-${normalizeEvent(r.event)}`;
    const seconds = timeToSeconds(r.time);
    
    if (seconds && seconds < 999999) {
      if (!runningBests[key] || seconds < runningBests[key]) {
        totalBestTimes++;
        runningBests[key] = seconds;
      }
    }
  });

  // Calculate % time drop per swimmer across their events
  swimmerIds.forEach(swimmerId => {
    const swimmerResults = sorted.filter(r => r.swimmer_id === swimmerId);
    
    // Group by normalized event
    const eventGroups = {};
    swimmerResults.forEach(r => {
      const eventKey = normalizeEvent(r.event);
      if (!eventKey) return;
      
      const seconds = timeToSeconds(r.time);
      const dateMs = new Date(r.date).getTime();
      
      if (!eventGroups[eventKey]) eventGroups[eventKey] = [];
      eventGroups[eventKey].push({ seconds, dateMs, date: r.date });
    });

    // Calculate improvement for each event (baseline vs current)
    let swimmerDropSum = 0;
    let swimmerEventCount = 0;

    Object.values(eventGroups).forEach(swims => {
      if (swims.length < 2) return; // Need at least 2 swims to compare
      
      // Get baseline swims (first third of their data for this event)
      const baselineSwims = swims.filter(s => s.dateMs <= baselineEnd);
      const currentSwims = swims.filter(s => s.dateMs >= currentStart);
      
      // If not enough data in baseline/current, use first vs last swim
      let baselineTime, currentTime;
      
      if (baselineSwims.length > 0 && currentSwims.length > 0) {
        baselineTime = Math.min(...baselineSwims.map(s => s.seconds));
        currentTime = Math.min(...currentSwims.map(s => s.seconds));
      } else {
        // Fallback: compare first vs best recent
        const sortedSwims = [...swims].sort((a, b) => a.dateMs - b.dateMs);
        baselineTime = sortedSwims[0].seconds;
        currentTime = Math.min(...sortedSwims.slice(-3).map(s => s.seconds)); // Best of last 3
      }
      
      if (baselineTime && currentTime && baselineTime > 0) {
        const percentDrop = ((baselineTime - currentTime) / baselineTime) * 100;
        swimmerDropSum += percentDrop;
        swimmerEventCount++;
      }
    });

    if (swimmerEventCount > 0) {
      totalPercentDrop += swimmerDropSum / swimmerEventCount;
      swimmersWithData++;
    }
  });

  // Calculate aggregate metrics
  const avgPercentDrop = swimmersWithData > 0 ? totalPercentDrop / swimmersWithData : 0;
  const bestTimeRate = totalSwims > 0 ? (totalBestTimes / totalSwims) * 100 : 0;

  // Calculate weekly trend data for chart
  const weeklyData = calculateWeeklyTrend(sorted);
  
  // Determine trend direction from weekly data
  let trendDirection = 'neutral';
  if (weeklyData.length >= 2) {
    const firstHalf = weeklyData.slice(0, Math.floor(weeklyData.length / 2));
    const secondHalf = weeklyData.slice(Math.floor(weeklyData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, w) => sum + w.avgPace, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, w) => sum + w.avgPace, 0) / secondHalf.length;
    
    if (secondAvg < firstAvg * 0.98) trendDirection = 'improving';
    else if (secondAvg > firstAvg * 1.02) trendDirection = 'declining';
  }

  // Calculate composite Progress Score (0-100)
  // Age-Fair Weights: % Drop (25%), BT Rate (50%), Trend (25%)
  let progressScore = 0;
  
  // Get age adjustment factor (older groups get more credit for same % drop)
  const ageFactor = getAgeAdjustmentFactor(avgGroupAge);
  const adjustedPercentDrop = avgPercentDrop * ageFactor;
  
  // % Drop component (25 points max): Age-adjusted, 2.5% adjusted drop = 25 points
  const dropScore = Math.min(25, Math.max(0, adjustedPercentDrop * 10));
  
  // BT Rate component (50 points max): 25% BT rate = 50 points
  // This is the primary metric since it's naturally age-neutral
  const btScore = Math.min(50, Math.max(0, bestTimeRate * 2));
  
  // Trend component (25 points max): improving = 25, neutral = 12.5, declining = 0
  const trendScore = trendDirection === 'improving' ? 25 : (trendDirection === 'neutral' ? 12.5 : 0);
  
  progressScore = Math.round(dropScore + btScore + trendScore);

  return {
    progressScore,
    avgPercentDrop,
    adjustedPercentDrop,
    ageFactor,
    bestTimeRate,
    bestTimes: totalBestTimes,
    trendDirection,
    swimmerCount: swimmerIds.length,
    swimCount: totalSwims,
    avgAge: avgGroupAge || 0,
    weeklyData
  };
};

// Calculate weekly pace averages for trend chart
const calculateWeeklyTrend = (results) => {
  const weekBuckets = {};
  
  results.forEach(r => {
    const seconds = timeToSeconds(r.time);
    if (!seconds || seconds >= 999999) return;
    
    const { distance } = parseEventName(r.event);
    if (!distance) return;
    
    // Normalize to pace per 100
    const pace = (seconds / distance) * 100;
    
    const date = new Date(r.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weekBuckets[weekKey]) {
      weekBuckets[weekKey] = { paces: [], swims: 0, bts: 0 };
    }
    weekBuckets[weekKey].paces.push(pace);
    weekBuckets[weekKey].swims++;
  });

  return Object.entries(weekBuckets)
    .map(([weekKey, data]) => ({
      week: weekKey,
      weekLabel: formatDate(weekKey),
      avgPace: data.paces.reduce((a, b) => a + b, 0) / data.paces.length,
      swimCount: data.swims
    }))
    .sort((a, b) => new Date(a.week) - new Date(b.week));
};

// =============================================
// FULL REPORT COMPONENT
// =============================================

export function CategoryProgressReport({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [swimmers, setSwimmers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [timeRange, setTimeRange] = useState('season');
  const [historicalResults, setHistoricalResults] = useState([]);

  const seasonInfo = getSeasonDateRange();

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      let startDate = null;
      const now = new Date();
      
      switch (timeRange) {
        case '3months':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 3);
          break;
        case '6months':
          startDate = new Date(now);
          startDate.setMonth(startDate.getMonth() - 6);
          break;
        case 'year':
          startDate = new Date(now);
          startDate.setFullYear(startDate.getFullYear() - 1);
          break;
        default: // 'season'
          startDate = seasonInfo.start;
      }

      // Fetch swimmers with group info
      const { data: swimmerData } = await supabase
        .from('swimmers')
        .select('id, name, group_name, age, gender');

      if (swimmerData) {
        setSwimmers(swimmerData);
        const uniqueGroups = [...new Set(swimmerData.map(s => s.group_name).filter(Boolean))].sort();
        setGroups(uniqueGroups);
        if (selectedGroups.length === 0) {
          setSelectedGroups(uniqueGroups);
        }
      }

      // Fetch ALL results for the period with pagination (Supabase limits to 1000 per query)
      let allResults = [];
      let page = 0;
      let keepFetching = true;
      const startDateStr = startDate ? startDate.toISOString().split('T')[0] : null;

      while (keepFetching) {
        let query = supabase
          .from('results')
          .select('swimmer_id, event, time, date')
          .order('date', { ascending: true })
          .order('id', { ascending: true }) // Secondary sort for consistent pagination
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (startDateStr) {
          query = query.gte('date', startDateStr);
        }

        const { data: batch, error } = await query;
        
        if (error || !batch || batch.length === 0) {
          keepFetching = false;
        } else {
          allResults = [...allResults, ...batch];
          page++;
          // If we got less than 1000, we've reached the end
          if (batch.length < 1000) {
            keepFetching = false;
          }
        }
      }

      console.log(`[GroupProgress] Fetched ${allResults.length} results across ${page} pages`);
      setResults(allResults);

      // Fetch historical results (before this period) for BT comparison - with pagination
      if (startDate) {
        let allHistorical = [];
        let histPage = 0;
        let keepFetchingHist = true;

        while (keepFetchingHist) {
          const { data: batch, error } = await supabase
            .from('results')
            .select('swimmer_id, event, time, date')
            .lt('date', startDateStr)
            .order('id', { ascending: true })
            .range(histPage * 1000, (histPage + 1) * 1000 - 1);

          if (error || !batch || batch.length === 0) {
            keepFetchingHist = false;
          } else {
            allHistorical = [...allHistorical, ...batch];
            histPage++;
            if (batch.length < 1000) {
              keepFetchingHist = false;
            }
          }
        }

        console.log(`[GroupProgress] Fetched ${allHistorical.length} historical results`);
        setHistoricalResults(allHistorical);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Process data by training group
  const groupData = useMemo(() => {
    if (!results.length || !swimmers.length) return {};

    // Create swimmer lookup
    const swimmerMap = {};
    swimmers.forEach(s => {
      swimmerMap[s.id] = s;
    });

    // Group results by training group
    const groupResults = {};
    
    results.forEach(result => {
      const swimmer = swimmerMap[result.swimmer_id];
      if (!swimmer) return;
      
      const groupName = swimmer.group_name || 'Unassigned';
      
      if (!groupResults[groupName]) {
        groupResults[groupName] = [];
      }
      
      groupResults[groupName].push({
        ...result,
        swimmerName: swimmer.name,
        swimmerAge: swimmer.age,
        swimmerGender: swimmer.gender
      });
    });

    // Calculate progress for each group
    const processedGroups = {};
    
    Object.entries(groupResults).forEach(([groupName, gResults]) => {
      // Calculate average age of swimmers in this group
      const swimmerAges = {};
      gResults.forEach(r => {
        if (r.swimmerAge && r.swimmer_id) {
          swimmerAges[r.swimmer_id] = r.swimmerAge;
        }
      });
      const ages = Object.values(swimmerAges).filter(a => a > 0);
      const avgAge = ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : null;
      
      const progress = calculateGroupProgress(gResults, historicalResults, avgAge);
      
      // Get color for this group
      const groupIndex = groups.indexOf(groupName);
      const colorConfig = GROUP_COLORS[groupIndex % GROUP_COLORS.length];
      
      processedGroups[groupName] = {
        ...progress,
        groupName,
        results: gResults,
        colorConfig
      };
    });

    return processedGroups;
  }, [results, swimmers, groups, historicalResults]);

  // Prepare chart data - all groups on one chart
  const chartData = useMemo(() => {
    const allWeeks = new Set();
    
    // Collect all week keys
    Object.values(groupData).forEach(group => {
      group.weeklyData.forEach(w => allWeeks.add(w.week));
    });

    // Create combined data points
    return [...allWeeks].sort().map(week => {
      const point = { week, weekLabel: formatDate(week) };
      
      Object.entries(groupData).forEach(([groupName, data]) => {
        if (!selectedGroups.includes(groupName)) return;
        const weekData = data.weeklyData.find(w => w.week === week);
        if (weekData) {
          point[groupName] = weekData.avgPace;
          point[`${groupName}_count`] = weekData.swimCount;
        }
      });
      
      return point;
    });
  }, [groupData, selectedGroups]);

  // Sort groups by progress score
  const sortedGroups = useMemo(() => {
    return Object.values(groupData)
      .filter(g => g.swimCount > 0)
      .sort((a, b) => b.progressScore - a.progressScore);
  }, [groupData]);

  // Calculate actual data range from results
  const dataRange = useMemo(() => {
    if (!results.length) return null;
    const dates = results.map(r => new Date(r.date)).sort((a, b) => a - b);
    return {
      earliest: dates[0],
      latest: dates[dates.length - 1],
      earliestLabel: formatDate(dates[0].toISOString()),
      latestLabel: formatDate(dates[dates.length - 1].toISOString())
    };
  }, [results]);

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
        <div className="font-bold text-slate-700 mb-2">{label}</div>
        {payload.map((entry, idx) => {
          const count = entry.payload[`${entry.dataKey}_count`];
          
          return (
            <div key={idx} className="mb-1 flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="font-medium text-slate-700">{entry.dataKey}</span>
              <span className="text-slate-500">
                {entry.value?.toFixed(2)}s/100
              </span>
              {count && (
                <span className="text-xs text-slate-400">
                  ({count} swims)
                </span>
              )}
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
              <h1 className="text-xl font-bold text-slate-800">Group Progress Report</h1>
              <p className="text-sm text-slate-500">
                Track training group improvement over the {seasonInfo.seasonLabel} season
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium border border-slate-200 bg-white text-slate-700"
            >
              <option value="season">Current Season</option>
              <option value="3months">Last 3 Months</option>
              <option value="6months">Last 6 Months</option>
              <option value="year">Last Year</option>
            </select>
            
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Info size={14} />
              <span>Age-Fair Scoring: BT Rate (50%) + Age-Adjusted Drop (25%) + Trend (25%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-7xl mx-auto space-y-6">
        {/* Group Summary Cards - Ranked by Progress Score */}
        <div>
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            Group Rankings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedGroups.map((group, index) => {
              const isSelected = selectedGroups.includes(group.groupName);
              
              return (
                <button
                  key={group.groupName}
                  onClick={() => {
                    if (isSelected && selectedGroups.length > 1) {
                      setSelectedGroups(selectedGroups.filter(g => g !== group.groupName));
                    } else if (!isSelected) {
                      setSelectedGroups([...selectedGroups, group.groupName]);
                    }
                  }}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? `${group.colorConfig.bg} ${group.colorConfig.border} ${group.colorConfig.text}`
                      : 'bg-white border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Trophy size={18} className="text-amber-500" />}
                      {index === 1 && <Award size={18} className="text-slate-400" />}
                      {index === 2 && <Award size={18} className="text-amber-700" />}
                      <span className="font-bold text-lg">{group.groupName}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">{group.progressScore}</div>
                      <div className="text-xs opacity-75">Progress Score</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-white/50 rounded-lg p-2">
                      <div className="font-bold text-sm">
                        {group.avgPercentDrop > 0 ? '+' : ''}{group.avgPercentDrop.toFixed(1)}%
                        {group.ageFactor > 1 && (
                          <span className="text-[10px] opacity-60 ml-0.5">×{group.ageFactor}</span>
                        )}
                      </div>
                      <div className="opacity-75">Drop {group.ageFactor > 1 ? '(adj)' : ''}</div>
                    </div>
                    <div className="bg-white/50 rounded-lg p-2">
                      <div className="font-bold text-sm">{group.bestTimeRate.toFixed(0)}%</div>
                      <div className="opacity-75">BT Rate</div>
                    </div>
                    <div className="bg-white/50 rounded-lg p-2">
                      <div className="font-bold text-sm flex items-center justify-center gap-1">
                        {group.trendDirection === 'improving' && <TrendingDown size={12} />}
                        {group.trendDirection === 'declining' && <TrendingUp size={12} />}
                        {group.trendDirection === 'improving' ? '↓' : group.trendDirection === 'declining' ? '↑' : '→'}
                      </div>
                      <div className="opacity-75">Trend</div>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs opacity-75 flex items-center gap-3 flex-wrap">
                    {group.avgAge > 0 && (
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        ~{Math.round(group.avgAge)} yrs avg
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {group.swimmerCount} swimmers
                    </span>
                    <span className="flex items-center gap-1">
                      <Star size={12} />
                      {group.bestTimes} BTs
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Chart - All Groups Over Time */}
        {chartData.length > 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="mb-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-bold text-slate-800">Group Performance Over Time</h3>
                  <p className="text-sm text-slate-500">
                    Average pace per 100 yards • Lower is better • Weekly averages
                  </p>
                </div>
                {dataRange && (
                  <div className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg">
                    <span className="font-medium">Data range:</span> {dataRange.earliestLabel} – {dataRange.latestLabel}
                    <span className="text-slate-400 ml-2">({results.length} results)</span>
                  </div>
                )}
              </div>
            </div>
            
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="weekLabel" 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={{ stroke: '#cbd5e1' }}
                  label={{ 
                    value: 'Pace (sec/100)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fontSize: 12, fill: '#64748b' }
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {selectedGroups.map((groupName, idx) => {
                  const groupIndex = groups.indexOf(groupName);
                  const color = GROUP_COLORS[groupIndex % GROUP_COLORS.length].color;
                  
                  return (
                    <Line
                      key={groupName}
                      type="monotone"
                      dataKey={groupName}
                      stroke={color}
                      strokeWidth={2}
                      dot={{ r: 4, fill: color }}
                      activeDot={{ r: 6 }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <Trophy size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-600 mb-2">No Results Yet</h3>
            <p className="text-slate-400">
              Record meet results to see group progress over time
            </p>
          </div>
        )}

        {/* Detailed Breakdown by Group */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Target size={18} className="text-blue-500" />
            Detailed Group Breakdown
          </h3>
          
          {sortedGroups.map(group => {
            const isExpanded = expandedGroup === group.groupName;
            
            // Get top performers in this group by swim count
            const swimmerPerformance = {};
            group.results.forEach(r => {
              if (!swimmerPerformance[r.swimmerName]) {
                swimmerPerformance[r.swimmerName] = { swims: 0 };
              }
              swimmerPerformance[r.swimmerName].swims++;
            });

            const topSwimmers = Object.entries(swimmerPerformance)
              .map(([name, data]) => ({ name, ...data }))
              .sort((a, b) => b.swims - a.swims)
              .slice(0, 5);

            return (
              <div key={group.groupName} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setExpandedGroup(isExpanded ? null : group.groupName)}
                  className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white`}
                      style={{ backgroundColor: group.colorConfig.color }}
                    >
                      {group.groupName.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800">{group.groupName}</h4>
                      <p className="text-sm text-slate-500">
                        {group.swimmerCount} swimmers • {group.swimCount} swims • {group.bestTimes} best times
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className={`flex items-center gap-1 font-bold ${
                        group.avgPercentDrop > 0 ? 'text-emerald-600' : 'text-rose-500'
                      }`}>
                        {group.avgPercentDrop > 0 ? <TrendingDown size={16} /> : <TrendingUp size={16} />}
                        {Math.abs(group.avgPercentDrop).toFixed(2)}%
                      </div>
                      <div className="text-xs text-slate-500">avg improvement</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-indigo-600">{group.progressScore}</div>
                      <div className="text-xs text-slate-500">score</div>
                    </div>
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50">
                    {/* Group's mini trend chart */}
                    {group.weeklyData.length > 1 && (
                      <div className="mb-4 bg-white rounded-lg p-4">
                        <h5 className="text-sm font-medium text-slate-700 mb-3">{group.groupName} Trend</h5>
                        <ResponsiveContainer width="100%" height={150}>
                          <AreaChart data={group.weeklyData}>
                            <defs>
                              <linearGradient id={`gradient-${group.groupName}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={group.colorConfig.color} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={group.colorConfig.color} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="weekLabel" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip formatter={(value) => [`${value.toFixed(2)}s/100`, 'Avg Pace']} />
                            <Area 
                              type="monotone" 
                              dataKey="avgPace" 
                              stroke={group.colorConfig.color} 
                              fill={`url(#gradient-${group.groupName})`}
                              strokeWidth={2}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Top Performers */}
                    <div className="bg-white rounded-lg p-4">
                      <h5 className="text-sm font-medium text-slate-700 mb-3">Top Performers by Swim Count</h5>
                      <div className="space-y-2">
                        {topSwimmers.map((swimmer, idx) => (
                          <div key={swimmer.name} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                {idx + 1}
                              </span>
                              <span className="font-medium text-slate-800">{swimmer.name}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-slate-500">{swimmer.swims} swims</span>
                            </div>
                          </div>
                        ))}
                      </div>
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

// =============================================
// DASHBOARD WIDGET: Group Progress Preview
// =============================================

export function CategoryProgressWidget({ onViewFull }) {
  const [loading, setLoading] = useState(true);
  const [groupStats, setGroupStats] = useState([]);

  useEffect(() => {
    fetchWidgetData();
  }, []);

  const fetchWidgetData = async () => {
    try {
      setLoading(true);
      
      // Get season start date
      const now = new Date();
      const currentMonth = now.getMonth();
      let seasonStart;
      if (currentMonth >= 8) {
        seasonStart = new Date(now.getFullYear(), 8, 1);
      } else {
        seasonStart = new Date(now.getFullYear() - 1, 8, 1);
      }

      // Fetch swimmers with age for age-adjusted scoring
      const { data: swimmers } = await supabase
        .from('swimmers')
        .select('id, name, group_name, age');

      const seasonStartStr = seasonStart.toISOString().split('T')[0];

      // Fetch ALL this season's results with pagination
      let allResults = [];
      let page = 0;
      let keepFetching = true;

      while (keepFetching) {
        const { data: batch, error } = await supabase
          .from('results')
          .select('swimmer_id, event, time, date')
          .gte('date', seasonStartStr)
          .order('date', { ascending: true })
          .order('id', { ascending: true })
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (error || !batch || batch.length === 0) {
          keepFetching = false;
        } else {
          allResults = [...allResults, ...batch];
          page++;
          if (batch.length < 1000) keepFetching = false;
        }
      }

      // Fetch ALL historical results for BT comparison with pagination
      let allHistorical = [];
      let histPage = 0;
      let keepFetchingHist = true;

      while (keepFetchingHist) {
        const { data: batch, error } = await supabase
          .from('results')
          .select('swimmer_id, event, time, date')
          .lt('date', seasonStartStr)
          .order('id', { ascending: true })
          .range(histPage * 1000, (histPage + 1) * 1000 - 1);

        if (error || !batch || batch.length === 0) {
          keepFetchingHist = false;
        } else {
          allHistorical = [...allHistorical, ...batch];
          histPage++;
          if (batch.length < 1000) keepFetchingHist = false;
        }
      }

      const results = allResults;
      const historical = allHistorical;

      if (!swimmers || !results) {
        setGroupStats([]);
        return;
      }

      // Build swimmer lookup
      const swimmerMap = {};
      swimmers.forEach(s => swimmerMap[s.id] = s);

      // Group results by training group and calculate avg age per group
      const groupResults = {};
      const groupAges = {};
      const uniqueGroups = [...new Set(swimmers.map(s => s.group_name).filter(Boolean))].sort();

      // Pre-calculate average age per group
      uniqueGroups.forEach(groupName => {
        const groupSwimmers = swimmers.filter(s => s.group_name === groupName && s.age > 0);
        if (groupSwimmers.length > 0) {
          groupAges[groupName] = groupSwimmers.reduce((sum, s) => sum + s.age, 0) / groupSwimmers.length;
        }
      });

      results.forEach(result => {
        const swimmer = swimmerMap[result.swimmer_id];
        if (!swimmer || !swimmer.group_name) return;
        
        if (!groupResults[swimmer.group_name]) {
          groupResults[swimmer.group_name] = [];
        }
        groupResults[swimmer.group_name].push(result);
      });

      // Calculate progress for each group with age adjustment
      const stats = uniqueGroups.map((groupName, idx) => {
        const gResults = groupResults[groupName] || [];
        const avgAge = groupAges[groupName] || null;
        const progress = calculateGroupProgress(gResults, historical || [], avgAge);
        const colorConfig = GROUP_COLORS[idx % GROUP_COLORS.length];
        
        return {
          groupName,
          ...progress,
          colorConfig
        };
      }).filter(g => g.swimCount > 0)
        .sort((a, b) => b.progressScore - a.progressScore);

      setGroupStats(stats);
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

  const hasData = groupStats.length > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Group Progress</h3>
            <p className="text-xs text-slate-400">Age-fair progress ranking</p>
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
          <Trophy size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No group data yet</p>
          <p className="text-slate-400 text-sm mt-1">Record meet results to track group progress</p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {groupStats.slice(0, 5).map((group, idx) => (
            <div 
              key={group.groupName}
              className="flex items-center gap-3"
            >
              {/* Rank indicator */}
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                idx === 0 ? 'bg-amber-100 text-amber-700' :
                idx === 1 ? 'bg-slate-200 text-slate-600' :
                idx === 2 ? 'bg-amber-50 text-amber-600' :
                'bg-slate-100 text-slate-500'
              }`}>
                {idx + 1}
              </div>
              
              {/* Group color indicator */}
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: group.colorConfig.color }}
              />
              
              {/* Group name and stats */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-sm truncate">
                  {group.groupName}
                </div>
                <div className="text-xs text-slate-400">
                  {group.swimmerCount} swimmers{group.avgAge > 0 ? ` • ~${Math.round(group.avgAge)} yrs` : ''}
                </div>
              </div>
              
              {/* Progress metrics */}
              <div className="text-right">
                <div className={`text-sm font-bold flex items-center gap-1 justify-end ${
                  group.bestTimeRate > 15 ? 'text-emerald-600' : 'text-slate-500'
                }`}>
                  {group.bestTimeRate.toFixed(0)}% BT
                </div>
                <div className="text-xs text-slate-400">
                  Score: {group.progressScore}
                </div>
              </div>
            </div>
          ))}
          
          {groupStats.length > 5 && (
            <button
              onClick={onViewFull}
              className="w-full text-center text-sm text-slate-500 hover:text-cyan-600 py-2"
            >
              +{groupStats.length - 5} more groups
            </button>
          )}
        </div>
      )}
    </div>
  );
}
