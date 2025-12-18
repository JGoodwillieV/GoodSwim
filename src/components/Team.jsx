// src/components/Team.jsx
// Team wrapper component with tabs: Roster, Groups, Records
// Roster is the default view, Groups are clickable to show individual group swimmers

import React, { useState } from 'react';
import { Users, Filter, Trophy } from 'lucide-react';
import Roster from './Roster';
import GroupsList from './GroupsList';
import RecordBoard from './RecordBoard';

const TABS = [
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'groups', label: 'Groups', icon: Filter },
  { id: 'records', label: 'Records', icon: Trophy },
];

export default function Team({ 
  swimmers, 
  setSwimmers, 
  setViewSwimmer, 
  navigateTo, 
  setRecordBreaks, 
  setShowRecordModal,
  onViewTrophyCase 
}) {
  const [activeTab, setActiveTab] = useState('roster');

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header with Tabs */}
      <div className="p-4 md:p-8 pb-0">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500">Manage your roster, groups, and team records</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-slate-900 shadow-sm border-t border-x border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'roster' && (
          <div className="overflow-y-auto h-full">
            <Roster 
              swimmers={swimmers}
              setSwimmers={setSwimmers}
              setViewSwimmer={setViewSwimmer}
              navigateTo={navigateTo}
              setRecordBreaks={setRecordBreaks}
              setShowRecordModal={setShowRecordModal}
              hideTitle={true}
            />
          </div>
        )}
        
        {activeTab === 'groups' && (
          <GroupsList 
            swimmers={swimmers}
            onViewGroup={(groupName) => {
              navigateTo('group-detail', { groupName });
            }}
          />
        )}
        
        {activeTab === 'records' && (
          <RecordBoard />
        )}
      </div>
    </div>
  );
}

