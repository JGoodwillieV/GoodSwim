// src/MeetReportGenerator.jsx
// Comprehensive Meet Report Generator for Coaches
// V3: Added age group filtering + Classic format option

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from './supabase';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  ChevronLeft, Calendar, Users, Trophy, TrendingUp, TrendingDown,
  Award, Target, Zap, Clock, Filter, Download, Share2, Loader2,
  CheckCircle, Star, Flame, Medal, ChevronDown, ChevronRight,
  Percent, Timer, Activity, BarChart3, FileText, Sparkles, Printer,
  LayoutTemplate, Plus, Edit2, Trash2
} from 'lucide-react';
import ReportLayoutEditor from './ReportLayoutEditor';
import { getDefaultLayout } from './reportSections';
import DynamicMeetReport from './DynamicMeetReport';
import { SECTION_HTML_GENERATORS } from './reportPDFGenerators';

// Import centralized utilities
import { 
  timeToSecondsForSort as timeToSeconds, 
  secondsToTime 
} from './utils/timeUtils';
import { parseEventName } from './utils/eventUtils';

// Wrapper for backward compatibility with local parseEvent signature
const parseEvent = (evt) => {
  if (!evt) return { dist: '', stroke: '' };
  const { distance: dist, stroke: rawStroke } = parseEventName(evt);
  if (!dist || !rawStroke) return { dist: '', stroke: '' };
  // Convert to title case for existing code
  let stroke = rawStroke;
  if (stroke === 'freestyle') stroke = 'Freestyle';
  else if (stroke === 'backstroke') stroke = 'Backstroke';
  else if (stroke === 'breaststroke') stroke = 'Breaststroke';
  else if (stroke === 'butterfly') stroke = 'Butterfly';
  else if (stroke === 'im') stroke = 'IM';
  else return { dist: '', stroke: '' };
  return { dist, stroke };
};

const getAgeGroup = (age) => {
  if (!age) return null;
  const numAge = parseInt(age);
  if (numAge <= 8) return '8 & Under';
  if (numAge >= 9 && numAge <= 10) return '9-10';
  if (numAge >= 11 && numAge <= 12) return '11-12';
  if (numAge >= 13 && numAge <= 14) return '13-14';
  if (numAge >= 15 && numAge <= 18) return '15-18';
  if (numAge >= 19) return '19 & Over';
  return null;
};

const abbreviateEvent = (event) => {
  if (!event) return '';
  return event
    .replace('Freestyle', 'Free')
    .replace('Backstroke', 'Back')
    .replace('Breaststroke', 'Breast')
    .replace('Butterfly', 'Fly')
    .replace(' IM', ' IM'); // Keep IM as is
};

const normalizeEvent = (evt) => {
  const { dist, stroke } = parseEvent(evt);
  if (!dist || !stroke) return null;
  return `${dist} ${stroke}`;
};

// Standard hierarchy
const STANDARD_HIERARCHY = ['Nationals', 'US JR', 'Winter JR', 'Futures', 'NCSA JR', 'Sectionals', 'VSI SC', 'VSI AG', 'AAAA', 'AAA', 'AA', 'A', 'BB', 'B'];
const STANDARD_COLORS = {
  'Nationals': { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', hex: '#f59e0b' },
  'US JR': { bg: 'bg-violet-600', light: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', hex: '#7c3aed' },
  'Winter JR': { bg: 'bg-sky-600', light: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', hex: '#0284c7' },
  'Futures': { bg: 'bg-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', hex: '#059669' },
  'NCSA JR': { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', hex: '#f97316' },
  'Sectionals': { bg: 'bg-indigo-600', light: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', hex: '#4f46e5' },
  'VSI SC': { bg: 'bg-cyan-600', light: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', hex: '#0891b2' },
  'VSI AG': { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', hex: '#14b8a6' },
  'AAAA': { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', hex: '#f43f5e' },
  'AAA': { bg: 'bg-purple-500', light: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', hex: '#a855f7' },
  'AA': { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', hex: '#3b82f6' },
  'A': { bg: 'bg-yellow-500', light: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', hex: '#eab308' },
  'BB': { bg: 'bg-slate-400', light: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', hex: '#94a3b8' },
  'B': { bg: 'bg-amber-600', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', hex: '#d97706' },
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard = ({ icon: Icon, label, value, subValue, color = 'blue', large = false }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    yellow: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
  };

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${large ? 'col-span-2' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className={`font-bold text-slate-800 ${large ? 'text-3xl' : 'text-2xl'} mt-0.5`}>{value}</p>
          {subValue && <p className="text-sm text-slate-500 mt-0.5">{subValue}</p>}
        </div>
      </div>
    </div>
  );
};

// ============================================
// EXPANDABLE SECTION COMPONENT
// ============================================

const ExpandableSection = ({ title, icon: Icon, children, defaultOpen = true, count }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
            <Icon size={20} />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
          {count !== undefined && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              {count}
            </span>
          )}
        </div>
        <ChevronDown
          size={20}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && <div className="px-4 pb-4 border-t border-slate-100 pt-4">{children}</div>}
    </div>
  );
};

// ============================================
// PDF EXPORT FUNCTION
// ============================================

const generatePDFContent = (data) => {
  // Get layout configuration
  const layout = data.layout || getDefaultLayout('modern');
  const enabledSections = (layout.sections || [])
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);
  
  // Generate HTML for each enabled section
  const sectionsHTML = enabledSections.map(section => {
    const generator = SECTION_HTML_GENERATORS[section.id];
    if (!generator) {
      console.warn(`No PDF generator found for section: ${section.id}`);
      return '';
    }
    return generator(data, section.config || {});
  }).filter(html => html).join('\n');
  
  // Helper to format date properly (avoid timezone issues)
  const formatDate = (dateStr, options) => {
    // Parse as local date to avoid timezone shifting
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', options);
  };
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>${data.meetName || 'Meet Report'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1e293b; line-height: 1.5; padding: 20px; max-width: 800px; margin: 0 auto;
      background: #f8fafc;
    }
    .header {
      background: linear-gradient(135deg, #4f46e5, #7c3aed);
      color: white; padding: 30px; border-radius: 16px; margin-bottom: 24px; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);
    }
    .header h1 { font-size: 28px; margin-bottom: 8px; font-weight: 900; }
    .header p { opacity: 0.9; font-size: 14px; }
    
    /* Stats Grid - Colorful Cards */
    .stats-grid { 
      display: grid; 
      grid-template-columns: repeat(4, 1fr); 
      gap: 12px; 
      margin-bottom: 24px;
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    .stat-card {
      background: white; 
      border-radius: 12px; 
      padding: 16px; 
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border: 2px solid transparent;
    }
    .stat-card:nth-child(1) { border-color: #3b82f6; background: linear-gradient(135deg, #eff6ff, #dbeafe); }
    .stat-card:nth-child(2) { border-color: #10b981; background: linear-gradient(135deg, #ecfdf5, #d1fae5); }
    .stat-card:nth-child(3) { border-color: #f59e0b; background: linear-gradient(135deg, #fffbeb, #fef3c7); }
    .stat-card:nth-child(4) { border-color: #8b5cf6; background: linear-gradient(135deg, #f5f3ff, #ede9fe); }
    .stat-card .label { 
      font-size: 10px; 
      color: #64748b; 
      text-transform: uppercase; 
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .stat-card .value { 
      font-size: 32px; 
      font-weight: 900; 
      color: #1e293b;
      line-height: 1;
    }
    .stat-card:nth-child(1) .value { color: #1e40af; }
    .stat-card:nth-child(2) .value { color: #047857; }
    .stat-card:nth-child(3) .value { color: #b45309; }
    .stat-card:nth-child(4) .value { color: #6d28d9; }
    .stat-card .sub { 
      font-size: 11px; 
      color: #64748b; 
      margin-top: 4px;
      font-weight: 500;
    }
    
    /* Hero Banner - Gradient */
    .hero {
      background: linear-gradient(135deg, #10b981, #14b8a6, #06b6d4);
      color: white; 
      padding: 32px; 
      border-radius: 16px; 
      margin-bottom: 24px;
      text-align: center;
      box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);
      page-break-after: avoid;
      page-break-inside: avoid;
    }
    .hero .big-number { 
      font-size: 72px; 
      font-weight: 900; 
      line-height: 1;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .hero > div > div:first-child {
      font-size: 13px;
      opacity: 0.95;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .hero > div > div:last-child {
      opacity: 0.95;
      font-size: 16px;
      margin-top: 8px;
    }
    
    /* Sections */
    .section {
      background: white; 
      border: 1px solid #e2e8f0; 
      border-radius: 12px;
      margin-bottom: 16px; 
      overflow: hidden; 
      page-break-inside: avoid;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .section-header {
      background: linear-gradient(135deg, #f8fafc, #f1f5f9);
      padding: 14px 16px; 
      font-weight: 700; 
      font-size: 16px; 
      border-bottom: 2px solid #e2e8f0;
      color: #1e293b;
    }
    .section-content { padding: 16px; }
    .item { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      padding: 12px 8px; 
      border-bottom: 1px solid #f1f5f9;
      transition: background 0.2s;
    }
    .item:last-child { border-bottom: none; }
    .item .rank {
      width: 28px; height: 28px; border-radius: 50%; background: #e2e8f0;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; margin-right: 12px; color: #64748b;
    }
    .item .rank.gold { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; box-shadow: 0 2px 4px rgba(251, 191, 36, 0.3); }
    .item .rank.silver { background: linear-gradient(135deg, #94a3b8, #64748b); color: white; box-shadow: 0 2px 4px rgba(148, 163, 184, 0.3); }
    .item .rank.bronze { background: linear-gradient(135deg, #d97706, #b45309); color: white; box-shadow: 0 2px 4px rgba(217, 119, 6, 0.3); }
    .item .name { font-weight: 600; color: #1e293b; }
    .item .event { color: #64748b; font-size: 14px; }
    .item .drop { 
      color: #10b981; 
      font-weight: 700; 
      font-size: 16px;
      background: #ecfdf5;
      padding: 4px 10px;
      border-radius: 8px;
    }
    .item .details { font-size: 12px; color: #94a3b8; margin-left: 36px; margin-top: 4px; }
    
    /* Badges */
    .badge {
      display: inline-block; 
      padding: 4px 10px; 
      border-radius: 12px;
      font-size: 12px; 
      font-weight: 700; 
      color: white; 
      margin-right: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }
    .badge-Nationals { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .badge-US-JR { background: linear-gradient(135deg, #7c3aed, #6d28d9); }
    .badge-Winter-JR { background: linear-gradient(135deg, #0284c7, #0369a1); }
    .badge-Futures { background: linear-gradient(135deg, #059669, #047857); }
    .badge-NCSA-JR { background: linear-gradient(135deg, #f97316, #ea580c); }
    .badge-Sectionals { background: linear-gradient(135deg, #4f46e5, #4338ca); }
    .badge-VSI-SC { background: linear-gradient(135deg, #0891b2, #0e7490); }
    .badge-VSI-AG { background: linear-gradient(135deg, #14b8a6, #0d9488); }
    .badge-AAAA { background: linear-gradient(135deg, #f43f5e, #e11d48); }
    .badge-AAA { background: linear-gradient(135deg, #a855f7, #9333ea); }
    .badge-AA { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    .badge-A { background: linear-gradient(135deg, #eab308, #d97706); }
    .badge-BB { background: linear-gradient(135deg, #94a3b8, #64748b); }
    .badge-B { background: linear-gradient(135deg, #f97316, #ea580c); }
    
    .standard-group { margin-bottom: 20px; }
    .standard-item { 
      padding: 12px 14px; 
      background: linear-gradient(135deg, #f8fafc, #f1f5f9); 
      border-radius: 10px; 
      margin-bottom: 8px; 
      display: flex; 
      justify-content: space-between;
      border: 1px solid #e2e8f0;
      align-items: center;
    }
    
    /* Tables */
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #f1f5f9; }
    th { 
      background: linear-gradient(135deg, #f1f5f9, #e2e8f0); 
      font-size: 11px; 
      color: #475569; 
      text-transform: uppercase; 
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    td { color: #1e293b; }
    tbody tr:hover { background: #f8fafc; }
    
    .footer { 
      text-align: center; 
      padding: 24px; 
      color: #94a3b8; 
      font-size: 12px; 
      border-top: 2px solid #e2e8f0; 
      margin-top: 32px; 
    }
    @media print { 
      body { padding: 0; background: white; } 
      .section { break-inside: avoid; }
      .stat-card, .hero { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${data.meetName || 'Meet Report'}</h1>
    <p>${formatDate(data.dateRange.start, { month: 'long', day: 'numeric' })} - ${formatDate(data.dateRange.end, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
  </div>

  ${sectionsHTML}

  <div class="footer">Generated by StormTracker • ${new Date().toLocaleDateString()}</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
};

// ============================================
// OLD FORMAT PDF EXPORT FUNCTION
// ============================================

const generateClassicPDFContent = (data) => {
  console.log('Classic PDF - newStandards:', data.newStandards);
  
  // Get layout configuration
  const layout = data.layout || getDefaultLayout('classic');
  const enabledSections = (layout.sections || [])
    .filter(s => s.enabled)
    .sort((a, b) => a.order - b.order);
  
  // Helper to format date properly (avoid timezone issues)
  const formatDate = (dateStr, options) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', options);
  };
  
  // Helper function to abbreviate event names
  const abbrevEvent = (event) => {
    if (!event) return '';
    return event
      .replace('Freestyle', 'Free')
      .replace('Backstroke', 'Back')
      .replace('Breaststroke', 'Breast')
      .replace('Butterfly', 'Fly');
  };
  
  // Process new standards for classic format
  const standardsBySwimmer = {};
  const levelOrder = { 
    'Nationals': 14, 'US JR': 13, 'Winter JR': 12, 'Futures': 11, 'NCSA JR': 10, 
    'Sectionals': 9, 'VSI SC': 8, 'VSI AG': 7, 
    'AAAA': 6, 'AAA': 5, 'AA': 4, 'A': 3, 'BB': 2, 'B': 1 
  };
  
  (data.newStandards || []).forEach(ns => {
    const swimmerId = ns.swimmer.id;
    if (!standardsBySwimmer[swimmerId]) {
      standardsBySwimmer[swimmerId] = {
        name: ns.swimmer.name,
        standards: [],
        eventLevels: {} // Track highest level per event
      };
    }
    
    // Extract level from standard name (e.g., "Boys 11-12 50 Freestyle BB" -> "BB")
    const standardParts = ns.standard.split(' ');
    const level = standardParts[standardParts.length - 1]; // Last part is the level
    const event = abbrevEvent(ns.event);
    
    // Only keep the highest standard for each event
    const currentLevel = levelOrder[level] || 0;
    const existingLevel = standardsBySwimmer[swimmerId].eventLevels[event];
    
    if (!existingLevel || currentLevel > existingLevel.order) {
      // Remove any existing lower standard for this event
      standardsBySwimmer[swimmerId].standards = standardsBySwimmer[swimmerId].standards.filter(
        std => std.event !== event
      );
      // Add the new higher standard
      standardsBySwimmer[swimmerId].standards.push({
        level: level,
        event: event
      });
      standardsBySwimmer[swimmerId].eventLevels[event] = { level, order: currentLevel };
    }
  });

  // Helper to extract last name (assumes format: "FirstName MiddleInitial LastName" or "FirstName LastName")
  const getLastName = (fullName) => {
    const parts = fullName.trim().split(' ');
    return parts[parts.length - 1]; // Last part is the last name
  };

  // Sort swimmers by last name
  const swimmersList = Object.values(standardsBySwimmer).sort((a, b) => 
    getLastName(a.name).localeCompare(getLastName(b.name))
  );
  
  // Process meet cuts data for classic format
  const meetCutsProcessed = {};
  if (data.meetCutsByMeet) {
    Object.entries(data.meetCutsByMeet).forEach(([meetName, cuts]) => {
      const cutsBySwimmer = {};
      cuts.forEach(cut => {
        const swimmerId = cut.swimmer.id;
        if (!cutsBySwimmer[swimmerId]) {
          cutsBySwimmer[swimmerId] = {
            name: cut.swimmer.name,
            events: []
          };
        }
        cutsBySwimmer[swimmerId].events.push(abbrevEvent(cut.event));
      });
      
      meetCutsProcessed[meetName] = Object.values(cutsBySwimmer).sort((a, b) => 
        a.name.localeCompare(b.name)
      );
    });
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <title>${data.meetName || 'Meet Report'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #000; line-height: 1.8; padding: 40px; max-width: 900px; margin: 0 auto;
      font-size: 14px;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #000;
    }
    .header h1 { 
      font-size: 32px; 
      font-weight: 900; 
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .header .subtitle { 
      font-size: 18px; 
      font-weight: 600;
      color: #333;
    }
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 2px solid #333;
    }
    .highlight-stat {
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 12px;
      line-height: 1.6;
    }
    .swimmer-entry {
      margin-bottom: 10px;
      line-height: 1.7;
      padding: 6px 0;
    }
    .swimmer-name {
      font-weight: 700;
      color: #000;
    }
    .swimmer-entry strong {
      font-weight: 700;
      color: #000;
    }
    .standards-list {
      display: inline;
    }
    .standard-badge {
      font-weight: 700;
      margin-right: 4px;
    }
    ul {
      padding-left: 0;
      list-style: none;
    }
    .info-section {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 8px;
      margin-top: 30px;
      font-size: 13px;
      line-height: 1.7;
    }
    .info-section h3 {
      font-size: 16px;
      margin-bottom: 12px;
      font-weight: 700;
    }
    .info-section ul {
      margin-left: 20px;
      margin-top: 8px;
    }
    .info-section li {
      margin-bottom: 4px;
    }
    @media print { 
      body { padding: 20px; font-size: 12px; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>MEET REPORT</h1>
    <div class="subtitle">${data.meetName || 'Team Performance Report'}</div>
    <div class="subtitle">${formatDate(data.dateRange.start, { month: 'long', day: 'numeric' })} - ${formatDate(data.dateRange.end, { month: 'long', day: 'numeric', year: 'numeric' })}</div>
  </div>

  ${enabledSections.some(s => ['overview-stats', 'bt-percentage'].includes(s.id)) ? `
  <div class="section">
    <div class="highlight-stat">
      Team Performance <strong>${data.btPercent}%</strong> Best times! (${data.bestTimeCount} out of ${data.totalSwims})
    </div>
    ${data.firstTimeCount > 0 ? `<div class="highlight-stat"><strong>${data.firstTimeCount}</strong> Established First Times!</div>` : ''}
  </div>
  ` : ''}

  ${data.recordsBroken && data.recordsBroken.length > 0 ? `
  <div class="section">
    <div class="section-title">Team Records Broken:</div>
    <ul style="list-style: none; padding: 0; margin: 0;">
      ${data.recordsBroken.map(record => `
        <li class="swimmer-entry">
          <strong class="swimmer-name">${record.swimmer_name}:</strong> ${abbrevEvent(record.event)} - ${record.time_display}
          ${record.previous_time_display ? ` <span style="color: #64748b;">(Old: ${record.previous_time_display})</span>` : ''}
        </li>
      `).join('')}
    </ul>
  </div>
  ` : ''}

  ${enabledSections.some(s => s.id === 'new-standards') && swimmersList.length > 0 ? `
  <div class="section">
    <div class="section-title">New Motivational Time Standards:</div>
    <ul style="list-style: none; padding: 0; margin: 0;">
      ${swimmersList.map(swimmer => {
        // Group standards by level for this swimmer
        const byLevel = {};
        swimmer.standards.forEach(std => {
          if (!byLevel[std.level]) byLevel[std.level] = [];
          byLevel[std.level].push(std.event);
        });
        
        // Build the standards text - format: "AA 200 Free A 100 Fly 200 IM"
        const standardsText = ['Nationals', 'US JR', 'Winter JR', 'Futures', 'NCSA JR', 'Sectionals', 'VSI SC', 'VSI AG', 'AAAA', 'AAA', 'AA', 'A', 'BB', 'B']
          .filter(level => byLevel[level])
          .map(level => `<strong>${level}</strong> ${byLevel[level].join(' ')}`)
          .join(' ');
        
        return `
          <li class="swimmer-entry">
            <strong class="swimmer-name">${swimmer.name}:</strong> ${standardsText || ''}
          </li>
        `;
      }).join('')}
    </ul>
  </div>
  ` : (enabledSections.some(s => s.id === 'new-standards') ? `
  <div class="section">
    <div class="section-title">New Motivational Time Standards:</div>
    <div class="swimmer-entry" style="font-style: italic; color: #666;">No new motivational time standards achieved during this meet.</div>
  </div>
  ` : '')}

  ${enabledSections.some(s => s.id === 'meet-cuts') && Object.keys(meetCutsProcessed).length > 0 ? `
  <div class="section">
    <div class="section-title">New Meet Cuts</div>
    ${Object.entries(meetCutsProcessed).map(([meetName, swimmersList]) => `
      <div style="margin-bottom: 28px;">
        <h3 style="font-weight: 700; font-size: 17px; margin-bottom: 14px; color: #1e293b;">
          ${meetName}
        </h3>
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${swimmersList.map(s => `
            <li class="swimmer-entry">
              <strong class="swimmer-name">${s.name}:</strong> ${s.events.join(' ')}
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <div class="info-section">
    <h3>Motivational Times:</h3>
    <p>
      USA Swimming uses what is known as time standards or motivational times. This is done to motivate and create goals for swimmers as well as being able to qualify meets. Some meets, for example, may only be for swimmers who have A and above times and conversely some meets may only be for C/B/BB swimmers. Most meets will be open to all but the meet invite will indicate if there are any restrictions on who can attend.
    </p>
    <p style="margin-top:12px;">
      The time standards are determined by USA swimming based on percentages and you can determine where your swimmer stands compared to other swimmers based on the time standard achieved:
    </p>
    <ul>
      <li><strong>C</strong> - All swimmers below a B standard</li>
      <li><strong>B</strong> - Top 55% of swimmers</li>
      <li><strong>BB</strong> - Top 35% of swimmers</li>
      <li><strong>A</strong> - Top 15% of swimmers</li>
      <li><strong>AA</strong> - Top 8% of swimmers</li>
      <li><strong>AAA</strong> - Top 6% of swimmers</li>
      <li><strong>AAAA</strong> - Top 2% of swimmers</li>
    </ul>
  </div>

  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function MeetReportGenerator({ onBack }) {
  const [step, setStep] = useState('select');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [availableGroups, setAvailableGroups] = useState([]);
  const [selectedAgeGroups, setSelectedAgeGroups] = useState([]);
  const [reportFormat, setReportFormat] = useState('modern'); // 'modern' or 'classic'
  const [meetName, setMeetName] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [reportData, setReportData] = useState(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // Layout management
  const [layouts, setLayouts] = useState([]);
  const [selectedLayout, setSelectedLayout] = useState(null);
  const [showLayoutManager, setShowLayoutManager] = useState(false);
  const [editingLayout, setEditingLayout] = useState(null);

  // Available age groups for filtering
  const AGE_GROUPS = [
    '8 & Under',
    '9-10',
    '11-12',
    '13-14',
    '15-18',
    '19 & Over'
  ];

  useEffect(() => {
    const loadGroups = async () => {
      const { data } = await supabase.from('swimmers').select('group_name');
      if (data) {
        const unique = [...new Set(data.map(d => d.group_name).filter(Boolean))].sort();
        setAvailableGroups(unique);
      }
    };
    loadGroups();
    loadLayouts();

    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    setDateRange({
      start: lastWeek.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    });
  }, []);

  const loadLayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('report_layouts')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLayouts(data || []);
      
      // Select default layout if none selected
      if (!selectedLayout && data && data.length > 0) {
        const defaultLayout = data.find(l => l.is_default) || data[0];
        setSelectedLayout(defaultLayout);
      }
    } catch (error) {
      console.error('Error loading layouts:', error);
    }
  };

  const handleDeleteLayout = async (layoutId) => {
    if (!confirm('Are you sure you want to delete this layout?')) return;
    
    try {
      const { error } = await supabase
        .from('report_layouts')
        .delete()
        .eq('id', layoutId);
      
      if (error) throw error;
      
      // Reload layouts
      await loadLayouts();
      
      // Clear selection if deleted layout was selected
      if (selectedLayout?.id === layoutId) {
        setSelectedLayout(null);
      }
    } catch (error) {
      console.error('Error deleting layout:', error);
      alert('Failed to delete layout: ' + error.message);
    }
  };

  const handleEditLayout = (layout) => {
    setEditingLayout(layout);
    setShowLayoutManager(false);
  };

  const handleCreateNewLayout = () => {
    setEditingLayout({ 
      name: '', 
      description: '', 
      layout_config: getDefaultLayout(reportFormat) 
    });
    setShowLayoutManager(false);
  };

  const handleExportPDF = async () => {
    if (!reportData) return;
    setIsExportingPDF(true);
    try {
      const printWindow = window.open('', '_blank');
      const content = reportFormat === 'classic' 
        ? generateClassicPDFContent(reportData)
        : generatePDFContent(reportData);
      printWindow.document.write(content);
      printWindow.document.close();
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Error exporting PDF. Please try again.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // ============================================
  // ANALYSIS LOGIC (FIXED: Deduplication)
  // ============================================

  const analyzeMeetResults = (meetResults, historicalBests, swimmerMap, allStandards) => {
    // Separate motivational standards from meet cuts
    const motivationalLevels = ['B', 'BB', 'A', 'AA', 'AAA', 'AAAA'];
    const standards = allStandards.filter(s => motivationalLevels.includes(s.name));
    const meetCutStandards = allStandards.filter(s => !motivationalLevels.includes(s.name));
    const totalSwims = meetResults.length;
    let bestTimeCount = 0;
    let firstTimeCount = 0;
    const timeDrops = [];
    const strokeStats = {};
    const groupStats = {};
    const swimmerPerformance = {};

    // STEP 1: Build meet bests per swimmer/event (ONLY fastest time)
    const meetBests = {};
    meetResults.forEach(result => {
      const swimmer = swimmerMap[result.swimmer_id];
      if (!swimmer) return;
      const normalized = normalizeEvent(result.event);
      if (!normalized) return;
      const currentSeconds = timeToSeconds(result.time);
      if (currentSeconds >= 999999) return;

      if (!meetBests[result.swimmer_id]) meetBests[result.swimmer_id] = {};
      if (!meetBests[result.swimmer_id][normalized] || currentSeconds < meetBests[result.swimmer_id][normalized].seconds) {
        meetBests[result.swimmer_id][normalized] = { time: result.time, seconds: currentSeconds, result };
      }
    });

    // Count all swims for stroke/group stats
    meetResults.forEach(result => {
      const swimmer = swimmerMap[result.swimmer_id];
      if (!swimmer) return;
      const normalized = normalizeEvent(result.event);
      if (!normalized) return;
      const currentSeconds = timeToSeconds(result.time);
      if (currentSeconds >= 999999) return;
      const { stroke } = parseEvent(result.event);

      if (!strokeStats[stroke]) strokeStats[stroke] = { swims: 0, bestTimes: 0, totalDrop: 0, drops: [] };
      strokeStats[stroke].swims++;

      const group = swimmer.group_name || 'Ungrouped';
      if (!groupStats[group]) groupStats[group] = { swimmers: new Set(), swims: 0, bestTimes: 0, totalDrop: 0 };
      groupStats[group].swimmers.add(result.swimmer_id);
      groupStats[group].swims++;
    });

    // STEP 2: Process using ONLY meet bests (deduped)
    const newStandards = [];
    const processedStandards = new Set();

    Object.entries(meetBests).forEach(([swimmerId, events]) => {
      const swimmer = swimmerMap[swimmerId];
      if (!swimmer) return;

      if (!swimmerPerformance[swimmerId]) {
        swimmerPerformance[swimmerId] = {
          swimmer, swims: 0, bestTimes: 0, totalDrop: 0, biggestDrop: 0, biggestDropEvent: '', newStandards: []
        };
      }

      Object.entries(events).forEach(([normalized, meetBest]) => {
        const { dist, stroke } = parseEvent(normalized);
        const currentSeconds = meetBest.seconds;
        const historicalBest = historicalBests[swimmerId]?.[normalized];

        swimmerPerformance[swimmerId].swims++;

        if (!historicalBest) {
          firstTimeCount++;
        } else if (currentSeconds < historicalBest.seconds) {
          bestTimeCount++;
          swimmerPerformance[swimmerId].bestTimes++;
          const drop = historicalBest.seconds - currentSeconds;
          swimmerPerformance[swimmerId].totalDrop += drop;

          if (drop > swimmerPerformance[swimmerId].biggestDrop) {
            swimmerPerformance[swimmerId].biggestDrop = drop;
            swimmerPerformance[swimmerId].biggestDropEvent = normalized;
          }

          timeDrops.push({
            swimmer, event: normalized, oldTime: historicalBest.time, oldSeconds: historicalBest.seconds,
            newTime: meetBest.time, newSeconds: currentSeconds, drop, dropPercent: (drop / historicalBest.seconds) * 100
          });

          if (strokeStats[stroke]) {
            strokeStats[stroke].bestTimes++;
            strokeStats[stroke].totalDrop += drop;
            strokeStats[stroke].drops.push(drop);
          }
          const group = swimmer.group_name || 'Ungrouped';
          if (groupStats[group]) {
            groupStats[group].bestTimes++;
            groupStats[group].totalDrop += drop;
          }
        }

        // Check standards (ONLY ONCE per swimmer/event/standard)
        if (standards && swimmer) {
          const swimmerAge = parseInt(swimmer.age) || 0;
          const swimmerGender = (swimmer.gender || 'M').trim().toUpperCase();

          const relevantStandards = standards.filter(std => {
            const stdGender = std.gender.trim().toUpperCase();
            const genderMatch = stdGender === swimmerGender;
            const ageMatch = (std.age_max === 99) || (swimmerAge >= std.age_min && swimmerAge <= std.age_max);
            const { dist: stdDist, stroke: stdStroke } = parseEvent(std.event);
            const eventMatch = dist === stdDist && stroke.toLowerCase() === stdStroke.toLowerCase();
            return genderMatch && ageMatch && eventMatch;
          });

          relevantStandards.forEach(std => {
            const standardKey = `${swimmerId}-${normalized}-${std.name}`;
            if (processedStandards.has(standardKey)) return;

            const achievedNow = currentSeconds <= std.time_seconds;
            const achievedBefore = historicalBest && historicalBest.seconds <= std.time_seconds;

            if (achievedNow && !achievedBefore) {
              processedStandards.add(standardKey);
              newStandards.push({
                swimmer, event: normalized, standard: std.name, time: meetBest.time,
                seconds: currentSeconds, cutTime: secondsToTime(std.time_seconds)
              });
              swimmerPerformance[swimmerId].newStandards.push({ event: normalized, standard: std.name });
            }
          });
        }
      });
    });

    timeDrops.sort((a, b) => b.drop - a.drop);

    Object.keys(strokeStats).forEach(stroke => {
      const stats = strokeStats[stroke];
      stats.btPercent = stats.swims > 0 ? Math.round((stats.bestTimes / stats.swims) * 100) : 0;
      stats.avgDrop = stats.drops.length > 0 ? stats.drops.reduce((a, b) => a + b, 0) / stats.drops.length : 0;
    });

    const groupStatsArray = Object.entries(groupStats).map(([name, stats]) => ({
      name, swimmerCount: stats.swimmers.size, swims: stats.swims, bestTimes: stats.bestTimes,
      btPercent: stats.swims > 0 ? Math.round((stats.bestTimes / stats.swims) * 100) : 0,
      avgDrop: stats.bestTimes > 0 ? stats.totalDrop / stats.bestTimes : 0
    }));

    // Group standards by level, keeping only highest standard per swimmer/event
    const standardsByLevel = {};
    const levelOrder = { 
      'Nationals': 14, 'US JR': 13, 'Winter JR': 12, 'Futures': 11, 'NCSA JR': 10, 
      'Sectionals': 9, 'VSI SC': 8, 'VSI AG': 7, 
      'AAAA': 6, 'AAA': 5, 'AA': 4, 'A': 3, 'BB': 2, 'B': 1 
    };
    const swimmerEventStandards = {}; // Track highest standard per swimmer/event
    
    newStandards.forEach(ns => {
      // Extract level from standard name (e.g., "Boys 11-12 50 Freestyle BB" -> "BB")
      const standardParts = ns.standard.split(' ');
      const level = standardParts[standardParts.length - 1];
      
      const key = `${ns.swimmer.id}-${ns.event}`;
      const currentLevel = levelOrder[level] || 0;
      const existing = swimmerEventStandards[key];
      
      // Only keep the highest standard for each swimmer/event combination
      if (!existing || currentLevel > existing.order) {
        swimmerEventStandards[key] = {
          ...ns,
          level,
          order: currentLevel
        };
      }
    });
    
    // Group by level and sort swimmers alphabetically by last name
    Object.values(swimmerEventStandards).forEach(ns => {
      if (!standardsByLevel[ns.level]) standardsByLevel[ns.level] = [];
      standardsByLevel[ns.level].push(ns);
    });
    
    // Sort swimmers within each level by last name
    const getLastName = (fullName) => {
      const parts = fullName.trim().split(' ');
      return parts[parts.length - 1];
    };
    
    Object.keys(standardsByLevel).forEach(level => {
      standardsByLevel[level].sort((a, b) => 
        getLastName(a.swimmer.name).localeCompare(getLastName(b.swimmer.name))
      );
    });

    const biggestMovers = Object.values(swimmerPerformance)
      .filter(p => p.totalDrop > 0)
      .sort((a, b) => b.totalDrop - a.totalDrop)
      .slice(0, 10);

    // Track new meet cuts (championship qualifying times)
    const newMeetCuts = [];
    const processedMeetCuts = new Set();
    
    Object.entries(meetBests).forEach(([swimmerId, events]) => {
      const swimmer = swimmerMap[swimmerId];
      if (!swimmer) return;
      
      Object.entries(events).forEach(([normalized, meetBest]) => {
        const currentSeconds = meetBest.seconds;
        const historicalBest = historicalBests[swimmerId]?.[normalized];
        
        // Find relevant meet cut standards
        const swimmerAge = parseInt(swimmer.age) || 0;
        const swimmerGender = (swimmer.gender || 'M').trim().toUpperCase();
        
        const relevantCuts = meetCutStandards.filter(std => {
          const stdGender = (std.gender || 'M').trim().toUpperCase();
          const genderMatch = stdGender === swimmerGender;
          const ageMatch = swimmerAge >= std.age_min && swimmerAge <= std.age_max;
          const eventMatch = normalizeEvent(std.event) === normalized;
          return genderMatch && ageMatch && eventMatch;
        });
        
        relevantCuts.forEach(cut => {
          const cutKey = `${swimmerId}-${normalized}-${cut.name}`;
          if (processedMeetCuts.has(cutKey)) return;
          
          const achievedNow = currentSeconds <= cut.time_seconds;
          const achievedBefore = historicalBest && historicalBest.seconds <= cut.time_seconds;
          
          if (achievedNow && !achievedBefore) {
            processedMeetCuts.add(cutKey);
            newMeetCuts.push({
              swimmer,
              event: normalized,
              meetName: cut.name,
              time: meetBest.time,
              cutTime: secondsToTime(cut.time_seconds)
            });
          }
        });
      });
    });
    
    // Group meet cuts by meet name
    const meetCutsByMeet = {};
    newMeetCuts.forEach(cut => {
      if (!meetCutsByMeet[cut.meetName]) {
        meetCutsByMeet[cut.meetName] = [];
      }
      meetCutsByMeet[cut.meetName].push(cut);
    });

    return {
      totalSwims, bestTimeCount, firstTimeCount,
      btPercent: totalSwims > 0 ? Math.round((bestTimeCount / totalSwims) * 100) : 0,
      timeDrops, newStandards, standardsByLevel, strokeStats, groupStats: groupStatsArray,
      swimmerPerformance, biggestMovers, topTimeDrops: timeDrops.slice(0, 5),
      topPercentDrops: [...timeDrops].sort((a, b) => b.dropPercent - a.dropPercent).slice(0, 5),
      newMeetCuts, meetCutsByMeet
    };
  };

  // ============================================
  // GENERATE REPORT
  // ============================================

  const generateReport = async () => {
    if (!dateRange.start || !dateRange.end) {
      alert('Please select a date range');
      return;
    }

    setStep('loading');
    setLoadingProgress(0);

    try {
      setLoadingMessage('Loading swimmers...');
      setLoadingProgress(10);
      const { data: swimmers } = await supabase.from('swimmers').select('*');
      
      // Filter by group if specified
      let filteredSwimmers = selectedGroups.length > 0
        ? swimmers.filter(s => selectedGroups.includes(s.group_name))
        : swimmers;
      
      // Filter by age group if specified
      if (selectedAgeGroups.length > 0) {
        filteredSwimmers = filteredSwimmers.filter(s => {
          const ageGroup = getAgeGroup(s.age);
          return selectedAgeGroups.includes(ageGroup);
        });
      }
      
      const swimmerIds = filteredSwimmers.map(s => s.id);
      const swimmerMap = filteredSwimmers.reduce((acc, s) => { acc[s.id] = s; return acc; }, {});

      setLoadingMessage('Loading meet results...');
      setLoadingProgress(20);
      
      const { data: meetResults } = await supabase
        .from('results')
        .select('*')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .in('swimmer_id', swimmerIds);

      if (!meetResults || meetResults.length === 0) {
        alert('No results found for the selected date range and filters.');
        setStep('select');
        return;
      }

      setLoadingMessage('Loading historical times...');
      setLoadingProgress(40);
      
      let allHistoricalResults = [];
      let page = 0;
      let keepFetching = true;

      while (keepFetching) {
        const { data: batch, error } = await supabase
          .from('results')
          .select('swimmer_id, event, time, date')
          .lt('date', dateRange.start)
          .in('swimmer_id', swimmerIds)
          .order('id', { ascending: true })
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (error || !batch || batch.length === 0) keepFetching = false;
        else {
          allHistoricalResults = [...allHistoricalResults, ...batch];
          page++;
          if (allHistoricalResults.length > 100000) keepFetching = false;
        }
      }

      setLoadingMessage('Analyzing personal bests...');
      setLoadingProgress(50);
      
      const historicalBests = {};
      allHistoricalResults.forEach(r => {
        const normalized = normalizeEvent(r.event);
        if (!normalized) return;
        const seconds = timeToSeconds(r.time);
        if (seconds >= 999999) return;

        if (!historicalBests[r.swimmer_id]) historicalBests[r.swimmer_id] = {};
        if (!historicalBests[r.swimmer_id][normalized] || seconds < historicalBests[r.swimmer_id][normalized].seconds) {
          historicalBests[r.swimmer_id][normalized] = { time: r.time, seconds };
        }
      });

      setLoadingMessage('Loading time standards...');
      setLoadingProgress(60);
      
      const { data: standards } = await supabase.from('time_standards').select('*');

      setLoadingMessage('Analyzing meet performance...');
      setLoadingProgress(70);

      const analysis = analyzeMeetResults(meetResults, historicalBests, swimmerMap, standards);

      setLoadingMessage('Checking for team records...');
      setLoadingProgress(80);
      
      // Fetch team records broken during this meet
      const { data: recordsData } = await supabase
        .from('record_history')
        .select('*')
        .gte('date', dateRange.start)
        .lte('date', dateRange.end)
        .order('broken_at', { ascending: false });
      
      const recordsBroken = recordsData || [];

      setLoadingMessage('Generating report...');
      setLoadingProgress(90);

      // Get active layout or default
      const activeLayout = selectedLayout?.layout_config || getDefaultLayout(reportFormat);
      
      setReportData({
        meetName: meetName || `Meet Report`,
        dateRange,
        swimmers: filteredSwimmers,
        swimmerMap,
        layout: activeLayout,
        recordsBroken,
        ...analysis
      });

      setLoadingProgress(100);
      setTimeout(() => setStep('report'), 500);

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report: ' + error.message);
      setStep('select');
    }
  };

  // ============================================
  // RENDER: LAYOUT EDITOR
  // ============================================

  if (editingLayout !== null) {
    return (
      <ReportLayoutEditor
        initialLayout={editingLayout.id ? editingLayout : null}
        reportFormat={reportFormat}
        onBack={() => {
          setEditingLayout(null);
          loadLayouts();
        }}
      />
    );
  }

  // ============================================
  // RENDER: SELECTION SCREEN
  // ============================================

  if (step === 'select') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={onBack} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="text-indigo-600" /> Meet Report Generator
            </h2>
            <p className="text-slate-500">Generate a comprehensive post-meet report</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Meet Name (Optional)</label>
            <input
              type="text"
              value={meetName}
              onChange={(e) => setMeetName(e.target.value)}
              placeholder="e.g., WAC Startup Classic"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Calendar size={14} className="inline mr-1" /> Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                <Calendar size={14} className="inline mr-1" /> End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Users size={14} className="inline mr-1" /> Filter by Group (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {availableGroups.map(group => (
                <button
                  key={group}
                  onClick={() => setSelectedGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group])}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedGroups.includes(group) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {group}
                </button>
              ))}
              {selectedGroups.length > 0 && (
                <button onClick={() => setSelectedGroups([])} className="px-3 py-1.5 rounded-full text-sm font-medium text-rose-600 hover:bg-rose-50">
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Users size={14} className="inline mr-1" /> Filter by Age Group (Optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map(ageGroup => (
                <button
                  key={ageGroup}
                  onClick={() => setSelectedAgeGroups(prev => prev.includes(ageGroup) ? prev.filter(g => g !== ageGroup) : [...prev, ageGroup])}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedAgeGroups.includes(ageGroup) ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {ageGroup}
                </button>
              ))}
              {selectedAgeGroups.length > 0 && (
                <button onClick={() => setSelectedAgeGroups([])} className="px-3 py-1.5 rounded-full text-sm font-medium text-rose-600 hover:bg-rose-50">
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <FileText size={14} className="inline mr-1" /> Report Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setReportFormat('modern')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  reportFormat === 'modern' 
                    ? 'border-indigo-600 bg-indigo-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-slate-800 mb-1">Modern Format</div>
                <div className="text-xs text-slate-500">Styled report with charts and detailed analytics</div>
              </button>
              <button
                onClick={() => setReportFormat('classic')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  reportFormat === 'classic' 
                    ? 'border-indigo-600 bg-indigo-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold text-slate-800 mb-1">Classic Format</div>
                <div className="text-xs text-slate-500">Simple text format with new standards by swimmer</div>
              </button>
            </div>
          </div>

          {/* Layout Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">
                <LayoutTemplate size={14} className="inline mr-1" /> Report Layout
              </label>
              <button
                onClick={handleCreateNewLayout}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <Plus size={14} />
                New Layout
              </button>
            </div>
            
            {layouts.length === 0 ? (
              <div className="p-4 border-2 border-dashed border-slate-200 rounded-xl text-center">
                <LayoutTemplate size={24} className="mx-auto text-slate-400 mb-2" />
                <p className="text-sm text-slate-500 mb-2">No custom layouts yet</p>
                <button
                  onClick={handleCreateNewLayout}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Create your first layout
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedLayout(null)}
                  className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                    !selectedLayout 
                      ? 'border-indigo-600 bg-indigo-50' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="font-semibold text-slate-800 text-sm">Default Layout</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Standard report with all sections
                  </div>
                </button>
                
                {layouts.map(layout => (
                  <div key={layout.id} className="relative group">
                    <button
                      onClick={() => setSelectedLayout(layout)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                        selectedLayout?.id === layout.id
                          ? 'border-indigo-600 bg-indigo-50' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="font-semibold text-slate-800 text-sm">{layout.name}</div>
                      {layout.description && (
                        <div className="text-xs text-slate-500 mt-1">{layout.description}</div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">
                        {layout.layout_config?.sections?.length || 0} sections
                      </div>
                    </button>
                    
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditLayout(layout);
                        }}
                        className="p-1.5 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-indigo-600"
                        title="Edit layout"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteLayout(layout.id);
                        }}
                        className="p-1.5 bg-white hover:bg-red-50 border border-slate-200 rounded-lg text-red-600"
                        title="Delete layout"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={generateReport}
            disabled={!dateRange.start || !dateRange.end}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
          >
            <Sparkles size={20} />
            Generate Report
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: LOADING SCREEN
  // ============================================

  if (step === 'loading') {
    return (
      <div className="max-w-md mx-auto text-center py-20">
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
          <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-indigo-600">{loadingProgress}%</span>
          </div>
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Generating Report</h3>
        <p className="text-slate-500">{loadingMessage}</p>
        <div className="mt-6 w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" style={{ width: `${loadingProgress}%` }}></div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: REPORT VIEW
  // ============================================

  if (step === 'report' && reportData) {
    return (
      <DynamicMeetReport 
        reportData={reportData}
        onBack={() => setStep('select')}
        onExportPDF={handleExportPDF}
        isExportingPDF={isExportingPDF}
      />
    );
  }

  // ============================================
  // DEFAULT: No matching step
  // ============================================

  return null;
}

// Removed old hardcoded report JSX - the following comment marks where old code was
/* OLD REPORT CODE REMOVED - Now using DynamicMeetReport component
function oldReportCode() {
  // This function is never called, just preserves the old code structure for reference
  const removed = () => (
          <ExpandableSection title="Biggest Time Drops" icon={Flame} count={null}>
            <div className="space-y-3">
              {topTimeDrops.map((drop, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-300'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{drop.swimmer.name}</p>
                    <p className="text-sm text-slate-500">{drop.event}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm text-slate-500">{drop.oldTime} → {drop.newTime}</p>
                    <p className="font-bold text-emerald-600">-{drop.drop.toFixed(2)}s</p>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {newStandards.length > 0 && (
          <ExpandableSection title="New Time Standards Achieved" icon={Trophy} count={newStandards.length}>
            <div className="space-y-4">
              {STANDARD_HIERARCHY.filter(level => standardsByLevel[level]?.length > 0).map(level => (
                <div key={level}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${STANDARD_COLORS[level]?.bg || 'bg-slate-400'}`}>{level}</span>
                    <span className="text-sm text-slate-500">{standardsByLevel[level].length} achieved</span>
                  </div>
                  <div className="grid gap-2">
                    {standardsByLevel[level].map((ns, idx) => (
                      <div key={idx} className={`p-3 rounded-xl border ${STANDARD_COLORS[level]?.light || 'bg-slate-50'} ${STANDARD_COLORS[level]?.border || 'border-slate-200'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-800">{ns.swimmer.name}</p>
                            <p className="text-sm text-slate-500">{ns.event}</p>
                          </div>
                          <p className="font-mono font-bold text-slate-700">{ns.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        <ExpandableSection title="Performance by Stroke" icon={Activity}>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strokeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip formatter={(value, name) => [name === 'Best Time %' ? `${value}%` : value, name]} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="Best Time %" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {Object.entries(strokeStats).map(([stroke, stats]) => (
                <div key={stroke} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="font-semibold text-slate-800">{stroke}</p>
                    <p className="text-sm text-slate-500">{stats.swims} swims</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{stats.btPercent}% BT</p>
                    {stats.avgDrop > 0 && <p className="text-sm text-slate-500">Avg: -{stats.avgDrop.toFixed(2)}s</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ExpandableSection>

        {groupStats.length > 0 && (
          <ExpandableSection title="Performance by Group" icon={Users}>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={groupChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(value, name) => [name === 'Best Time %' ? `${value}%` : value, name]} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                    <Bar dataKey="Best Time %" radius={[4, 4, 0, 0]}>
                      {groupChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {groupStats.map((group, idx) => (
                  <div key={group.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}></div>
                      <div>
                        <p className="font-semibold text-slate-800">{group.name}</p>
                        <p className="text-sm text-slate-500">{group.swimmerCount} swimmers • {group.swims} swims</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{group.btPercent}% BT</p>
                      {group.avgDrop > 0 && <p className="text-sm text-slate-500">Avg: -{group.avgDrop.toFixed(2)}s</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ExpandableSection>
        )}

        {biggestMovers.length > 0 && (
          <ExpandableSection title="Biggest Movers (Total Time Dropped)" icon={Medal} count={biggestMovers.length}>
            <div className="space-y-2">
              {biggestMovers.map((mover, idx) => (
                <div key={mover.swimmer.id} className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-700' : 'bg-slate-300'}`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{mover.swimmer.name}</p>
                    <p className="text-sm text-slate-500">{mover.bestTimes} best time{mover.bestTimes !== 1 ? 's' : ''} • Biggest: {mover.biggestDropEvent} (-{mover.biggestDrop.toFixed(2)}s)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">-{mover.totalDrop.toFixed(2)}s</p>
                    <p className="text-xs text-slate-500">total</p>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>
        )}

        {standardsPieData.length > 0 && (
          <ExpandableSection title="Standards Distribution" icon={Target}>
            <div className="flex items-center justify-center h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={standardsPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {standardsPieData.map((entry, index) => {
                      const colors = { 
                        'Nationals': '#f59e0b', 'US JR': '#7c3aed', 'Winter JR': '#0284c7', 'Futures': '#059669', 
                        'NCSA JR': '#f97316', 'Sectionals': '#4f46e5', 'VSI SC': '#0891b2', 'VSI AG': '#14b8a6',
                        'AAAA': '#f43f5e', 'AAA': '#a855f7', 'AA': '#3b82f6', 'A': '#eab308', 'BB': '#94a3b8', 'B': '#d97706' 
                      };
                      return <Cell key={`cell-${index}`} fill={colors[entry.name] || CHART_COLORS[index]} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </ExpandableSection>
        )}

        <div className="text-center text-sm text-slate-400 pt-8 border-t">
          <p>Generated by StormTracker • {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    );
  );
} // End of oldReportCode function
*/ // End of removed old code comment
