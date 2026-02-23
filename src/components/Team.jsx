// src/components/Team.jsx
// Team wrapper component with tabs: Roster, Groups, Records
// Roster is the default view, Groups are clickable to show individual group swimmers

import React, { useState } from 'react';
import { Users, Filter, Trophy, Clock } from 'lucide-react';
import Roster from './Roster';
import GroupsList from './GroupsList';
import RecordBoard from './RecordBoard';
import TimeStandardsTab from './TimeStandardsTab';
import { UsageLimitBanner, useFeatureGate } from './gates';
import { useSubscription } from '../hooks/useSubscription';

const TABS = [
  { id: 'roster', label: 'Roster', icon: Users },
  { id: 'groups', label: 'Groups', icon: Filter },
  { id: 'records', label: 'Records', icon: Trophy },
  { id: 'time-standards', label: 'Time Standards', icon: Clock },
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
  const { swimmerCount, isTrial } = useSubscription();
  const recordsAccess = useFeatureGate('team_records');
  const standardsAccess = useFeatureGate('time_standards');

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header with Tabs */}
      <div className="p-4 md:p-8 pb-0">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Team</h1>
          <p className="text-slate-500">Manage your roster, groups, records, and time standards</p>
        </div>

        {/* Swimmer limit banner for trial users */}
        {isTrial && (
          <div className="mb-4">
            <UsageLimitBanner 
              limitKey="max_swimmers"
              currentUsage={swimmerCount}
              showWhenUnderLimit={true}
            />
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isLocked = (tab.id === 'records' && !recordsAccess.isUnlocked) ||
                              (tab.id === 'time-standards' && !standardsAccess.isUnlocked);
            
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
                {isLocked && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-medium">PRO</span>
                )}
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
          recordsAccess.isUnlocked ? (
            <RecordBoard />
          ) : (
            <div className="p-6">
              <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Trophy size={28} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Team Records</h3>
                <p className="text-slate-500 mb-6">
                  Track and display team records, celebrate record breakers, and view historical data.
                </p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'billing' }))}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )
        )}

        {activeTab === 'time-standards' && (
          standardsAccess.isUnlocked ? (
            <TimeStandardsTab />
          ) : (
            <div className="p-6">
              <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock size={28} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Time Standards</h3>
                <p className="text-slate-500 mb-6">
                  Upload and manage custom time standards, meet cuts, and qualifying times for your team.
                </p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'billing' }))}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  Upgrade to Starter
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

