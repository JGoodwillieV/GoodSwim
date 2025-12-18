// src/components/RecordsView.jsx
// Team records view

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trophy, Medal, Loader2, ChevronRight } from 'lucide-react';

export default function RecordsView({ swimmers, onViewTrophyCase }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('team_records')
        .select('*, swimmers(name)')
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8 space-y-4">
      {/* Trophy Case Link */}
      <button
        onClick={onViewTrophyCase}
        className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl p-5 flex items-center justify-between hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-200/50"
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Trophy size={24} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg">Trophy Case</h3>
            <p className="text-amber-100 text-sm">View all team records & achievements</p>
          </div>
        </div>
        <ChevronRight size={24} />
      </button>

      {/* Recent Records */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Recent Records</h3>
        </div>
        {records.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {records.map(record => (
              <div key={record.id} className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Medal size={20} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-800">{record.event_name}</h4>
                  <p className="text-sm text-slate-500">
                    {record.swimmers?.name || 'Unknown'} • {record.time}
                  </p>
                </div>
                <div className="text-xs text-slate-400">
                  {record.age_group} {record.gender}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-slate-500">
            <Trophy size={32} className="mx-auto mb-2 opacity-50" />
            <p>No records yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

