// src/components/Dashboard.jsx
// Coach dashboard component
// Enhanced with schedule preview and improved quick actions (4.1)

import React, { useState, useEffect } from 'react';
import Icon from './Icon';
import { Timer, Calendar, Trophy, Waves, Heart, ChevronRight, Clock, MapPin, ArrowRight } from 'lucide-react';
import { RecentTestSets } from '../TestSetDisplay';
import { CategoryProgressWidget } from '../CategoryProgressReport';
import { supabase } from '../supabase';
import { formatDateSafe, formatTimeOfDay, parseDateSafe } from '../utils/dateUtils';

// Type colors for schedule items
const TYPE_COLORS = {
  meet: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: Trophy },
  practice: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: Waves },
  event: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', icon: Heart }
};

// Schedule Preview Card
function SchedulePreview({ items, onViewSchedule, onItemClick }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-6">
        <Calendar size={32} className="mx-auto text-slate-300 mb-2" />
        <p className="text-slate-500 text-sm">No upcoming events today</p>
        <button
          onClick={onViewSchedule}
          className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          View full schedule →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.slice(0, 3).map(item => {
        const colors = TYPE_COLORS[item.type];
        const Icon = colors.icon;
        
        return (
          <div
            key={`${item.type}-${item.id}`}
            onClick={() => onItemClick?.(item)}
            className={`${colors.bg} border-l-4 ${colors.border} rounded-lg p-3 cursor-pointer hover:shadow-sm transition-all`}
          >
            <div className="flex items-center gap-3">
              <Icon size={16} className={colors.text} />
              <div className="flex-1 min-w-0">
                <h4 className={`font-semibold ${colors.text} text-sm truncate`}>{item.title}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                  {item.time && (
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatTimeOfDay(item.time)}
                    </span>
                  )}
                  {item.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {item.location}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </div>
        );
      })}
      
      {items.length > 3 && (
        <button
          onClick={onViewSchedule}
          className="w-full text-center text-sm text-slate-500 hover:text-blue-600 py-2"
        >
          +{items.length - 3} more items
        </button>
      )}
    </div>
  );
}

export default function Dashboard({ navigateTo, swimmers, stats, onLogout, onInviteParent }) {
  const activeCount = swimmers ? swimmers.length : 0;
  const [todayItems, setTodayItems] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(true);

  // Fetch today's schedule items
  useEffect(() => {
    const fetchTodaySchedule = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const today = new Date().toISOString().split('T')[0];
        const items = [];

        // Fetch today's meets
        const { data: meets } = await supabase
          .from('meets')
          .select('*')
          .in('status', ['open', 'closed'])
          .lte('start_date', today)
          .gte('end_date', today);

        (meets || []).forEach(meet => {
          items.push({
            id: meet.id,
            type: 'meet',
            title: meet.name,
            time: null,
            location: meet.location_name,
            original: meet
          });
        });

        // Fetch today's practices
        const { data: practices } = await supabase
          .from('practices')
          .select('*')
          .eq('coach_id', user.id)
          .eq('scheduled_date', today);

        (practices || []).forEach(practice => {
          items.push({
            id: practice.id,
            type: 'practice',
            title: practice.title || 'Practice',
            time: practice.scheduled_time,
            location: null,
            original: practice
          });
        });

        // Fetch today's events
        const { data: events } = await supabase
          .from('team_events')
          .select('*')
          .eq('start_date', today);

        (events || []).forEach(event => {
          items.push({
            id: event.id,
            type: 'event',
            title: event.title,
            time: event.start_time,
            location: event.location_name,
            original: event
          });
        });

        // Remove duplicates based on type, title, and time
        const uniqueItems = items.filter((item, index, self) =>
          index === self.findIndex((i) => 
            i.type === item.type && 
            i.title === item.title && 
            i.time === item.time
          )
        );

        // Sort by time
        uniqueItems.sort((a, b) => {
          if (a.time && b.time) return a.time.localeCompare(b.time);
          if (a.time) return -1;
          if (b.time) return 1;
          return 0;
        });

        setTodayItems(uniqueItems);
      } catch (err) {
        console.error('Error fetching schedule:', err);
      } finally {
        setLoadingSchedule(false);
      }
    };

    fetchTodaySchedule();
  }, []);

  const handleScheduleItemClick = (item) => {
    navigateTo('schedule');
  };

  return (
    <div className="p-4 md:p-8 space-y-6 overflow-y-auto h-full pb-24 md:pb-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500 text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onLogout} className="md:hidden text-slate-400 p-2">
            <Icon name="log-out" size={20} />
          </button>
          <div className="w-9 h-9 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm shadow-sm">
            HC
          </div>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column - Stats & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-slate-500 text-xs font-medium mb-1">Team Efficiency</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800">84%</h3>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-slate-500 text-xs font-medium mb-1">Active Swimmers</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800">{activeCount}</h3>
            </div>
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-slate-500 text-xs font-medium mb-1">Videos Analyzed</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800">{stats?.analyses || 0}</h3>
            </div>
            
            {/* Photos Card */}
            <div 
              onClick={() => navigateTo('all-photos')}
              className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 md:p-5 rounded-2xl shadow-lg shadow-indigo-200/50 text-white relative overflow-hidden cursor-pointer hover:from-indigo-600 hover:to-indigo-700 transition-all group"
            >
              <div className="relative z-10">
                <p className="text-indigo-100 text-xs font-medium mb-1">Team Photos</p>
                <h3 className="text-2xl md:text-3xl font-bold">{stats?.photos || 0}</h3>
                <Icon name="camera" size={16} className="text-indigo-200 mt-1"/>
              </div>
              <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-indigo-400 rounded-full opacity-30 group-hover:scale-150 transition-transform duration-500"></div>
            </div>
          </div>
          
          {/* Quick Actions Grid */}
          <div>
            <h3 className="font-bold text-slate-800 mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button 
                onClick={() => navigateTo('schedule')} 
                className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 rounded-xl flex flex-col items-start gap-2 cursor-pointer hover:from-blue-600 hover:to-blue-700 transition-all text-white shadow-lg shadow-blue-200/50 group"
              >
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <Calendar size={18}/>
                </div>
                <div>
                  <div className="font-bold text-sm">Schedule</div>
                  <div className="text-blue-200 text-xs">View calendar</div>
                </div>
              </button>
              
              <button 
                onClick={() => navigateTo('test-set')} 
                className="bg-gradient-to-br from-amber-500 to-orange-500 p-4 rounded-xl flex flex-col items-start gap-2 cursor-pointer hover:from-amber-600 hover:to-orange-600 transition-all text-white shadow-lg shadow-amber-200/50 group"
              >
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <Timer size={18}/>
                </div>
                <div>
                  <div className="font-bold text-sm">Test Set</div>
                  <div className="text-amber-200 text-xs">Record times</div>
                </div>
              </button>
              
              <button 
                onClick={() => navigateTo('analysis')} 
                className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-start gap-2 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all group"
              >
                <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
                  <Icon name="video" size={18}/>
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">Video Analysis</div>
                  <div className="text-slate-500 text-xs">Analyze video</div>
                </div>
              </button>
              
              <button 
                onClick={() => navigateTo('reports')} 
                className="bg-white border border-slate-200 p-4 rounded-xl flex flex-col items-start gap-2 cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all group"
              >
                <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Icon name="bar-chart-2" size={18}/>
                </div>
                <div>
                  <div className="font-bold text-sm text-slate-800">Reports</div>
                  <div className="text-slate-500 text-xs">Team stats</div>
                </div>
              </button>
            </div>
          </div>

          {/* Category Progress Widget */}
          <CategoryProgressWidget 
            onViewFull={() => navigateTo('category-progress')}
          />

          {/* Recent Test Sets */}
          <RecentTestSets 
            onViewAll={() => navigateTo('test-sets-list')}
            onStartNew={() => navigateTo('test-set')}
          />
        </div>

        {/* Right Column - Today's Schedule & More Actions */}
        <div className="space-y-6">
          
          {/* Today's Schedule Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" />
                <h3 className="font-bold text-slate-800">Today's Schedule</h3>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                todayItems.length > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {todayItems.length} items
              </span>
            </div>
            <div className="p-4">
              {loadingSchedule ? (
                <div className="text-center py-6 text-slate-400">Loading...</div>
              ) : (
                <SchedulePreview 
                  items={todayItems}
                  onViewSchedule={() => navigateTo('schedule')}
                  onItemClick={handleScheduleItemClick}
                />
              )}
            </div>
            <div className="p-3 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => navigateTo('schedule')}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 py-1"
              >
                View Full Schedule
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* More Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">More Actions</h4>
            
            <button 
              onClick={() => navigateTo('roster')} 
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                <Icon name="users" size={18}/>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-800 text-sm">Manage Roster</div>
                <div className="text-slate-500 text-xs">{activeCount} swimmers</div>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
            
            <button 
              onClick={onInviteParent} 
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-9 h-9 bg-violet-100 text-violet-600 rounded-lg flex items-center justify-center">
                <Icon name="user-plus" size={18}/>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-800 text-sm">Invite Parents</div>
                <div className="text-slate-500 text-xs">Send portal invites</div>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>

            <button 
              onClick={() => navigateTo('meets')} 
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-9 h-9 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
                <Icon name="file-text" size={18}/>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-800 text-sm">Meets Manager</div>
                <div className="text-slate-500 text-xs">Entries & confirmations</div>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>

            <button 
              onClick={() => navigateTo('practice-hub')} 
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors text-left"
            >
              <div className="w-9 h-9 bg-sky-100 text-sky-600 rounded-lg flex items-center justify-center">
                <Waves size={18}/>
              </div>
              <div className="flex-1">
                <div className="font-medium text-slate-800 text-sm">Practice Builder</div>
                <div className="text-slate-500 text-xs">Create & edit practices</div>
              </div>
              <ChevronRight size={16} className="text-slate-300" />
            </button>
          </div>
          
          {/* AI Chat Card */}
          <div 
            onClick={() => navigateTo('ai-chat')} 
            className="bg-gradient-to-br from-violet-500 to-purple-600 p-5 rounded-2xl shadow-lg shadow-purple-200/50 text-white relative overflow-hidden cursor-pointer hover:from-violet-600 hover:to-purple-700 transition-all group"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Icon name="message-square" size={18} className="text-purple-200"/>
                <span className="text-purple-200 text-xs font-medium">AI Assistant</span>
              </div>
              <h3 className="text-xl font-bold">Ask Your Data</h3>
              <p className="text-xs text-purple-200 mt-1">Chat with your team database</p>
            </div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-purple-400 rounded-full opacity-30 group-hover:scale-150 transition-transform duration-500"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
