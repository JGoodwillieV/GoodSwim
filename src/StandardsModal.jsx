// src/StandardsModal.jsx
import React, { useEffect, useState } from 'react';
import { X, Trophy, Clock, Star, Tag } from 'lucide-react';
import { supabase } from './supabase';

export default function StandardsModal({ isOpen, onClose, standards, customStandards = [], bestTime, eventName, age, gender, course = 'SCY' }) {
  const [teamRecord, setTeamRecord] = useState(null);

  useEffect(() => {
    const fetchTeamRecord = async () => {
      if (!isOpen || !eventName || !age || !gender) return;

      let ageGroup;
      if (age <= 8) ageGroup = '8 & Under';
      else if (age <= 10) ageGroup = '9/10';
      else if (age <= 12) ageGroup = '11/12';
      else if (age <= 14) ageGroup = '13/14';
      else ageGroup = '15 & Over';

      const genderFull = gender === 'M' || gender === 'Male' ? 'Male' : 'Female';

      const { data, error } = await supabase
        .from('team_records')
        .select('*')
        .eq('event', eventName)
        .eq('age_group', ageGroup)
        .eq('gender', genderFull)
        .eq('course', course)
        .single();

      if (!error && data) {
        setTeamRecord(data);
      } else {
        setTeamRecord(null);
      }
    };

    fetchTeamRecord();
  }, [isOpen, eventName, age, gender, course]);

  if (!isOpen) return null;

  const secondsToTime = (val) => {
    if (!val) return "-";
    const mins = Math.floor(val / 60);
    const secs = (val % 60).toFixed(2);
    return mins > 0 ? `${mins}:${secs.padStart(5, '0')}` : secs;
  };

  const myTimeEntry = {
    id: 'my-time',
    name: 'Your Best Time',
    time_seconds: bestTime,
    time_string: secondsToTime(bestTime),
    isMe: true
  };

  const teamRecordEntry = teamRecord ? {
    id: 'team-record',
    name: `Team Record (${teamRecord.swimmer_name})`,
    time_seconds: teamRecord.time_seconds,
    time_string: teamRecord.time_display,
    isTeamRecord: true
  } : null;

  const customEntries = customStandards.map(cs => ({
    id: `custom-${cs.id}`,
    name: cs.standard_name || 'QT',
    setName: cs.time_standard_sets?.name || '',
    time_seconds: cs.time_seconds,
    time_string: cs.time_string,
    isCustom: true
  }));

  const itemsToMerge = [myTimeEntry, ...standards, ...customEntries];
  if (teamRecordEntry) itemsToMerge.push(teamRecordEntry);
  
  const combinedList = itemsToMerge.sort((a, b) => a.time_seconds - b.time_seconds);

  const hasCustom = customEntries.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Trophy size={18} className="text-yellow-500"/> Time Standards
            </h3>
            <p className="text-xs text-slate-400">{eventName} <span className="ml-1 px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">{course}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable List */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1">
          {combinedList.map((std, idx) => (
            <div 
              key={std.id || idx}
              className={`flex justify-between items-center p-3 rounded-lg text-sm ${
                std.isMe 
                  ? 'bg-blue-600 text-white font-bold shadow-lg ring-2 ring-blue-400 my-2 scale-105 origin-center z-10 relative' 
                  : std.isTeamRecord
                  ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white font-bold shadow-lg ring-2 ring-yellow-400 my-2 scale-105 origin-center z-10 relative'
                  : std.isCustom
                  ? 'bg-violet-900/40 text-violet-200 border border-violet-700/50'
                  : 'bg-slate-800/50 text-slate-300 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                   std.isMe 
                     ? 'bg-white text-blue-600' 
                     : std.isTeamRecord 
                     ? 'bg-white text-orange-600' 
                     : std.isCustom
                     ? 'bg-violet-700 text-violet-200'
                     : 'bg-slate-700 text-slate-500'
                }`}>
                   {std.isMe ? <Clock size={16} /> : std.isTeamRecord ? <Star size={16} /> : std.isCustom ? <Tag size={14} /> : idx + 1}
                </div>
                <div className="min-w-0">
                  <span className={`block truncate ${std.isTeamRecord ? 'flex items-center gap-2' : ''}`}>
                    {std.name}
                  </span>
                  {std.isCustom && std.setName && (
                    <span className="text-[10px] text-violet-400 truncate block">{std.setName}</span>
                  )}
                </div>
              </div>
              <span className="font-mono shrink-0 ml-2">{std.time_string}</span>
            </div>
          ))}
        </div>

        {/* Footer Legend */}
        <div className="p-3 bg-slate-800 border-t border-slate-700 text-center text-xs text-slate-500">
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <Star size={12} className="text-orange-500" /> = Team Record
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} className="text-blue-500" /> = Your Best
            </span>
            {hasCustom && (
              <span className="flex items-center gap-1">
                <Tag size={12} className="text-violet-400" /> = Custom
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
