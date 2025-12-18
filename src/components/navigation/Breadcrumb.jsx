// src/components/navigation/Breadcrumb.jsx
// Contextual breadcrumb navigation for drill-down views
// Recommendation from 4.1: "Add contextual breadcrumbs for drill-down views"

import React from 'react';
import { ChevronRight, Home, Calendar, Users, Trophy, Waves, Heart, FileText, Video, Megaphone } from 'lucide-react';

// View hierarchy configuration - Updated for 4.1 Navigation Restructure
const VIEW_CONFIG = {
  dashboard: { 
    label: 'Dashboard', 
    icon: Home,
    parent: null 
  },
  // Schedule Hub
  schedule: { 
    label: 'Schedule', 
    icon: Calendar,
    parent: 'dashboard' 
  },
  meets: { 
    label: 'Meets Manager', 
    icon: Trophy,
    parent: 'schedule' 
  },
  calendar: { 
    label: 'Team Events', 
    icon: Heart,
    parent: 'schedule' 
  },
  'practice-hub': { 
    label: 'Practice Hub', 
    icon: Waves,
    parent: 'schedule' 
  },
  'practice-builder': { 
    label: 'Practice Builder', 
    icon: Waves,
    parent: 'schedule' 
  },
  'practice-run-mode': { 
    label: 'Run Practice', 
    icon: Waves,
    parent: 'practice-builder' 
  },
  'template-library': { 
    label: 'Templates', 
    icon: Waves,
    parent: 'practice-hub' 
  },
  'test-set': { 
    label: 'Test Set', 
    icon: Waves,
    parent: 'schedule' 
  },
  'test-sets-list': { 
    label: 'Test Sets', 
    icon: Waves,
    parent: 'schedule' 
  },
  // Team Hub
  team: { 
    label: 'Team', 
    icon: Users,
    parent: 'dashboard' 
  },
  roster: { 
    label: 'Roster', 
    icon: Users,
    parent: 'team' 
  },
  profile: { 
    label: 'Swimmer Profile', 
    icon: Users,
    parent: 'team' 
  },
  'trophy-case': { 
    label: 'Trophy Case', 
    icon: Trophy,
    parent: 'team' 
  },
  // Communications Hub
  communications: { 
    label: 'Communications', 
    icon: Megaphone,
    parent: 'dashboard' 
  },
  announcements: { 
    label: 'Compose', 
    icon: Megaphone,
    parent: 'communications' 
  },
  // Reports Hub  
  reports: { 
    label: 'Reports', 
    icon: FileText,
    parent: 'dashboard' 
  },
  'reports-full': { 
    label: 'Report Generator', 
    icon: FileText,
    parent: 'reports' 
  },
  'meet-entries': { 
    label: 'Meet Entries', 
    icon: FileText,
    parent: 'reports' 
  },
  // Tools Hub
  tools: { 
    label: 'Tools', 
    icon: Video,
    parent: 'dashboard' 
  },
  analysis: { 
    label: 'AI Analysis', 
    icon: Video,
    parent: 'tools' 
  },
  'view-analysis': { 
    label: 'Analysis Result', 
    icon: Video,
    parent: 'analysis' 
  },
  'ai-chat': { 
    label: 'AI Chat', 
    icon: Megaphone,
    parent: 'tools' 
  }
};

// Build breadcrumb trail from current view
function getBreadcrumbTrail(currentView, previousView = null) {
  const trail = [];
  let view = currentView;
  
  // Build trail by walking up the parent chain
  while (view && VIEW_CONFIG[view]) {
    trail.unshift({
      id: view,
      ...VIEW_CONFIG[view]
    });
    view = VIEW_CONFIG[view].parent;
  }
  
  // If we came from a specific view (previousView), use that for the back button
  // but don't add it to the visible trail
  
  return trail;
}

export default function Breadcrumb({ 
  currentView, 
  previousView,
  onNavigate,
  swimmerName = null,
  practiceName = null,
  meetName = null
}) {
  const trail = getBreadcrumbTrail(currentView, previousView);
  
  // Don't show breadcrumb on root views
  if (trail.length <= 1) {
    return null;
  }
  
  // Customize labels based on context
  const getCustomLabel = (item) => {
    if (item.id === 'profile' && swimmerName) {
      return swimmerName;
    }
    if (item.id === 'practice-builder' && practiceName) {
      return practiceName;
    }
    if (item.id === 'meets' && meetName) {
      return meetName;
    }
    return item.label;
  };
  
  return (
    <nav className="flex items-center gap-1 text-sm mb-4 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0">
      {trail.map((item, index) => {
        const Icon = item.icon;
        const isLast = index === trail.length - 1;
        const label = getCustomLabel(item);
        
        return (
          <React.Fragment key={item.id}>
            {index > 0 && (
              <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
            )}
            {isLast ? (
              <span className="flex items-center gap-1.5 font-medium text-slate-800 whitespace-nowrap">
                <Icon size={14} className="text-slate-500" />
                {label}
              </span>
            ) : (
              <button
                onClick={() => onNavigate(item.id)}
                className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors whitespace-nowrap"
              >
                <Icon size={14} />
                {label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// Compact back button for mobile/simplified views
export function BackButton({ currentView, previousView, onNavigate, label = null }) {
  const config = VIEW_CONFIG[currentView];
  const backTo = previousView || (config?.parent || 'dashboard');
  const backConfig = VIEW_CONFIG[backTo];
  const Icon = backConfig?.icon || Home;
  
  return (
    <button
      onClick={() => onNavigate(backTo)}
      className="flex items-center gap-2 text-slate-600 hover:text-slate-800 font-medium transition-colors group"
    >
      <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
        <ChevronRight size={16} className="rotate-180" />
      </div>
      <span className="text-sm">
        {label || `Back to ${backConfig?.label || 'Dashboard'}`}
      </span>
    </button>
  );
}

