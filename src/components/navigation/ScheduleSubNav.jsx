// src/components/navigation/ScheduleSubNav.jsx
// Shared sub-navigation bar for all schedule-related views
// Provides one-click access to Calendar, Workouts, Practice Times, Coach Assignments, Meet Manager, Event Manager

import React from 'react';
import {
  Calendar, ClipboardList, Clock, Users, Trophy, Heart
} from 'lucide-react';

const SCHEDULE_SECTIONS = [
  { id: 'calendar', label: 'Calendar', shortLabel: 'Cal', icon: Calendar },
  { id: 'workouts', label: 'Workouts', shortLabel: 'Work', icon: ClipboardList },
  { id: 'practice-times', label: 'Practice Times', shortLabel: 'Times', icon: Clock },
  { id: 'coaches', label: 'Coach Assignments', shortLabel: 'Coaches', icon: Users },
  { id: 'meets', label: 'Meet Manager', shortLabel: 'Meets', icon: Trophy },
  { id: 'events', label: 'Event Manager', shortLabel: 'Events', icon: Heart },
];

export default function ScheduleSubNav({ activeSection, onNavigate }) {
  return (
    <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
      <div className="bg-slate-100/80 rounded-2xl p-1.5 flex gap-1 w-max md:w-full">
        {SCHEDULE_SECTIONS.map(section => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => onNavigate(section.id)}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-white shadow-sm text-slate-900 border border-slate-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-blue-600' : ''} />
              <span className="hidden md:inline">{section.label}</span>
              <span className="md:hidden">{section.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
