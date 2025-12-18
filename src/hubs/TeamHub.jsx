// src/hubs/TeamHub.jsx
// Team Hub - Consolidated view for Roster, Groups, and Team Records
// Navigation restructure: combines team-related features into one section

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  Users, UserPlus, Award, Trophy, ChevronRight, Search, Filter,
  Medal, Star, TrendingUp, Clock, Loader2, Plus
} from 'lucide-react';

// Tab configuration
const TABS = [
  { id: 'roster', label: 'Roster', icon: Users, description: 'Manage swimmers' },
  { id: 'groups', label: 'Groups', icon: Filter, description: 'Training groups' },
  { id: 'records', label: 'Records', icon: Trophy, description: 'Team records' },
];

// Quick Stats Card
function StatCard({ icon: Icon, label, value, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-xl p-4 text-left hover:shadow-md hover:border-${color}-200 transition-all group`}
    >
      <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
        <Icon size={20} className={`text-${color}-600`} />
      </div>
      <div className="text-2xl font-bold text-slate-800">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </button>
  );
}

// Roster Tab Content
function RosterTab({ swimmers, onViewSwimmer, onAddSwimmer, searchQuery, setSearchQuery }) {
  const filteredSwimmers = swimmers.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.group_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedSwimmers = filteredSwimmers.reduce((acc, swimmer) => {
    const group = swimmer.group_name || 'Unassigned';
    if (!acc[group]) acc[group] = [];
    acc[group].push(swimmer);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
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
        <button
          onClick={onAddSwimmer}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <UserPlus size={18} />
          <span>Add Swimmer</span>
        </button>
      </div>

      {/* Grouped Swimmers */}
      {Object.keys(groupedSwimmers).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedSwimmers).sort().map(([group, groupSwimmers]) => (
            <div key={group}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-slate-700">{group}</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                  {groupSwimmers.length}
                </span>
              </div>
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
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Users size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">No swimmers found</p>
          <p className="text-slate-500 text-sm mt-1">
            {searchQuery ? 'Try a different search term' : 'Add your first swimmer to get started'}
          </p>
        </div>
      )}
    </div>
  );
}

// Groups Tab Content
function GroupsTab({ swimmers, groups, onManageGroup }) {
  const groupCounts = swimmers.reduce((acc, swimmer) => {
    const group = swimmer.group_name || 'Unassigned';
    acc[group] = (acc[group] || 0) + 1;
    return acc;
  }, {});

  const allGroups = [...new Set([...groups, ...Object.keys(groupCounts)])].sort();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {allGroups.map(group => (
          <div
            key={group}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Users size={24} className="text-white" />
              </div>
              <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                {groupCounts[group] || 0} swimmers
              </span>
            </div>
            <h3 className="font-bold text-slate-800 text-lg">{group}</h3>
            <p className="text-sm text-slate-500 mt-1">Training group</p>
          </div>
        ))}

        {/* Add New Group Card */}
        <button
          onClick={() => onManageGroup?.()}
          className="border-2 border-dashed border-slate-300 rounded-xl p-5 hover:border-blue-400 hover:bg-blue-50 transition-all text-center group"
        >
          <div className="w-12 h-12 bg-slate-100 group-hover:bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors">
            <Plus size={24} className="text-slate-400 group-hover:text-blue-600" />
          </div>
          <h3 className="font-bold text-slate-600 group-hover:text-blue-700">Add Group</h3>
          <p className="text-sm text-slate-400 mt-1">Create a new training group</p>
        </button>
      </div>
    </div>
  );
}

// Records Tab Content
function RecordsTab({ onViewTrophyCase }) {
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
        .limit(10);

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
    <div className="space-y-4">
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

// Main TeamHub Component
export default function TeamHub({ 
  swimmers = [], 
  onViewSwimmer, 
  onAddSwimmer,
  onViewTrophyCase,
  navigateTo 
}) {
  const [activeTab, setActiveTab] = useState('roster');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique groups
  const groups = [...new Set(swimmers.map(s => s.group_name).filter(Boolean))].sort();

  // Stats
  const stats = {
    totalSwimmers: swimmers.length,
    activeGroups: groups.length,
    maleSwimmers: swimmers.filter(s => s.gender === 'M' || s.gender === 'Male').length,
    femaleSwimmers: swimmers.filter(s => s.gender === 'F' || s.gender === 'Female').length,
  };

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Team</h1>
        <p className="text-slate-500">Manage your roster, groups, and team records</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard 
          icon={Users} 
          label="Total Swimmers" 
          value={stats.totalSwimmers}
          color="blue"
          onClick={() => setActiveTab('roster')}
        />
        <StatCard 
          icon={Filter} 
          label="Training Groups" 
          value={stats.activeGroups}
          color="emerald"
          onClick={() => setActiveTab('groups')}
        />
        <StatCard 
          icon={Trophy} 
          label="Team Records" 
          value="View"
          color="amber"
          onClick={() => setActiveTab('records')}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Active/Total" 
          value={`${stats.totalSwimmers}/${stats.totalSwimmers}`}
          color="violet"
          onClick={() => setActiveTab('roster')}
        />
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon size={18} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-50 rounded-2xl p-4 md:p-6">
        {activeTab === 'roster' && (
          <RosterTab 
            swimmers={swimmers}
            onViewSwimmer={onViewSwimmer}
            onAddSwimmer={onAddSwimmer}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
          />
        )}
        {activeTab === 'groups' && (
          <GroupsTab 
            swimmers={swimmers}
            groups={groups}
          />
        )}
        {activeTab === 'records' && (
          <RecordsTab 
            onViewTrophyCase={onViewTrophyCase}
          />
        )}
      </div>
    </div>
  );
}

