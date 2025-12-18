// src/VersatilityChart.jsx
import React, { useEffect, useState } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip 
} from 'recharts';
import { supabase } from './supabase';
import { Activity } from 'lucide-react';

// Import centralized utilities
import { timeToSecondsForSort } from './utils/timeUtils';

// Alias for backward compatibility
const timeToSeconds = timeToSecondsForSort;

// Standard "Power Levels" for the chart
const STANDARD_SCORES = {
  'B': 20,
  'BB': 40,
  'A': 60,
  'AA': 80,
  'AAA': 100,
  'AAAA': 120,
  'VSI AG': 130,
  'VSI SC': 135,
  'Sectionals': 140,
  'NCSA JR': 145,
  'Futures': 150,
  'Winter JR': 160,
  'US JR': 170,
  'Nationals': 180
};

export default function VersatilityChart({ swimmerId, age, gender }) {
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Determine the "Representative Events" based on age tiers
  let strokeDist, imDist;
  if (age <= 8) {
      strokeDist = '25';
      imDist = '100'; // Some 8&Us swim 100 IM
  } else if (age <= 12) {
      strokeDist = '50';
      imDist = '100';
  } else {
      strokeDist = '100';
      imDist = '200';
  }

  const strokes = [
    // Freestyle is always 50 for 12&U, 100 for 13+
    { label: 'Free', dist: age <= 12 ? '50' : '100', type: 'Free' },
    { label: 'Back', dist: strokeDist, type: 'Back' },
    { label: 'Breast', dist: strokeDist, type: 'Breast' },
    { label: 'Fly', dist: strokeDist, type: 'Fly' }, 
    { label: 'IM', dist: imDist, type: 'IM' },
  ];

  useEffect(() => {
    const calculateStrengths = async () => {
      if (!swimmerId) return;

      // 1. Fetch ALL results for this swimmer
      const { data: myResults } = await supabase
        .from('results')
        .select('event, time')
        .eq('swimmer_id', swimmerId);

      // 2. Fetch ALL standards for this age/gender
      const { data: standards } = await supabase
        .from('time_standards')
        .select('*')
        .eq('gender', gender)
        .lte('age_min', age)
        .gte('age_max', age);

      if (!myResults || !standards) {
        setLoading(false);
        return;
      }

      // 3. Calculate Score for each Stroke
      const scores = strokes.map(stroke => {
        // A. Find swimmer's best time
        const matchingTimes = myResults
          .filter(r => {
            const e = r.event.toLowerCase();
            // Strict check: Event must START with distance + space
            const distMatch = e.startsWith(`${stroke.dist} `) || e.includes(` ${stroke.dist} `);
            const strokeMatch = e.includes(stroke.type.toLowerCase()) || (stroke.type === 'Fly' && e.includes('butter'));
            return distMatch && strokeMatch;
          })
          .map(r => timeToSeconds(r.time));
        
        const bestTime = matchingTimes.length > 0 ? Math.min(...matchingTimes) : null;

        if (!bestTime) {
            // Check if 8&U has a 50 Free to use as a fallback for IM slot
            if (age <= 8 && stroke.type === 'IM') {
                 // Fallback logic here if desired, but for now, just 0 it.
                 // A true 8&U chart might just be a 4-point diamond of 25s.
            }
            return { subject: stroke.label, score: 0, standard: 'N/A', fullMark: 180 };
        }

        // B. Find Highest Standard Achieved
        const eventStandards = standards
            .filter(s => {
                const e = s.event.toLowerCase();
                const strokeMatch = e.includes(stroke.type.toLowerCase()) || (stroke.type === 'Fly' && e.includes('butter'));
                const distMatch = s.event.startsWith(`${stroke.dist} `); 
                return strokeMatch && distMatch;
            })
            .sort((a, b) => a.time_seconds - b.time_seconds); // Fastest first

        let highestStd = 'Unranked';
        let score = 10; 

        for (let std of eventStandards) {
            if (bestTime <= std.time_seconds) {
                highestStd = std.name;
                score = STANDARD_SCORES[std.name] || 50;
                break; 
            }
        }

        return {
          subject: stroke.label,
          score: score,
          standard: highestStd,
          fullMark: 180, 
        };
      });

      setChartData(scores);
      setLoading(false);
    };

    calculateStrengths();
  }, [swimmerId, age, gender]);

  if (loading) return <div className="h-64 w-full flex items-center justify-center text-slate-500">Loading Chart...</div>;
  
  // Filter out 0 scores for the chart data itself so they don't plot at the center
  const plottedData = chartData.map(d => ({...d, score: d.score === 0 ? 5 : d.score})); // Use a small base for missing data

  if (chartData.every(d => d.score === 0)) {
      return (
        <div className="h-64 w-full bg-slate-900 rounded-xl border border-slate-700 p-4 flex flex-col items-center justify-center text-slate-500 text-sm">
            <Activity size={24} className="mb-2 opacity-50"/>
            <p>Not enough data for chart.</p>
            <p className="text-xs">Need representative stroke times.</p>
        </div>
      );
  }

  return (
    <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 shadow-lg">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
            <Activity size={14} className="text-blue-400"/> Stroke Strengths
        </h4>
      </div>
      
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={plottedData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
            <PolarRadiusAxis angle={30} domain={[0, 180]} tick={false} axisLine={false} />
            <Radar
              name="Strength"
              dataKey="score"
              stroke="#3b82f6"
              strokeWidth={3}
              fill="#3b82f6"
              fillOpacity={0.5}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
              itemStyle={{ color: '#60a5fa' }}
              formatter={(value, name, props) => [props.payload.standard, "Level"]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center mt-1">
          <span className="text-[10px] text-slate-500 bg-slate-800/50 px-2 py-1 rounded-full">
              Based on Highest Cut Achieved
          </span>
      </div>
    </div>
  );
}
