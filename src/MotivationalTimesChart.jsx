// src/MotivationalTimesChart.jsx - REDESIGNED
// Cleaner design: cells only show color when achieved, no border colors, reduced visual noise

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './supabase';
import { Timer, ChevronDown, ChevronUp, Target, TrendingUp } from 'lucide-react';

// Import centralized utilities
import { timeToSecondsForSort, secondsToTime } from './utils/timeUtils';
import { normalizeEventName } from './utils/eventUtils';

// Simplified standard columns - only fill colors for achieved states
const STANDARD_COLS = [
  { key: 'B', label: 'B', achievedBg: 'bg-amber-500', achievedText: 'text-white' },
  { key: 'BB', label: 'BB', achievedBg: 'bg-slate-500', achievedText: 'text-white' },
  { key: 'A', label: 'A', achievedBg: 'bg-yellow-500', achievedText: 'text-white' },
  { key: 'AA', label: 'AA', achievedBg: 'bg-blue-500', achievedText: 'text-white' },
  { key: 'AAA', label: 'AAA', achievedBg: 'bg-violet-500', achievedText: 'text-white' },
  { key: 'AAAA', label: 'AAAA', achievedBg: 'bg-rose-500', achievedText: 'text-white' },
];

// Alias for backward compatibility
const timeToSeconds = timeToSecondsForSort;
const normalizeEvent = normalizeEventName;

const formatEventDisplay = (evt) => {
  const parts = evt.split(' ');
  if (parts.length >= 2) {
    const dist = parts[0];
    let stroke = parts.slice(1).join(' ');
    stroke = stroke.charAt(0).toUpperCase() + stroke.slice(1);
    if (stroke.toLowerCase() === 'im') stroke = 'IM';
    return `${dist} ${stroke}`;
  }
  return evt;
};

// Sort events by distance first, then by stroke order
const STROKE_ORDER = ['freestyle', 'backstroke', 'breaststroke', 'butterfly', 'im'];

const getEventSortKey = (eventName) => {
  const parts = eventName.split(' ');
  const distance = parseInt(parts[0]) || 0;
  const stroke = parts.slice(1).join(' ').toLowerCase();
  const strokeIndex = STROKE_ORDER.indexOf(stroke);
  return { distance, strokeIndex: strokeIndex === -1 ? 999 : strokeIndex };
};

const compareEvents = (a, b) => {
  const aKey = getEventSortKey(a);
  const bKey = getEventSortKey(b);
  
  // First sort by stroke order
  if (aKey.strokeIndex !== bKey.strokeIndex) {
    return aKey.strokeIndex - bKey.strokeIndex;
  }
  // Then by distance within that stroke
  return aKey.distance - bKey.distance;
};

export default function MotivationalTimesChart({ swimmerId, age, gender }) {
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'event', direction: 'asc' });
  const [showAllEvents, setShowAllEvents] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!swimmerId || !age || !gender) return;

      const { data: results } = await supabase
        .from('results')
        .select('event, time, date')
        .eq('swimmer_id', swimmerId);

      const { data: standards } = await supabase
        .from('time_standards')
        .select('*')
        .eq('gender', gender)
        .in('name', ['B', 'BB', 'A', 'AA', 'AAA', 'AAAA'])
        .lte('age_min', age)
        .gte('age_max', age);

      if (!results || !standards) {
        setLoading(false);
        return;
      }

      // Group results by normalized event name - keeps best time across all swims
      const eventMap = {};
      results.forEach(r => {
        const norm = normalizeEvent(r.event);
        if (!norm) return;
        const seconds = timeToSeconds(r.time);
        if (seconds >= 999999) return;

        // Keep the best time across all swims (prelim, finals, etc.)
        if (!eventMap[norm] || seconds < eventMap[norm].pbSeconds) {
          eventMap[norm] = {
            event: norm,
            pb: r.time,
            pbSeconds: seconds,
            date: r.date,
            standards: {}
          };
        }
      });

      // Match standards to events
      Object.values(eventMap).forEach(evt => {
        const eventStds = standards.filter(s => normalizeEvent(s.event) === evt.event);
        
        let highestAchieved = null;
        let nextCut = null;
        let nextCutDiff = null;

        STANDARD_COLS.forEach(col => {
          const std = eventStds.find(s => s.name === col.key);
          if (std) {
            const achieved = evt.pbSeconds <= std.time_seconds;
            evt.standards[col.key] = {
              time: secondsToTime(std.time_seconds),
              seconds: std.time_seconds,
              achieved
            };
            
            if (achieved) {
              highestAchieved = col.key;
            } else if (!nextCut) {
              nextCut = col.key;
              nextCutDiff = evt.pbSeconds - std.time_seconds;
            }
          }
        });

        evt.highestAchieved = highestAchieved;
        evt.nextCut = nextCut;
        evt.nextCutDiff = nextCutDiff;
      });

      setEventData(Object.values(eventMap));
      setLoading(false);
    };

    fetchData();
  }, [swimmerId, age, gender]);

  const sortedData = useMemo(() => {
    const data = [...eventData];
    
    if (sortConfig.key === 'event') {
      data.sort((a, b) => {
        const comp = compareEvents(a.event, b.event);
        return sortConfig.direction === 'asc' ? comp : -comp;
      });
    } else if (sortConfig.key === 'pb') {
      data.sort((a, b) => {
        return sortConfig.direction === 'asc' 
          ? a.pbSeconds - b.pbSeconds 
          : b.pbSeconds - a.pbSeconds;
      });
    } else if (sortConfig.key === 'toNext') {
      data.sort((a, b) => {
        const aVal = a.nextCutDiff ?? 999;
        const bVal = b.nextCutDiff ?? 999;
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    
    return data;
  }, [eventData, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key !== columnKey) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const displayedData = showAllEvents ? sortedData : sortedData.slice(0, 5);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-3" />
        <p className="text-slate-500">Loading motivational times...</p>
      </div>
    );
  }

  if (eventData.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
        <Target size={40} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-600 font-medium">No event times recorded yet</p>
        <p className="text-slate-400 text-sm mt-1">Import meet results to see progress</p>
      </div>
    );
  }

  // Calculate summary stats
  const totalEvents = eventData.length;
  const qualifiedEvents = eventData.filter(e => e.highestAchieved).length;
  const closestCut = eventData
    .filter(e => e.nextCutDiff !== null)
    .sort((a, b) => a.nextCutDiff - b.nextCutDiff)[0];

  // Count achievements per level
  const achievementCounts = {};
  STANDARD_COLS.forEach(col => {
    achievementCounts[col.key] = eventData.filter(e => e.highestAchieved === col.key).length;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
              <Target size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-slate-800 font-semibold text-lg">Motivational Times</h3>
              <p className="text-slate-400 text-sm">Personal bests vs. time standards</p>
            </div>
          </div>
          
        </div>
      </div>

      {/* Achievement Pills - Only show if there are achievements */}
      {qualifiedEvents > 0 && (
        <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
          <span className="text-xs text-slate-400 mr-1">Achieved:</span>
          {STANDARD_COLS.map(col => {
            const count = achievementCounts[col.key];
            if (count === 0) return null;
            return (
              <span
                key={col.key}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${col.achievedBg} ${col.achievedText}`}
              >
                {col.label}: {count}
              </span>
            );
          })}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th 
                onClick={() => handleSort('event')}
                className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700"
              >
                Event<SortIcon columnKey="event" />
              </th>
              <th 
                onClick={() => handleSort('pb')}
                className="text-center px-3 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700"
              >
                PB<SortIcon columnKey="pb" />
              </th>
              {STANDARD_COLS.map(col => (
                <th 
                  key={col.key}
                  className="text-center px-2 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide"
                >
                  {col.label}
                </th>
              ))}
              <th 
                onClick={() => handleSort('toNext')}
                className="text-right px-5 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide cursor-pointer hover:text-slate-700"
              >
                To Next<SortIcon columnKey="toNext" />
              </th>
            </tr>
          </thead>
          <tbody>
            {displayedData.map((row, idx) => (
              <tr 
                key={row.event} 
                className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}
              >
                {/* Event Name */}
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-800">{formatEventDisplay(row.event)}</div>
                  <div className="text-xs text-slate-400">
                    {row.date ? (() => {
                      const [year, month, day] = row.date.split('T')[0].split('-');
                      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
                    })() : ''}
                  </div>
                </td>

                {/* Personal Best */}
                <td className="px-3 py-3 text-center">
                  <div className="inline-flex items-center gap-1.5 font-mono text-slate-800 font-semibold">
                    <Timer size={12} className="text-slate-400" />
                    {row.pb}
                  </div>
                </td>

                {/* Standard Columns - CLEAN DESIGN */}
                {STANDARD_COLS.map(col => {
                  const std = row.standards[col.key];
                  
                  // No standard for this event
                  if (!std) {
                    return (
                      <td key={col.key} className="px-2 py-3 text-center">
                        <span className="text-slate-300">—</span>
                      </td>
                    );
                  }

                  const isAchieved = std.achieved;
                  const isHighest = row.highestAchieved === col.key;
                  const isNext = row.nextCut === col.key;

                  return (
                    <td key={col.key} className="px-2 py-3 text-center">
                      <div 
                        className={`
                          inline-block min-w-[60px] px-2 py-1.5 rounded-md text-xs font-mono
                          ${isAchieved 
                            ? `${col.achievedBg} ${col.achievedText} font-semibold` 
                            : 'text-slate-400'
                          }
                        `}
                      >
                        {std.time}
                      </div>
                    </td>
                  );
                })}

                {/* Time to Next Cut */}
                <td className="px-5 py-3 text-right">
                  {row.nextCutDiff !== null ? (
                    <span className={`text-sm font-medium ${
                      row.nextCutDiff < 1 ? 'text-emerald-600' : 
                      row.nextCutDiff < 3 ? 'text-amber-600' : 
                      'text-slate-500'
                    }`}>
                      {row.nextCutDiff < 1 && <TrendingUp size={12} className="inline mr-1" />}
                      {row.nextCutDiff.toFixed(2)}s
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded">
                      ★ MAX
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show More / Less */}
      {sortedData.length > 5 && (
        <div className="p-4 border-t border-slate-100 text-center">
          <button
            onClick={() => setShowAllEvents(!showAllEvents)}
            className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-medium transition-colors"
          >
            {showAllEvents ? (
              <>
                <ChevronUp size={16} />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                Show All {sortedData.length} Events
              </>
            )}
          </button>
        </div>
      )}

      {/* Legend - Simplified */}
      <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-center gap-4">
        <span className="text-xs text-slate-400">Standards:</span>
        {STANDARD_COLS.map(col => (
          <div key={col.key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm ${col.achievedBg}`} />
            <span className="text-xs text-slate-500">{col.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
