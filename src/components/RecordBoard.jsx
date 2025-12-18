// src/components/RecordBoard.jsx
// Team Records Board - organized by age group, event, and gender

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trophy, Loader2, Medal } from 'lucide-react';

// Age groups in order
const AGE_GROUPS = [
  '8 & Under',
  '9/10',
  '11/12',
  '13/14',
  '15 & Over'
];

// Events organized by distance and stroke
const EVENTS_ORDER = [
  // Sprint
  '25 Free', '25 Back', '25 Breast', '25 Fly',
  '50 Free', '50 Back', '50 Breast', '50 Fly',
  // Mid-distance
  '100 Free', '100 Back', '100 Breast', '100 Fly', '100 IM',
  '200 Free', '200 Back', '200 Breast', '200 Fly', '200 IM',
  // Distance
  '400 IM',
  '500 Free',
  '1000 Free',
  '1650 Free'
];

export default function RecordBoard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('8 & Under');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('team_records')
        .select('*')
        .order('event');

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get records for a specific event, age group, and gender
  const getRecord = (event, ageGroup, gender) => {
    return records.find(
      r => r.event === event && r.age_group === ageGroup && r.gender === gender
    );
  };

  // Get all events that exist in the selected age group
  const getEventsForAgeGroup = (ageGroup) => {
    const eventsInGroup = new Set(
      records
        .filter(r => r.age_group === ageGroup)
        .map(r => r.event)
    );
    
    // Return events in the defined order that exist in this age group
    return EVENTS_ORDER.filter(event => eventsInGroup.has(event));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  const eventsToShow = getEventsForAgeGroup(selectedAgeGroup);

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Trophy size={32} className="text-amber-500" />
          <h2 className="text-2xl font-bold text-slate-800">Team Record Board</h2>
        </div>
        <p className="text-slate-500">Current team records by age group and event</p>
      </div>

      {/* Age Group Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {AGE_GROUPS.map(ageGroup => (
          <button
            key={ageGroup}
            onClick={() => setSelectedAgeGroup(ageGroup)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              selectedAgeGroup === ageGroup
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {ageGroup}
          </button>
        ))}
      </div>

      {/* Record Board */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-pink-50 via-slate-50 to-blue-50 border-b border-slate-200">
          <div className="text-center font-bold text-pink-600">
            <div className="text-lg">♀ GIRLS</div>
            <div className="text-xs text-slate-500 mt-1">Name • Time • Date</div>
          </div>
          <div className="text-center font-bold text-slate-700">
            <div className="text-lg">EVENT</div>
            <div className="text-xs text-slate-500 mt-1">Distance & Stroke</div>
          </div>
          <div className="text-center font-bold text-blue-600">
            <div className="text-lg">BOYS ♂</div>
            <div className="text-xs text-slate-500 mt-1">Name • Time • Date</div>
          </div>
        </div>

        {/* Records */}
        <div className="divide-y divide-slate-100">
          {eventsToShow.length > 0 ? (
            eventsToShow.map(event => {
              const femaleRecord = getRecord(event, selectedAgeGroup, 'Female');
              const maleRecord = getRecord(event, selectedAgeGroup, 'Male');

              return (
                <div key={event} className="grid grid-cols-3 gap-4 p-4 hover:bg-slate-50 transition-colors">
                  {/* Female Record */}
                  <div className="text-center">
                    {femaleRecord ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800 text-sm">
                          {femaleRecord.swimmer_name}
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Medal size={14} className="text-pink-500" />
                          <span className="font-bold text-pink-600">
                            {femaleRecord.time_display}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(femaleRecord.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-300 text-sm">No record</div>
                    )}
                  </div>

                  {/* Event Name */}
                  <div className="flex items-center justify-center">
                    <div className="px-4 py-2 bg-slate-100 rounded-lg">
                      <div className="font-bold text-slate-800">{event}</div>
                    </div>
                  </div>

                  {/* Male Record */}
                  <div className="text-center">
                    {maleRecord ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800 text-sm">
                          {maleRecord.swimmer_name}
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Medal size={14} className="text-blue-500" />
                          <span className="font-bold text-blue-600">
                            {maleRecord.time_display}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(maleRecord.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric', 
                            year: 'numeric' 
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-300 text-sm">No record</div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <Trophy size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 font-medium">No records for this age group</p>
              <p className="text-slate-500 text-sm mt-1">Records will appear as they are set</p>
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center justify-center gap-8 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            <span>All times are Short Course Yards (SCY)</span>
          </div>
          <div className="flex items-center gap-2">
            <Medal size={16} className="text-slate-400" />
            <span>{records.length} total records</span>
          </div>
        </div>
      </div>
    </div>
  );
}

