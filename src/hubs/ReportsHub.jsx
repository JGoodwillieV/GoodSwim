// src/hubs/ReportsHub.jsx
// Reports Hub - All reports and progress tracking
// Updated to show all report types from existing Reports.jsx

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import {
  FileText, TrendingUp, BarChart3, ChevronRight, Calendar,
  Trophy, Users, Clock, Loader2, Award, Target, Layers, 
  Timer, Medal, Activity
} from 'lucide-react';

// Tab configuration - simplified to 2 tabs
const TABS = [
  { id: 'reports', label: 'Reports', icon: FileText, description: 'All report types' },
  { id: 'progress', label: 'Progress', icon: BarChart3, description: 'Swimmer trends' },
];

// Report card configuration matching the screenshot
const REPORT_CARDS = [
  {
    id: 'meet-report',
    title: 'Meet Report',
    description: 'Generate comprehensive post-meet reports with stats & charts.',
    icon: FileText,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    featured: true
  },
  {
    id: 'qualifiers',
    title: 'Qualifiers List',
    description: 'See who made the cut for Champs, Sectionals, etc.',
    icon: Award,
    color: 'blue'
  },
  {
    id: 'relay-generator',
    title: 'Relay Generator',
    description: 'Auto-build optimal A, B, and C relays.',
    icon: Layers,
    color: 'purple'
  },
  {
    id: 'big-movers',
    title: 'Big Movers',
    description: 'Leaderboard of total time dropped this season.',
    icon: TrendingUp,
    color: 'emerald'
  },
  {
    id: 'close-calls',
    title: 'Close Calls',
    description: 'Swimmers within striking distance of a time standard.',
    icon: Target,
    color: 'orange'
  },
  {
    id: 'team-funnel',
    title: 'Team Funnel',
    description: 'Visualize team progression through time standards.',
    icon: Activity,
    color: 'cyan'
  },
  {
    id: 'team-records',
    title: 'Team Records',
    description: 'Analyze team record breaks and history.',
    icon: Medal,
    color: 'amber'
  },
  {
    id: 'top-times',
    title: 'Top Times',
    description: 'View top 10 times by event, age, and date range.',
    icon: Timer,
    color: 'rose'
  },
];

// Color mappings for Tailwind
const colorClasses = {
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', iconBg: 'bg-violet-100', iconText: 'text-violet-600' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', iconBg: 'bg-purple-100', iconText: 'text-purple-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', iconBg: 'bg-cyan-100', iconText: 'text-cyan-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', iconBg: 'bg-amber-100', iconText: 'text-amber-600' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', iconBg: 'bg-rose-100', iconText: 'text-rose-600' },
};

// Report Card Component
function ReportCard({ report, onClick, featured = false }) {
  const Icon = report.icon;
  const colors = colorClasses[report.color] || colorClasses.blue;
  
  if (featured) {
    return (
      <button
        onClick={() => onClick?.(report.id)}
        className={`w-full bg-gradient-to-br ${report.gradient} text-white rounded-2xl p-6 text-left hover:shadow-xl transition-all group relative overflow-hidden`}
      >
        <div className="relative z-10">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
            <Icon size={24} />
          </div>
          <h3 className="font-bold text-xl mb-1">{report.title}</h3>
          <p className="text-white/80 text-sm">{report.description}</p>
        </div>
        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
      </button>
    );
  }
  
  return (
    <button
      onClick={() => onClick?.(report.id)}
      className={`w-full bg-white border-2 border-dashed ${colors.border} rounded-2xl p-5 text-left hover:shadow-lg hover:border-solid transition-all group`}
    >
      <div className={`w-12 h-12 ${colors.iconBg} rounded-xl flex items-center justify-center mb-4`}>
        <Icon size={22} className={colors.iconText} />
      </div>
      <h3 className="font-bold text-slate-800 mb-1">{report.title}</h3>
      <p className="text-slate-500 text-sm">{report.description}</p>
    </button>
  );
}

// Reports Tab Content
function ReportsTab({ navigateTo }) {
  const handleReportClick = (reportId) => {
    // Navigate to the full reports page with the specific report type
    navigateTo?.('reports-full', { reportType: reportId });
  };

  return (
    <div className="space-y-6">
      {/* Featured Report - Meet Report */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <ReportCard 
            report={REPORT_CARDS[0]} 
            onClick={handleReportClick}
            featured={true}
          />
        </div>
        
        {/* Other reports grid */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REPORT_CARDS.slice(1, 3).map(report => (
            <ReportCard 
              key={report.id}
              report={report}
              onClick={handleReportClick}
            />
          ))}
        </div>
      </div>

      {/* Remaining reports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_CARDS.slice(3).map(report => (
          <ReportCard 
            key={report.id}
            report={report}
            onClick={handleReportClick}
          />
        ))}
      </div>
    </div>
  );
}

// Progress Tab Content
function ProgressTab({ navigateTo }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Get swimmer count
      const { count: swimmerCount } = await supabase
        .from('swimmers')
        .select('*', { count: 'exact', head: true })
        .eq('coach_id', user.id);

      // Get results count this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      
      const { count: resultsCount } = await supabase
        .from('results')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Get meets this season
      const { count: meetsCount } = await supabase
        .from('meets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['draft', 'open', 'closed', 'completed']);

      setStats({
        swimmers: swimmerCount || 0,
        resultsThisMonth: resultsCount || 0,
        meetsThisSeason: meetsCount || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
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
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <Users size={24} className="mx-auto text-blue-500 mb-2" />
          <div className="text-3xl font-bold text-slate-800">{stats?.swimmers || 0}</div>
          <div className="text-sm text-slate-500">Swimmers</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <Clock size={24} className="mx-auto text-emerald-500 mb-2" />
          <div className="text-3xl font-bold text-slate-800">{stats?.resultsThisMonth || 0}</div>
          <div className="text-sm text-slate-500">Times This Month</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 text-center">
          <Trophy size={24} className="mx-auto text-amber-500 mb-2" />
          <div className="text-3xl font-bold text-slate-800">{stats?.meetsThisSeason || 0}</div>
          <div className="text-sm text-slate-500">Meets</div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="space-y-3">
        <h3 className="font-semibold text-slate-700">Quick Access</h3>
        
        <button
          onClick={() => navigateTo?.('meets')}
          className="w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <FileText size={20} className="text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">Meet Entries & Confirmations</h4>
              <p className="text-sm text-slate-500">Manage entries, SD3 uploads, and parent confirmations</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-300" />
        </button>

        <button
          onClick={() => navigateTo?.('test-sets-list')}
          className="w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock size={20} className="text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">Test Set History</h4>
              <p className="text-sm text-slate-500">View all recorded test sets</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-300" />
        </button>

        <button
          onClick={() => navigateTo?.('team')}
          className="w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center">
              <Trophy size={20} className="text-violet-600" />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">Team Records</h4>
              <p className="text-sm text-slate-500">View trophy case and record history</p>
            </div>
          </div>
          <ChevronRight size={20} className="text-slate-300" />
        </button>
      </div>
    </div>
  );
}

// Main ReportsHub Component
export default function ReportsHub({ 
  navigateTo,
  onGenerateMeetReport 
}) {
  const [activeTab, setActiveTab] = useState('reports');

  const handleNavigate = (view, params) => {
    // For now, just navigate to the reports-full view
    // The Reports.jsx component will handle showing different report types
    navigateTo?.(view);
  };

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500">Generate reports and track team progress</p>
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
        {activeTab === 'reports' && (
          <ReportsTab navigateTo={handleNavigate} />
        )}
        {activeTab === 'progress' && (
          <ProgressTab navigateTo={handleNavigate} />
        )}
      </div>
    </div>
  );
}
