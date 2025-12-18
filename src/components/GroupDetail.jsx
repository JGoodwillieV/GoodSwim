// src/components/GroupDetail.jsx
// Shows swimmers in a specific group with card layout

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, UserPlus } from 'lucide-react';

export default function GroupDetail({ 
  groupName, 
  swimmers, 
  onBack, 
  onViewSwimmer, 
  onAddSwimmer 
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter swimmers by group and search query
  const groupSwimmers = swimmers
    .filter(s => (s.group_name || 'Unassigned') === groupName)
    .filter(s => 
      s.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-medium">Back to Groups</span>
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{groupName}</h1>
            <p className="text-slate-500">
              {groupSwimmers.length} {groupSwimmers.length === 1 ? 'swimmer' : 'swimmers'}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search swimmers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        {onAddSwimmer && (
          <button
            onClick={onAddSwimmer}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
          >
            <UserPlus size={18} />
            <span>Add Swimmer</span>
          </button>
        )}
      </div>

      {/* Swimmers Grid */}
      {groupSwimmers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groupSwimmers.map(swimmer => (
            <button
              key={swimmer.id}
              onClick={() => onViewSwimmer(swimmer)}
              className="bg-white border border-slate-200 rounded-xl p-4 text-left hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {swimmer.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 truncate">{swimmer.name}</h4>
                  <p className="text-xs text-slate-500">
                    {swimmer.age ? `${swimmer.age} yrs` : ''} {swimmer.gender ? `• ${swimmer.gender}` : ''}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <p className="text-slate-600 font-medium">No swimmers found</p>
          <p className="text-slate-500 text-sm mt-1">
            {searchQuery ? 'Try a different search term' : 'No swimmers assigned to this group yet'}
          </p>
        </div>
      )}
    </div>
  );
}

