// src/TrophyCase.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Award, Lock, Star, Zap } from 'lucide-react';

// Import centralized utilities
import { timeToSecondsForSort } from './utils/timeUtils';
import { normalizeEventName } from './utils/eventUtils';

// Alias for backward compatibility
const timeToSeconds = timeToSecondsForSort;

// Badge Definitions (Colors & Labels) - Ordered from easiest to hardest
// Motivational standards first, then championship-level standards
const BADGES = [
  { key: 'B', label: 'B', color: 'bg-amber-700 border-amber-600 text-amber-100', title: 'Bronze Standard' },
  { key: 'BB', label: 'BB', color: 'bg-slate-400 border-slate-300 text-slate-50', title: 'Silver Standard' },
  { key: 'A', label: 'A', color: 'bg-yellow-500 border-yellow-400 text-yellow-50', title: 'Gold Standard' },
  { key: 'AA', label: 'AA', color: 'bg-blue-500 border-blue-400 text-blue-50', title: 'Platinum Standard' },
  { key: 'AAA', label: 'AAA', color: 'bg-purple-600 border-purple-500 text-purple-50', title: 'Diamond Standard' },
  { key: 'AAAA', label: 'AAAA', color: 'bg-rose-600 border-rose-500 text-rose-50', title: 'Elite Standard' },
  // VSI Age Group - for 14 & under swimmers
  { key: 'VSI AG', label: 'VSI AG', color: 'bg-teal-500 border-teal-400 text-teal-50', title: 'VSI Age Group', ageRestriction: '14U' },
  // Senior Championship Standards - for 15 & over swimmers
  { key: 'VSI SC', label: 'VSI SC', color: 'bg-cyan-600 border-cyan-500 text-cyan-50', title: 'VSI Senior Champs', ageRestriction: '15+' },
  { key: 'Sectionals', label: 'SECT', color: 'bg-indigo-600 border-indigo-500 text-indigo-50', title: 'Sectionals' },
  { key: 'NCSA JR', label: 'NCSA', color: 'bg-orange-500 border-orange-400 text-orange-50', title: 'NCSA Junior Nationals' },
  { key: 'Futures', label: 'FUT', color: 'bg-emerald-600 border-emerald-500 text-emerald-50', title: 'Futures Championship' },
  { key: 'Winter JR', label: 'W-JR', color: 'bg-sky-600 border-sky-500 text-sky-50', title: 'Winter Junior Nationals' },
  { key: 'US JR', label: 'US-JR', color: 'bg-violet-600 border-violet-500 text-violet-50', title: 'US Junior Nationals' },
  { key: 'Nationals', label: 'NAT', color: 'bg-gradient-to-br from-amber-400 to-amber-600 border-amber-300 text-amber-50', title: 'US Nationals' },
];

// Map of all standard keys for database query
const ALL_STANDARD_KEYS = BADGES.map(b => b.key);

export default function TrophyCase({ swimmerId, age, gender }) {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  // Filter badges based on swimmer's age
  const getVisibleBadges = () => {
    return BADGES.filter(badge => {
      // No age restriction - show to everyone
      if (!badge.ageRestriction) return true;
      
      // VSI AG - only show to 14 & under
      if (badge.ageRestriction === '14U') {
        return age <= 14;
      }
      
      // VSI SC and other senior standards - only show to 15 & over
      if (badge.ageRestriction === '15+') {
        return age >= 15;
      }
      
      return true;
    });
  };

  useEffect(() => {
    const calculateBadges = async () => {
      if (!swimmerId) return;

      // 1. Fetch ALL results for this swimmer
      const { data: results } = await supabase
        .from('results')
        .select('event, time')
        .eq('swimmer_id', swimmerId);

      // 2. Fetch ALL standards for this age/gender (including new championship standards)
      const { data: standards } = await supabase
        .from('time_standards')
        .select('*')
        .eq('gender', gender)
        .in('name', ALL_STANDARD_KEYS)
        .lte('age_min', age)
        .gte('age_max', age);

      if (!results || !standards) {
        setLoading(false);
        return;
      }

      // 3. Group Results by Event (Find best time per event)
      const bestTimes = {};
      results.forEach(r => {
        const normName = normalizeEventName(r.event).toLowerCase();
        const seconds = timeToSeconds(r.time);
        
        if (seconds > 0 && seconds < 999999) {
            if (!bestTimes[normName] || seconds < bestTimes[normName]) {
                bestTimes[normName] = seconds;
            }
        }
      });

      // 4. Calculate ALL Badges Earned per Event
      // Initialize counts for all badges
      const badgeCounts = {};
      ALL_STANDARD_KEYS.forEach(key => {
        badgeCounts[key] = 0;
      });

      // Iterate through every event the swimmer has swum
      Object.keys(bestTimes).forEach(swamEvent => {
        const time = bestTimes[swamEvent];
        
        // Find matching standards for this specific event
        const eventStds = standards
            .filter(s => s.event.toLowerCase() === swamEvent) 
            .sort((a, b) => b.time_seconds - a.time_seconds); // Slowest (easiest) first

        // Count ALL badges earned for this event (not just the highest)
        // If swimmer beats a time, they earn that badge AND all easier ones
        for (let std of eventStds) {
          if (time <= std.time_seconds) {
            if (badgeCounts[std.name] !== undefined) {
              badgeCounts[std.name]++;
            }
          }
        }
      });

      setCounts(badgeCounts);
      setLoading(false);
    };

    calculateBadges();
  }, [swimmerId, age, gender]);

  if (loading) return <div className="p-4 text-center text-slate-400 text-xs">Loading Trophies...</div>;

  const visibleBadges = getVisibleBadges();
  
  // Determine grid columns based on number of visible badges
  const gridCols = visibleBadges.length <= 6 ? 'grid-cols-3' : 
                   visibleBadges.length <= 9 ? 'grid-cols-3 sm:grid-cols-3' : 
                   'grid-cols-4 sm:grid-cols-4';

  return (
    <div className="bg-slate-900 p-5 rounded-2xl border border-slate-700 shadow-lg">
      <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
        <Award size={16} className="text-yellow-500" /> Trophy Case
      </h3>
      
      <div className={`grid ${gridCols} gap-3`}>
        {visibleBadges.map((badge) => {
          const count = counts[badge.key] || 0;
          const isUnlocked = count > 0;
          
          // Special styling for championship-level badges
          const isChampionshipLevel = ['VSI AG', 'VSI SC', 'Sectionals', 'NCSA', 'Futures', 'Winter JR', 'US JR', 'Nationals'].includes(badge.key);

          return (
            <div 
              key={badge.key} 
              className={`
                relative flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-500
                ${isUnlocked 
                  ? badge.color + ' scale-105 shadow-lg' 
                  : 'bg-slate-800 border-slate-700 opacity-40 grayscale'}
                ${isChampionshipLevel && isUnlocked ? 'ring-2 ring-white/20' : ''}
              `}
              title={isUnlocked ? `${count} Events achieved ${badge.title}` : `Achieve a ${badge.title} time to unlock`}
            >
              {/* Championship indicator */}
              {isChampionshipLevel && isUnlocked && (
                <div className="absolute -top-1 -right-1">
                  <Star size={12} className="text-white fill-white" />
                </div>
              )}
              
              {/* Badge Content */}
              <div className={`${badge.label.length > 4 ? 'text-sm' : 'text-xl'} font-black tracking-tighter`}>
                {badge.label}
              </div>
              <div className="text-[8px] font-medium uppercase mt-1 opacity-80 text-center leading-tight">
                {isUnlocked ? 'Unlocked' : badge.title.split(' ')[0]}
              </div>

              {/* Counter Badge (Bottom Right) */}
              {count > 0 && (
                <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-white text-slate-900 border-2 border-slate-900 rounded-full flex items-center justify-center text-xs font-bold shadow-sm z-10 animate-in zoom-in">
                  {count}
                </div>
              )}

              {/* Lock Icon if locked */}
              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 backdrop-blur-[1px] rounded-xl">
                  <Lock size={16} className="text-slate-500" />
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-[10px] text-slate-500">
          Badges awarded based on highest standard achieved per event.
          {age <= 14 && <span className="block mt-1 text-teal-400">Age Group standards available for 14 & Under</span>}
          {age >= 15 && <span className="block mt-1 text-cyan-400">Senior Championship standards available for 15 & Over</span>}
        </p>
      </div>
    </div>
  );
}
