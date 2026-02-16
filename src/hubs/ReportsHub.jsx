// src/hubs/ReportsHub.jsx
// Reports Hub - All reports and progress tracking
// Updated to show all report types from existing Reports.jsx

import React, { useState } from 'react';
import {
  FileText,
  TrendingUp,
  BarChart3,
  Award,
  Target,
  Layers,
  Timer,
  Medal,
  Activity,
  Lock,
  Crown
} from 'lucide-react';
import { useFeatureGate } from '../components/gates';
import { getTierDisplayName } from '../config/features';

// Tab configuration - simplified to 2 tabs
const TABS = [
  { id: 'reports', label: 'Reports', icon: FileText, description: 'All report types' },
  { id: 'progress', label: 'Progress', icon: BarChart3, description: 'Swimmer trends' },
];

// Report card configuration matching the screenshot
// Feature key indicates which feature is required (null = available to all)
const REPORT_CARDS = [
  {
    id: 'meet-report',
    title: 'Meet Report',
    description: 'Generate comprehensive post-meet reports with stats & charts.',
    icon: FileText,
    color: 'violet',
    gradient: 'from-violet-500 to-purple-600',
    featured: true,
    featureKey: 'meet_reports' // Pro feature
  },
  {
    id: 'qualifiers',
    title: 'Qualifiers List',
    description: 'See who made the cut for Champs, Sectionals, etc.',
    icon: Award,
    color: 'blue',
    featureKey: null // Available to all
  },
  {
    id: 'relay-generator',
    title: 'Relay Generator',
    description: 'Auto-build optimal A, B, and C relays.',
    icon: Layers,
    color: 'purple',
    featureKey: null
  },
  {
    id: 'big-movers',
    title: 'Big Movers',
    description: 'Leaderboard of total time dropped this season.',
    icon: TrendingUp,
    color: 'emerald',
    featureKey: null
  },
  {
    id: 'close-calls',
    title: 'Close Calls',
    description: 'Swimmers within striking distance of a time standard.',
    icon: Target,
    color: 'orange',
    featureKey: null
  },
  {
    id: 'team-funnel',
    title: 'Team Funnel',
    description: 'Visualize team progression through time standards.',
    icon: Activity,
    color: 'cyan',
    featureKey: 'advanced_analytics' // Club feature
  },
  {
    id: 'team-records',
    title: 'Team Records',
    description: 'Analyze team record breaks and history.',
    icon: Medal,
    color: 'amber',
    featureKey: 'team_records' // Pro feature
  },
  {
    id: 'top-times',
    title: 'Top Times',
    description: 'View top 10 times by event, age, and date range.',
    icon: Timer,
    color: 'rose',
    featureKey: null
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
function ReportCard({ report, onClick, featured = false, isLocked = false, requiredTier = null }) {
  const Icon = report.icon;
  const colors = colorClasses[report.color] || colorClasses.blue;
  
  const handleClick = () => {
    if (isLocked) {
      window.dispatchEvent(new CustomEvent('navigate', { detail: 'billing' }));
    } else {
      onClick?.(report.id);
    }
  };
  
  if (featured) {
    return (
      <button
        onClick={handleClick}
        className={`w-full bg-gradient-to-br ${report.gradient} text-white rounded-2xl p-6 ${isLocked ? 'pb-24' : ''} text-left hover:shadow-xl transition-all group relative overflow-hidden`}
      >
        {/* Locked banner (keeps underlying text readable) */}
        {isLocked && (
          <div className="absolute inset-x-0 bottom-0 z-20 p-4">
            <div className="flex items-center justify-between gap-3 bg-white/90 text-slate-900 rounded-xl px-4 py-3 shadow-lg border border-white/30 backdrop-blur-sm">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-slate-900/5 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock size={16} className="text-slate-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">Locked</p>
                  <p className="text-xs text-slate-600 truncate">
                    Upgrade to {getTierDisplayName(requiredTier)}
                  </p>
                </div>
              </div>
              <div className="text-xs font-semibold text-blue-700 whitespace-nowrap">
                View plans →
              </div>
            </div>
          </div>
        )}
        
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon size={24} />
            </div>
            {isLocked && requiredTier && (
              <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${
                requiredTier === 'club' ? 'bg-purple-500/30' : 'bg-blue-500/30'
              }`}>
                <Crown size={12} />
                {requiredTier === 'club' ? 'Club' : 'Pro'}
              </span>
            )}
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
      onClick={handleClick}
      className={`w-full bg-white border-2 border-dashed ${colors.border} rounded-2xl p-5 ${isLocked ? 'pb-20' : ''} text-left hover:shadow-lg hover:border-solid transition-all group relative overflow-hidden`}
    >
      {/* Locked chip + banner (keeps underlying text readable) */}
      {isLocked && (
        <>
          <div className="absolute top-4 right-4 z-10">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
              requiredTier === 'club'
                ? 'bg-purple-600 text-white'
                : 'bg-blue-600 text-white'
            }`}>
              <Lock size={12} />
              {getTierDisplayName(requiredTier)}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 z-10 p-4">
            <div className="flex items-center justify-between gap-3 bg-slate-50 text-slate-800 rounded-xl px-4 py-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <Lock size={16} className="text-slate-500 flex-shrink-0" />
                <span className="text-sm font-semibold truncate">Locked</span>
                <span className="text-xs text-slate-600 truncate">
                  Upgrade to {getTierDisplayName(requiredTier)}
                </span>
              </div>
              <div className="text-xs font-semibold text-blue-700 whitespace-nowrap">
                View plans →
              </div>
            </div>
          </div>
        </>
      )}
      
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
  // Check feature access for gated reports
  const meetReportsAccess = useFeatureGate('meet_reports');
  const teamRecordsAccess = useFeatureGate('team_records');
  const advancedAnalyticsAccess = useFeatureGate('advanced_analytics');
  
  const getFeatureAccess = (featureKey) => {
    if (!featureKey) return { isUnlocked: true, requiredTier: null };
    switch (featureKey) {
      case 'meet_reports': return meetReportsAccess;
      case 'team_records': return teamRecordsAccess;
      case 'advanced_analytics': return advancedAnalyticsAccess;
      default: return { isUnlocked: true, requiredTier: null };
    }
  };

  const handleReportClick = (reportId) => {
    // Navigate to the full reports page with the specific report type
    navigateTo?.('reports-full', { reportType: reportId });
  };

  return (
    <div className="space-y-6">
      {/* Featured Report - Meet Report */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          {(() => {
            const access = getFeatureAccess(REPORT_CARDS[0].featureKey);
            return (
              <ReportCard 
                report={REPORT_CARDS[0]} 
                onClick={handleReportClick}
                featured={true}
                isLocked={!access.isUnlocked}
                requiredTier={access.requiredTier}
              />
            );
          })()}
        </div>
        
        {/* Other reports grid */}
        <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {REPORT_CARDS.slice(1, 3).map(report => {
            const access = getFeatureAccess(report.featureKey);
            return (
              <ReportCard 
                key={report.id}
                report={report}
                onClick={handleReportClick}
                isLocked={!access.isUnlocked}
                requiredTier={access.requiredTier}
              />
            );
          })}
        </div>
      </div>

      {/* Remaining reports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_CARDS.slice(3).map(report => {
          const access = getFeatureAccess(report.featureKey);
          return (
            <ReportCard 
              key={report.id}
              report={report}
              onClick={handleReportClick}
              isLocked={!access.isUnlocked}
              requiredTier={access.requiredTier}
            />
          );
        })}
      </div>
    </div>
  );
}

// Progress Tab Content
function ProgressTab() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center">
        <BarChart3 size={28} className="text-slate-500" />
      </div>
      <h3 className="mt-4 text-xl font-bold text-slate-800">Coming Soon</h3>
      <p className="mt-1 text-sm text-slate-500">
        Progress tracking is under construction.
      </p>
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
