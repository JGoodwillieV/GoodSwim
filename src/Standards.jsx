// src/Standards.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { Trophy, List } from 'lucide-react';
import StandardsModal from './StandardsModal';

export default function Standards({ eventName, bestTime, gender, age }) {
  const [standards, setStandards] = useState([]);
  const [nextCut, setNextCut] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchStandards = async () => {
      if (!eventName || !gender || !age) return;

      const parts = eventName.split(' ');
      const distance = parts[0];
      const stroke = parts[1] || ''; 

      // FIX 1: Explicitly ignore 25 yard events
      if (distance === '25') {
        setStandards([]);
        setNextCut(null);
        setCurrentLevel(null);
        return;
      }

      // 1. Fetch standards for this stroke/age/gender
      // We use a broader search here and filter strictly in JS below
      const { data } = await supabase
        .from('time_standards')
        .select('*')
        .eq('gender', gender)
        .ilike('event', `%${stroke}%`) // Match "Free", "Fly", "Breast"
        .lte('age_min', age)
        .gte('age_max', age)
        .order('time_seconds', { ascending: true }); // Fastest first

      if (data && data.length > 0) {
        // FIX 2: Strict Distance Filtering
        // Ensure "100" doesn't match "1000" and "50" doesn't match "500"
        // We check if the DB event starts with "DISTANCE " (e.g. "100 ")
        const strictMatches = data.filter(std => {
             const stdEvent = std.event.toLowerCase();
             // Check distance (Must start with "50 " or "100 ")
             const distMatch = stdEvent.startsWith(`${distance} `);
             // Check stroke (Double check fuzzy match)
             const strokeMatch = stdEvent.includes(stroke.toLowerCase()) || (stroke.toLowerCase() === 'fly' && stdEvent.includes('butter'));
             
             return distMatch && strokeMatch;
        });

        setStandards(strictMatches);
        calculateStanding(strictMatches, bestTime);
      }
    };
    fetchStandards();
  }, [eventName, bestTime, gender, age]);

  const calculateStanding = (stds, time) => {
    if (!time || time <= 0 || !stds.length) {
        setNextCut(null);
        setCurrentLevel(null);
        return;
    }
    
    let achieved = null;
    let chasing = null;

    // Loop from Hardest (Fastest) to Easiest
    for (let i = 0; i < stds.length; i++) {
      const std = stds[i];
      if (time <= std.time_seconds) {
        achieved = std;
        // Since the list is sorted fastest first, we stop at the highest level achieved.
        // The level *just before* this (index - 1) would be the next goal, but if we beat index 0, we are at the top.
        if (i > 0) chasing = stds[i-1]; 
        break; 
      } else {
        // If we are slower than this standard, it is a potential goal.
        // Since we are going form Hard -> Easy, the *last* one we fail to beat becomes the easiest goal we are chasing.
        // Actually, simpler logic: If we haven't achieved a cut yet, the current one is the goal.
        if (!achieved) chasing = std;
      }
    }
    
    // If we are slower than the slowest cut (index length-1), chasing remains the slowest cut.

    setCurrentLevel(achieved);
    setNextCut(chasing);
  };

  if (!nextCut && !currentLevel) return null;

  return (
    <>
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 mt-4 relative group">
        {/* Header Row */}
        <div className="flex justify-between items-start mb-3">
           <h4 className="text-slate-400 text-xs font-bold uppercase flex items-center gap-2">
             <Trophy size={14} className="text-yellow-500"/> Standards & Goals
           </h4>
           
           {/* Trigger Button */}
           <button 
             onClick={() => setIsModalOpen(true)}
             className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
           >
             <List size={14} /> View Ladder
           </button>
        </div>
        
        <div className="flex items-center justify-between">
          {/* LEFT: Current Level */}
          <div className="text-center w-1/4">
            <div className="text-xs text-slate-500 mb-1">Current Level</div>
            <div className="text-xl font-bold text-white">
              {currentLevel ? currentLevel.name : "Unranked"}
            </div>
          </div>

          {/* CENTER: Progress Bar */}
          <div className="flex-1 mx-4 flex flex-col items-center">
            {nextCut ? (
              <>
                <div className="text-xs font-bold text-blue-400 mb-1">
                  Drop { (bestTime - nextCut.time_seconds).toFixed(2) }s
                </div>
                <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden relative">
                   <div className="h-full bg-blue-500 w-1/2 rounded-full animate-pulse absolute left-0"></div>
                </div>
              </>
            ) : (
              <div className="text-xs font-bold text-emerald-400">Top Standard!</div>
            )}
          </div>

          {/* RIGHT: Next Goal */}
          <div className="text-center w-1/4">
            <div className="text-xs text-slate-500 mb-1">Next Goal</div>
            <div className="text-xl font-bold text-blue-400">
              {nextCut ? nextCut.name : "Max"}
            </div>
            <div className="text-xs text-slate-400">{nextCut?.time_string || "-"}</div>
          </div>
        </div>
      </div>

      {/* The Modal Popup */}
      <StandardsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        standards={standards}
        bestTime={bestTime}
        eventName={eventName}
        age={age}
        gender={gender}
      />
    </>
  );
}
