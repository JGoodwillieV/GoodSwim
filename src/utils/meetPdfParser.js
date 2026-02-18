// src/utils/meetPdfParser.js
// Utilities for parsing swim meet PDFs (Meet Info, Timeline, Heat Sheets)
// Uses pdf.js for text extraction, Gemini AI (via edge functions) for parsing

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { supabase } from '../supabase';

// Set worker source using Vite's ?url import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

// ============================================
// SHARED HELPERS
// ============================================

/**
 * Extract all text from a PDF file
 */
export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  const pages = [];
  
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    pages.push(pageText);
    fullText += pageText + '\n';
  }
  
  return { fullText, pages, numPages: pdf.numPages };
}

/**
 * Call a Supabase edge function and return parsed data
 */
async function callEdgeFunction(functionName, text) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: { text }
  });

  if (error) {
    throw new Error(error.message || `Failed to call ${functionName}`);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data;
}

// ============================================
// MEET INFO PDF PARSER (AI-powered)
// ============================================

/**
 * Parse a meet info/announcement PDF using AI
 * Extracts: name, dates, location, fees, event limits, etc.
 */
export async function parseMeetInfoPDF(file) {
  const { fullText } = await extractTextFromPDF(file);

  const parsed = await callEdgeFunction('parse-meet-info', fullText);

  // Convert date strings to Date objects for backward compatibility
  const result = {
    name: parsed.name || null,
    startDate: parsed.startDate ? new Date(parsed.startDate + 'T00:00:00') : null,
    endDate: parsed.endDate ? new Date(parsed.endDate + 'T00:00:00') : null,
    sanctionNumber: parsed.sanctionNumber || null,
    locationName: parsed.locationName || null,
    locationAddress: parsed.locationAddress || null,
    hostTeam: parsed.hostTeam || null,
    meetDirector: {
      name: parsed.meetDirector?.name || null,
      email: parsed.meetDirector?.email || null,
      phone: parsed.meetDirector?.phone || null
    },
    entryDeadline: parsed.entryDeadline ? new Date(parsed.entryDeadline + 'T00:00:00') : null,
    eventsPerDayLimit: parsed.eventsPerDayLimit || 3,
    maxEventsTotal: null,
    fees: {
      individual: parsed.fees?.individual || null,
      relay: parsed.fees?.relay || null,
      surcharge: parsed.fees?.surcharge || null
    },
    meetType: parsed.meetType || 'timed_finals',
    course: parsed.course || 'SCY',
    ageUpDate: null,
    warmupTimes: {},
    events: parsed.events || [],
    rawText: fullText
  };

  console.log('AI parsed meet info:', result.name, '|', result.events?.length, 'events');
  return result;
}

// ============================================
// TIMELINE PDF PARSER (AI-powered)
// ============================================

/**
 * Parse a Hy-Tek timeline/session report PDF using AI
 * Extracts: events with estimated start times, entry counts, heat counts
 */
export async function parseTimelinePDF(file) {
  const { fullText } = await extractTextFromPDF(file);

  const parsed = await callEdgeFunction('parse-timeline', fullText);

  console.log(`AI parsed timeline: ${parsed.sessions?.length || 0} sessions, ${parsed.events?.length || 0} events`);
  return {
    sessions: parsed.sessions || [],
    events: parsed.events || []
  };
}

// ============================================
// HEAT SHEET PDF PARSER (AI-powered, multi-file)
// ============================================

/**
 * Parse one or more Hy-Tek heat sheet/meet program PDFs using AI
 * Accepts a single File or an array of Files
 * Extracts: swimmer entries with heat, lane, seed time
 */
export async function parseHeatSheetPDF(filesOrFile) {
  const files = Array.isArray(filesOrFile) ? filesOrFile : [filesOrFile];

  // Extract text from all PDFs and concatenate with separators
  const textParts = [];
  for (const file of files) {
    const { fullText } = await extractTextFromPDF(file);
    textParts.push(fullText);
  }
  const combinedText = textParts.join('\n\n=== FILE SEPARATOR ===\n\n');

  console.log(`Sending ${files.length} heat sheet PDF(s) to AI (${combinedText.length} chars)`);

  const parsed = await callEdgeFunction('parse-heat-sheets', combinedText);

  console.log(`AI parsed heat sheets: ${parsed.entries?.length || 0} entries`);
  return {
    meetName: parsed.meetName || null,
    meetDates: parsed.meetDates || null,
    sessionName: null,
    entries: parsed.entries || []
  };
}

// ============================================
// SWIMMER MATCHING (client-side, unchanged)
// ============================================

/**
 * Match heat sheet entries to swimmers in database
 * Returns entries with matched swimmer_id where found
 */
export function matchHeatSheetEntries(entries, dbSwimmers, teamCode) {
  console.log(`Matching ${entries.length} entries against ${dbSwimmers.length} swimmers, team: ${teamCode}`);
  
  return entries.map(entry => {
    if (teamCode && !entry.teamCode.toUpperCase().startsWith(teamCode.toUpperCase())) {
      return { ...entry, matched: false, matchReason: 'different_team' };
    }
    
    const entryNameParts = entry.swimmerName.split(',').map(p => p.trim());
    const lastName = entryNameParts[0]?.toLowerCase() || '';
    const firstNamePart = entryNameParts[1]?.trim() || '';
    const firstName = firstNamePart.split(/\s+/)[0]?.toLowerCase() || '';
    
    const match = dbSwimmers.find(swimmer => {
      const swimmerName = swimmer.name.toLowerCase();
      
      if (swimmerName.includes(firstName) && swimmerName.includes(lastName)) {
        return true;
      }
      
      const swimmerParts = swimmerName.split(/\s+/);
      const swimmerFirst = swimmerParts[0];
      const swimmerLast = swimmerParts[swimmerParts.length - 1];
      
      if (swimmerFirst === firstName && swimmerLast === lastName) {
        return true;
      }
      
      const firstInitial = firstName[0];
      if (swimmerLast === lastName && swimmerFirst.startsWith(firstInitial)) {
        return true;
      }
      
      return false;
    });
    
    if (match) {
      return {
        ...entry,
        matched: true,
        swimmer_id: match.id,
        matchedSwimmerName: match.name
      };
    }
    
    return { ...entry, matched: false, matchReason: 'no_match' };
  });
}

// ============================================
// EXPORTS
// ============================================

export default {
  extractTextFromPDF,
  parseMeetInfoPDF,
  parseTimelinePDF,
  parseHeatSheetPDF,
  matchHeatSheetEntries
};
