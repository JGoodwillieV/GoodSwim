// src/ParentDashboard.jsx
// Parent Dashboard - Home view with Actions and Resources
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { useBadgeCount } from './hooks/useBadgeCount';
import ActionRequiredBanner from './ActionRequiredBanner';
import ActionCenter from './ActionCenter';
import {
  User, Clock, Trophy, TrendingUp, Camera, Calendar,
  ChevronRight, Star, Award, Zap, Target, Medal,
  Waves, Timer, ArrowUpRight, ArrowDownRight, Minus,
  Bell, ChevronDown, Filter, FolderOpen,
  FileText, Link, MapPin, Users, ExternalLink
} from 'lucide-react';

// Import centralized utilities
import { timeToSeconds, formatTime } from './utils/timeUtils';
import { normalizeEventName } from './utils/eventUtils';


// Helper to calculate age from DOB
const calculateAge = (dob) => {
  if (!dob) return null;
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

// Swimmer Card Component
function SwimmerCard({ swimmer, stats, onClick }) {
  const age = calculateAge(swimmer.date_of_birth) || swimmer.age;
  
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all text-left group"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold shrink-0">
          {swimmer.name?.charAt(0) || 'S'}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-slate-800 truncate">{swimmer.name}</h3>
            <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
          </div>
          <p className="text-slate-500 text-sm">
            {swimmer.group_name}
            {age && ` • ${age} years old`}
          </p>
          
          {/* Quick Stats */}
          <div className="flex gap-4 mt-3">
            {stats?.recentPB && (
              <div className="flex items-center gap-1 text-emerald-600 text-sm">
                <TrendingUp size={14} />
                <span className="font-medium">Recent PB!</span>
              </div>
            )}
            {stats?.totalSwims > 0 && (
              <div className="flex items-center gap-1 text-slate-500 text-sm">
                <Waves size={14} />
                <span>{stats.totalSwims} swims</span>
              </div>
            )}
            {stats?.standardsCount > 0 && (
              <div className="flex items-center gap-1 text-amber-600 text-sm">
                <Star size={14} />
                <span>{stats.standardsCount} cuts</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

// Recent Activity Item
function ActivityItem({ activity }) {
  const getIcon = () => {
    switch (activity.type) {
      case 'pb': return <Trophy className="text-amber-500" size={18} />;
      case 'video': return <Camera className="text-blue-500" size={18} />;
      case 'meet': return <Calendar className="text-indigo-500" size={18} />;
      case 'practice': return <Timer className="text-emerald-500" size={18} />;
      default: return <Zap className="text-slate-400" size={18} />;
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0 mt-0.5">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0">
        {/* Removed 'truncate' to allow full event name wrapping */}
        <p className="text-sm text-slate-800 font-medium leading-tight mb-0.5">
          {activity.title}
        </p>
        
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-xs text-slate-500">{activity.subtitle}</p>
          
          {/* Show Time Drop/Add if available */}
          {activity.diffLabel && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
              activity.isDrop 
                ? 'bg-emerald-100 text-emerald-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {activity.diffLabel}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-slate-400 shrink-0 whitespace-nowrap mt-0.5">
        {activity.time}
      </span>
    </div>
  );
}

// Calendar component is now imported from ParentCalendar.jsx

// Resources Placeholder Component
function ResourcesPlaceholder() {
  const sampleResources = [
    { type: 'link', title: 'Team Website', description: 'Official Hanover Aquatics site', icon: ExternalLink },
    { type: 'doc', title: 'Parent Handbook', description: 'Team policies & information', icon: FileText },
    { 
      type: 'link', 
      title: 'Spirit Wear Store', 
      description: 'Order team gear', 
      icon: ExternalLink,
      url: 'https://bsnteamsports.com/shop/VDYxM7x5yv' // Added URL here
    },
    { type: 'doc', title: 'Meet Day Guide', description: 'What to expect at meets', icon: FileText },
  ];

  return (
    <div className="space-y-4">
      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <FolderOpen size={24} />
          <h3 className="font-bold text-lg">Team Resources</h3>
        </div>
        <p className="text-emerald-100 text-sm">
          Resource library coming soon! Quick access to important links, documents, and information that doesn't change often.
        </p>
      </div>

      {/* Preview resources */}
      <div>
        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Links</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sampleResources.map((resource, index) => {
            const Icon = resource.icon;
            // Check if this resource has a URL
            const isClickable = !!resource.url;
            // Use 'a' tag if clickable, 'div' if not
            const Component = isClickable ? 'a' : 'div';

            return (
              <Component 
                key={index}
                href={resource.url}
                target={isClickable ? "_blank" : undefined}
                rel={isClickable ? "noopener noreferrer" : undefined}
                className={`bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 ${
                  isClickable 
                    ? 'hover:shadow-md hover:border-blue-300 transition-all cursor-pointer' 
                    : 'opacity-60'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isClickable ? 'bg-blue-50' : 'bg-slate-50'
                }`}>
                  <Icon size={18} className={isClickable ? 'text-blue-500' : 'text-slate-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold ${isClickable ? 'text-blue-700' : 'text-slate-800'}`}>
                    {resource.title}
                  </h4>
                  <p className="text-xs text-slate-500">{resource.description}</p>
                </div>
                {isClickable && <ExternalLink size={14} className="text-slate-300" />}
              </Component>
            );
          })}
        </div>
      </div>

      {/* What's Coming */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
        <h4 className="font-semibold text-slate-700 mb-2">What to expect:</h4>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            Important links (website, spirit wear, forms)
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Team documents & handbooks
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            Pool locations & directions
          </li>
          <li className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
            Contact information for coaches & staff
          </li>
        </ul>
      </div>
    </div>
  );
}

// Tab selector for dashboard sections
function DashboardTabs({ activeTab, onChange, actionCount }) {
  const tabs = [
    { id: 'actions', label: 'Actions', icon: Bell, badge: actionCount },
    { id: 'resources', label: 'Resources', icon: FolderOpen, badge: 0 }
  ];

  return (
    <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-medium text-sm transition-all ${
              isActive 
                ? 'bg-white text-slate-800 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// Main Parent Dashboard Component
export default function ParentDashboard({ user, onSelectSwimmer, simpleView = false }) {
  const [swimmers, setSwimmers] = useState([]);
  const [swimmerStats, setSwimmerStats] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [parentName, setParentName] = useState('');
  const [parentId, setParentId] = useState(null);
  const [activeTab, setActiveTab] = useState('actions');
  const [actionCount, setActionCount] = useState(0);
  
  // Badge count hook - clears badge when dashboard is viewed
  const { clearBadge } = useBadgeCount();

  useEffect(() => {
    console.log('[ParentDashboard] useEffect triggered, loading data...');
    
    // Load data with error handling
    loadParentData().catch(err => {
      console.error('[ParentDashboard] Fatal error in loadParentData:', err);
      setLoading(false);
    });
    
    loadActionCount().catch(err => {
      console.error('[ParentDashboard] Error in loadActionCount:', err);
    });
    
    // Clear badge when parent opens dashboard (if database is set up)
    if (clearBadge) {
      clearBadge().catch(err => {
        // Silently fail if badge tables don't exist yet
        console.log('[ParentDashboard] Badge count not available yet:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only depend on user, not clearBadge (which changes on every render)

  const loadActionCount = async () => {
    try {
      const { data } = await supabase
        .rpc('get_parent_pending_actions', { parent_user_uuid: user.id });
      setActionCount(data?.length || 0);
    } catch (error) {
      console.error('Error loading action count:', error);
    }
  };

const loadParentData = async () => {
    try {
      setLoading(true);
      console.log('[ParentDashboard] Loading parent data for user:', user.id);

      const { data: parentData, error: parentError } = await supabase
        .from('parents')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (parentError) {
        console.error('[ParentDashboard] Error loading parent data:', parentError);
        setLoading(false);
        return;
      }

      if (!parentData) {
        console.log('[ParentDashboard] No parent data found');
        setLoading(false);
        return;
      }

      console.log('[ParentDashboard] Parent data loaded:', parentData.account_name);

      setParentName(parentData.account_name);
      setParentId(parentData.id);

      const { data: swimmerLinks } = await supabase
        .from('swimmer_parents')
        .select(`
          swimmer_id,
          swimmers (
            id, name, group_name, age, gender
          )
        `)
        .eq('parent_id', parentData.id);

      if (swimmerLinks) {
        const swimmerList = swimmerLinks
          .map(link => link.swimmers)
          .filter(Boolean);
        setSwimmers(swimmerList);

        const stats = {};
        const activities = [];

        for (const swimmer of swimmerList) {
          // Fetch up to 100 recent results to find history/PBs
          const { data: times } = await supabase
            .from('results')
            .select('*')
            .eq('swimmer_id', swimmer.id)
            .order('date', { ascending: false })
            .order('id', { ascending: false }) // Secondary sort helps tie-break same day
            .limit(100);

          if (times && times.length > 0) {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const recentPB = times.some(t => 
              t.is_best_time && new Date(t.date) >= thirtyDaysAgo
            );

            const standardsCount = times.filter(t => t.time_standard).length;

            stats[swimmer.id] = {
              totalSwims: times.length,
              recentPB,
              standardsCount
            };

            // Process the 3 most recent swims for the activity feed
            times.slice(0, 3).forEach(time => {
              const currentNorm = normalizeEventName(time.event);
              const currentSec = timeToSeconds(time.time);

              // 1. Find ALL previous swims for this event (Prelims AND Finals)
              const previousSwims = times.filter(t => {
                if (t.id === time.id) return false; // Skip self
                
                // Must match normalized event (e.g. "50 Free" matches "50 Free (Prelims)")
                if (normalizeEventName(t.event) !== currentNorm) return false; 
                
                const d1 = new Date(time.date);
                const d2 = new Date(t.date);
                
                // Strictly older date
                if (d2 < d1) return true;
                
                // If same date, check for Prelim vs Final logic
                if (d2.getTime() === d1.getTime()) {
                   // If current is Final, we can compare against same-day Prelim
                   const isCurrentFinal = time.event.toLowerCase().includes('final');
                   const isCandidatePrelim = t.event.toLowerCase().includes('prelim');
                   if (isCurrentFinal && isCandidatePrelim) return true;
                   
                   // Fallback: assume lower ID means entered earlier
                   if (t.id < time.id) return true;
                }
                
                return false;
              });

              let diffLabel = null;
              let isDrop = false;

              // 2. Compare against the FASTEST previous time (PB comparison)
              if (currentSec && previousSwims.length > 0) {
                // Convert all previous valid times to seconds
                const prevSecondsList = previousSwims
                  .map(s => timeToSeconds(s.time))
                  .filter(s => s !== null);
                
                if (prevSecondsList.length > 0) {
                  // Find the Best Time (Minimum seconds)
                  const bestPrevSec = Math.min(...prevSecondsList);
                  
                  const diff = currentSec - bestPrevSec;
                  isDrop = diff < 0;
                  diffLabel = `${diff > 0 ? '+' : ''}${diff.toFixed(2)}s`;
                }
              }

              activities.push({
                type: time.is_best_time ? 'pb' : 'meet',
                title: time.is_best_time 
                  ? `${swimmer.name} - New PB!` 
                  : `${swimmer.name} - ${time.event}`,
                subtitle: `${time.time} at ${time.meet_name || 'Meet'}`,
                diffLabel, 
                isDrop,
                time: (() => {
                  const [year, month, day] = time.date.split('T')[0].split('-');
                  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  return dateObj.toLocaleDateString();
                })(),
                date: (() => {
                  const [year, month, day] = time.date.split('T')[0].split('-');
                  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                })()
              });
            });
          } else {
            stats[swimmer.id] = { totalSwims: 0, recentPB: false, standardsCount: 0 };
          }
        }

        setSwimmerStats(stats);
        activities.sort((a, b) => b.date - a.date);
        setRecentActivity(activities.slice(0, 5));
      }
    } catch (error) {
      console.error('[ParentDashboard] Error loading parent data:', error);
      // Show error to user instead of infinite spinner
      alert('Error loading dashboard. Please refresh the page. Error: ' + error.message);
    } finally {
      console.log('[ParentDashboard] Finished loading, setting loading=false');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Get unique group names from all swimmers
  const swimmerGroupIds = [...new Set(swimmers.map(s => s.group_name).filter(Boolean))];

  // ============================================
  // SIMPLE VIEW - Just swimmers and activity
  // Used when navigating to "My Swimmers" tab
  // ============================================
  if (simpleView) {
    return (
      <div className="space-y-6">
        {/* Swimmers List */}
        <div className="space-y-3">
          {swimmers.map(swimmer => (
            <SwimmerCard
              key={swimmer.id}
              swimmer={swimmer}
              stats={swimmerStats[swimmer.id]}
              onClick={() => onSelectSwimmer(swimmer)}
            />
          ))}
          {swimmers.length === 0 && (
            <div className="bg-slate-50 rounded-2xl p-8 text-center">
              <User size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500">No swimmers linked to your account yet.</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-bold text-slate-700 text-lg">Recent Activity</h3>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              {recentActivity.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================
  // FULL DASHBOARD VIEW - With tabs
  // Used for the "Home" view
  // ============================================
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-6 text-white relative overflow-hidden">
        {/* Floating Background Logo */}
          <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-20 pointer-events-none">
             <img src="/team-logo-white.png" className="h-48 w-auto" alt="" />
          </div>

          <div className="relative z-10">
          <h1 className="text-2xl font-bold mb-1">
            Welcome back{parentName ? `, ${parentName.split(',')[1]?.trim() || parentName}` : ''}!
          </h1>
          <p className="text-blue-100">
            {swimmers.length === 1 
              ? `Tracking ${swimmers[0].name}'s swimming journey`
              : `Tracking ${swimmers.length} swimmers`
            }
          </p>
        </div>
      </div>

{/* ACTION REQUIRED BANNER  */}
    <ActionRequiredBanner 
      userId={user.id}
      onActionClick={() => setActiveTab('actions')}
    />
      
      {/* Tab Navigation */}
      <DashboardTabs 
        activeTab={activeTab} 
        onChange={setActiveTab}
        actionCount={actionCount}
      />

      {/* Tab Content */}
      {activeTab === 'actions' && (
        <ActionCenter userId={user.id} parentId={parentId} />
      )}

      {activeTab === 'resources' && (
        <ResourcesPlaceholder />
      )}
    </div>
  );
}
