// src/components/GroupsList.jsx
// Groups list view - shows all training groups
// Clicking a group navigates to see swimmers in that group

import React from 'react';
import { Users, Plus, ChevronRight } from 'lucide-react';

export default function GroupsList({ swimmers, onViewGroup }) {
  // Count swimmers per group
  const groupCounts = swimmers.reduce((acc, swimmer) => {
    const group = swimmer.group_name || 'Unassigned';
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {});

  const groups = Object.keys(groupCounts).sort();

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => (
          <button
            key={group}
            onClick={() => onViewGroup(group)}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-300 transition-all text-left group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                  {groupCounts[group]} {groupCounts[group] === 1 ? 'swimmer' : 'swimmers'}
                </span>
                <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
            <h3 className="font-bold text-slate-800 text-lg">{group}</h3>
            <p className="text-sm text-slate-500 mt-1">Click to view swimmers</p>
          </button>
        ))}

        {groups.length === 0 && (
          <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl">
            <Users size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">No groups found</p>
            <p className="text-slate-500 text-sm mt-1">Assign swimmers to groups in the roster</p>
          </div>
        )}
      </div>
    </div>
  );
}

