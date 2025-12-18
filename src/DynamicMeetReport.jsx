// src/DynamicMeetReport.jsx
// Dynamic report renderer that respects custom layouts

import React from 'react';
import { ChevronLeft, Download, Loader2 } from 'lucide-react';
import { SECTION_COMPONENTS } from './ReportSectionComponents';
import { getDefaultLayout } from './reportSections';

export default function DynamicMeetReport({ reportData, onBack, onExportPDF, isExportingPDF }) {
  const { meetName, dateRange, layout } = reportData;
  
  // Get layout configuration
  const activeLayout = layout || getDefaultLayout('modern');
  
  // Get enabled sections sorted by order
  const enabledSections = (activeLayout.sections || [])
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);
  
  // Helper to format date properly (avoid timezone issues)
  const formatDate = (dateStr, options) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{meetName}</h2>
            <p className="text-slate-500">
              {formatDate(dateRange.start, { month: 'short', day: 'numeric' })} - {' '}
              {formatDate(dateRange.end, { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>
        <button 
          onClick={onExportPDF} 
          disabled={isExportingPDF} 
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {isExportingPDF ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
          {isExportingPDF ? 'Exporting...' : 'Export PDF'}
        </button>
      </div>

      {/* Dynamic Sections */}
      {enabledSections.length === 0 ? (
        <div className="bg-white rounded-2xl border shadow-sm p-12 text-center">
          <p className="text-slate-500 text-lg">No sections enabled in this layout</p>
          <p className="text-slate-400 text-sm mt-2">Edit your layout to add sections</p>
        </div>
      ) : (
        enabledSections.map((section, index) => {
          const SectionComponent = SECTION_COMPONENTS[section.id];
          
          if (!SectionComponent) {
            console.warn(`Section component not found for: ${section.id}`);
            return null;
          }
          
          return (
            <div key={`${section.id}-${index}`}>
              <SectionComponent 
                data={reportData} 
                config={section.config || {}} 
              />
            </div>
          );
        })
      )}

      {/* Layout Info (Debug - can be removed) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-slate-100 rounded-xl text-xs text-slate-600">
          <div className="font-semibold mb-2">Layout Debug Info:</div>
          <div>Sections: {enabledSections.length} enabled</div>
          <div>Order: {enabledSections.map(s => s.id).join(' → ')}</div>
        </div>
      )}
    </div>
  );
}

