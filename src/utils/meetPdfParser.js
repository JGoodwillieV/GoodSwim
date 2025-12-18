// src/utils/meetPdfParser.js
// Utilities for parsing swim meet PDFs (Meet Info, Timeline, Heat Sheets)
// Uses pdf.js for PDF text extraction

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

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
 * Parse a date string in various formats
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Try common formats
  const formats = [
    // "December 4-7, 2025" or "November 14-16, 2025"
    /(\w+)\s+(\d{1,2})(?:-\d{1,2})?,?\s+(\d{4})/i,
    // "12/4/2025" or "11/14/2025"
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
    // "2025-12-04"
    /(\d{4})-(\d{2})-(\d{2})/
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // Month name format
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                          'july', 'august', 'september', 'october', 'november', 'december'];
        const monthIdx = monthNames.indexOf(match[1].toLowerCase());
        if (monthIdx >= 0) {
          return new Date(parseInt(match[3]), monthIdx, parseInt(match[2]));
        }
      } else if (format === formats[1]) {
        return new Date(parseInt(match[3]), parseInt(match[1]) - 1, parseInt(match[2]));
      } else if (format === formats[2]) {
        return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }
    }
  }
  
  // Fallback to Date.parse
  const parsed = Date.parse(dateStr);
  return isNaN(parsed) ? null : new Date(parsed);
}

/**
 * Parse date range from text like "December 4-7, 2025"
 */
function parseDateRange(dateStr) {
  if (!dateStr) return { start: null, end: null };
  
  // Match "Month Day-Day, Year" format
  const rangeMatch = dateStr.match(/(\w+)\s+(\d{1,2})-(\d{1,2}),?\s+(\d{4})/i);
  if (rangeMatch) {
    const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                       'july', 'august', 'september', 'october', 'november', 'december'];
    const monthIdx = monthNames.indexOf(rangeMatch[1].toLowerCase());
    if (monthIdx >= 0) {
      const year = parseInt(rangeMatch[4]);
      const startDay = parseInt(rangeMatch[2]);
      const endDay = parseInt(rangeMatch[3]);
      return {
        start: new Date(year, monthIdx, startDay),
        end: new Date(year, monthIdx, endDay)
      };
    }
  }
  
  // Single date
  const singleDate = parseDate(dateStr);
  return { start: singleDate, end: singleDate };
}

/**
 * Parse time string to seconds
 */
function parseTimeToSeconds(timeStr) {
  if (!timeStr) return null;
  const clean = timeStr.replace(/[^\d:.]/g, '');
  
  // Format: "1:23.45" or "23.45"
  if (clean.includes(':')) {
    const [mins, secs] = clean.split(':');
    return parseInt(mins) * 60 + parseFloat(secs);
  }
  return parseFloat(clean);
}

/**
 * Parse a time string like "9:00 AM" or "09:00" to a time string
 */
function parseTimeString(timeStr) {
  if (!timeStr) return null;
  
  // Handle "9:00 AM" format
  const ampmMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1]);
    const mins = ampmMatch[2];
    const period = ampmMatch[3]?.toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${mins}:00`;
  }
  
  return null;
}

/**
 * Extract money amount from text
 */
function parseMoney(text) {
  const match = text.match(/\$?([\d,]+\.?\d*)/);
  if (match) {
    return parseFloat(match[1].replace(',', ''));
  }
  return null;
}

// ============================================
// MEET INFO PDF PARSER
// ============================================

/**
 * Parse a meet info/announcement PDF
 * Extracts: name, dates, location, fees, event limits, etc.
 */
export async function parseMeetInfoPDF(file) {
  const { fullText, pages } = await extractTextFromPDF(file);
  const text = fullText;
  
  // Debug: Log first part of extracted text to console
  console.log('=== PDF TEXT EXTRACTED ===');
  console.log('First 2000 chars:', text.substring(0, 2000));
  console.log('=========================');
  
  const result = {
    name: null,
    startDate: null,
    endDate: null,
    sanctionNumber: null,
    locationName: null,
    locationAddress: null,
    hostTeam: null,
    meetDirector: {
      name: null,
      email: null,
      phone: null
    },
    entryDeadline: null,
    eventsPerDayLimit: 3,
    maxEventsTotal: null,
    fees: {
      individual: null,
      relay: null,
      surcharge: null
    },
    meetType: 'timed_finals',
    course: 'SCY',
    ageUpDate: null,
    warmupTimes: {},
    events: [],
    rawText: text
  };
  
  // ---- Extract Meet Name ----
  // The meet name is typically at the very start, before dates
  // Patterns: "The Duck Bowl Invitational", "RAYS NUTCRACKER CLASSIC", "2025 WAC Fall Classic"
  const namePatterns = [
    // "The Something Invitational/Classic/etc" before a date
    /(The\s+[\w\s]+?(?:Invitational|Classic|Meet|Championship|Open|Gauntlet|Bowl))\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)/i,
    // "RAYS NUTCRACKER CLASSIC Invitational" - ALL CAPS team name + meet name
    /([A-Z]+\s+[A-Z]+\s+(?:CLASSIC|INVITATIONAL|MEET|CHAMPIONSHIP))\s*(?:Invitational)?/,
    // "2025 Team Name Fall/Spring Classic" - Year + name
    /(\d{4}\s+[\w\s]+?(?:Fall|Spring|Summer|Winter)?\s*(?:Classic|Invitational|Meet|Championship))/i,
    // Generic pattern - text before date pattern
    /([\w\s]+?(?:Classic|Invitational|Meet|Championship|Gauntlet|Bowl))\s*(?:A\/BB\/B\/C)?\s*(?:January|February|March|April|May|June|July|August|September|October|November|December)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1].trim().length > 5) {
      result.name = match[1].trim().replace(/\s+/g, ' ');
      break;
    }
  }
  
  // ---- Extract Sanction Number ----
  // Formats: "VS-26-062", "VS26-035", "VS-26-043"
  const sanctionMatch = text.match(/SANCTION\s*NO\.?\s*:?\s*([A-Z]{2}-?\d{2}-?\d{2,3})/i);
  if (sanctionMatch) {
    result.sanctionNumber = sanctionMatch[1];
  }
  
  // ---- Extract Dates ----
  // Formats: "January 17-18, 2026", "December 4-7, 2025", "November 15-16, 2025"
  const dateMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\s*-\s*(\d{1,2}),?\s*(\d{4})/i);
  if (dateMatch) {
    const dates = parseDateRange(dateMatch[0]);
    result.startDate = dates.start;
    result.endDate = dates.end;
  }
  
  // ---- Extract Location ----
  const locationMatch = text.match(/LOCATION:?\s*[•\-]?\s*(.+?)(?=\s*(?:Phone|FACILITY|MEET))/is);
  if (locationMatch) {
    const locText = locationMatch[1].trim().replace(/\s+/g, ' ');
    // Try to split name and address
    const addressMatch = locText.match(/(.+?),\s*(\d+.+)/);
    if (addressMatch) {
      result.locationName = addressMatch[1].trim();
      result.locationAddress = addressMatch[2].trim();
    } else {
      result.locationName = locText;
    }
  }
  
  // ---- Extract Meet Director ----
  const directorSection = text.match(/MEET\s*DIRECTOR:?\s*([\s\S]*?)(?=ELIGIBILITY|DISABILITY|FORMAT)/i);
  if (directorSection) {
    const dirText = directorSection[1];
    
    const nameMatch = dirText.match(/Name:?\s*(.+?)(?=\s*Email|\s*Phone|\s*$)/i);
    if (nameMatch) result.meetDirector.name = nameMatch[1].trim();
    
    const emailMatch = dirText.match(/Email:?\s*([\w.+-]+@[\w.-]+\.\w+)/i);
    if (emailMatch) result.meetDirector.email = emailMatch[1];
    
    const phoneMatch = dirText.match(/Phone:?\s*([\d\-().]+)/i);
    if (phoneMatch) result.meetDirector.phone = phoneMatch[1];
  }
  
  // ---- Extract Entry Deadline ----
  // Look for the actual "DEADLINE FOR" text anywhere in the document
  // Format: "DEADLINE FOR THE RECEIPT OF ENTRIES IS Tuesday, November 4, 2025"
  // Note: PDF may have spaces in dates like "November 4 , 202 5"
  
  console.log('Searching for deadline...');
  
  // First, find text containing "DEADLINE FOR"
  const deadlineArea = text.match(/DEADLINE\s+FOR\s+(?:THE\s+)?RECEIPT\s+OF\s+ENTRIES\s+IS\s+([^•\n]{10,80})/i);
  
  if (deadlineArea) {
    console.log('Deadline area found:', deadlineArea[1]);
    // Extract date from the matched text - handle spaces within date
    // "Tuesday, November 4, 2025" or "Tuesday , November 4 , 202 5"
    const dateText = deadlineArea[1];
    
    // Try to find month name followed by day and year (year may have spaces: "202 5")
    const monthMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{1,2})\s*(?:st|nd|rd|th)?\s*,?\s*(\d[\d\s]{2,6})/i);
    
    if (monthMatch) {
      // Clean up the year - remove spaces: "202 5" -> "2025"
      const cleanYear = monthMatch[3].replace(/\s+/g, '');
      const dateStr = `${monthMatch[1]} ${monthMatch[2]}, ${cleanYear}`;
      console.log('Deadline date extracted:', dateStr);
      result.entryDeadline = parseDate(dateStr);
      if (result.entryDeadline) {
        console.log('Deadline parsed successfully:', result.entryDeadline);
      }
    }
  } else {
    console.log('No DEADLINE FOR text found');
  }
  
  // ---- Extract Event Limits ----
  const eventLimitMatch = text.match(/maximum\s*(?:of\s*)?(\d+)\s*individual\s*events?\s*per\s*day/i);
  if (eventLimitMatch) {
    result.eventsPerDayLimit = parseInt(eventLimitMatch[1]);
  }
  
  // Check for total event limit
  const totalLimitMatch = text.match(/no\s*more\s*than\s*(\d+)\s*events?\s*for\s*the\s*meet/i);
  if (totalLimitMatch) {
    result.maxEventsTotal = parseInt(totalLimitMatch[1]);
  }
  
  // ---- Extract Fees ----
  // Look for FEES: section and extract individual, relay, surcharge
  // PDF text may have irregular spacing - even within numbers like "$1 2 .00" for "$12.00"
  const feesSection = text.match(/FEES:?\s*([\s\S]*?)(?=SEEDING|AWARDS|PENALTIES|LAYOUT|GENERAL)/i);
  let feesText = feesSection ? feesSection[1] : text;
  
  // Debug: Log fees section for troubleshooting
  console.log('Fees section found:', feesSection ? 'Yes' : 'No');
  if (feesSection) {
    console.log('Fees text (first 500 chars):', feesText.substring(0, 500));
  }
  
  // Helper to extract dollar amount, handling spaces within numbers
  // "$1 2 .00" → 12.00, "$9.50" → 9.50
  const extractDollarAmount = (text, pattern) => {
    const match = text.match(pattern);
    if (match) {
      // Get everything after the $ up to reasonable end (space + letter, or end of line)
      const afterDollar = match[1];
      // Remove all spaces and normalize
      const cleanedNum = afterDollar.replace(/\s+/g, '');
      const parsed = parseFloat(cleanedNum);
      if (!isNaN(parsed) && parsed > 0 && parsed < 1000) {
        return parsed;
      }
    }
    return null;
  };
  
  // Individual fee - capture everything after $ until we hit something that's not number/space/dot
  const indivMatch = feesText.match(/Individual\s*events?\s*:?\s*\$([\d\s.]+)/i);
  if (indivMatch) {
    const amount = extractDollarAmount(feesText, /Individual\s*events?\s*:?\s*\$([\d\s.]+)/i);
    if (amount) {
      result.fees.individual = amount;
      console.log('Individual fee found:', result.fees.individual);
    }
  }
  
  // Relay fee
  const relayMatch = feesText.match(/Relay\s*(?:events?|Fees?)?\s*:?\s*\$([\d\s.]+)/i);
  if (relayMatch) {
    const amount = extractDollarAmount(feesText, /Relay\s*(?:events?|Fees?)?\s*:?\s*\$([\d\s.]+)/i);
    if (amount) {
      result.fees.relay = amount;
      console.log('Relay fee found:', result.fees.relay);
    }
  }
  
  // Surcharge
  const surchargePatterns = [
    /Swimmer\s*surcharge\s*:?\s*\$([\d\s.]+)/i,
    /surcharge\s*:?\s*\$([\d\s.]+)/i,
  ];
  for (const pattern of surchargePatterns) {
    const amount = extractDollarAmount(feesText, pattern);
    if (amount) {
      result.fees.surcharge = amount;
      console.log('Surcharge found:', result.fees.surcharge);
      break;
    }
  }
  
  // ---- Determine Meet Type ----
  if (/prelims?\s*[\/&]?\s*finals/i.test(text)) {
    result.meetType = 'prelims_finals';
  } else if (/timed\s*finals/i.test(text)) {
    result.meetType = 'timed_finals';
  }
  
  // ---- Determine Course ----
  if (/25\s*(?:yard|yd)/i.test(text) || /SCY/i.test(text) || /Short\s*Course\s*Yard/i.test(text)) {
    result.course = 'SCY';
  } else if (/25\s*(?:meter|m)\b/i.test(text) || /SCM/i.test(text)) {
    result.course = 'SCM';
  } else if (/50\s*(?:meter|m)\b/i.test(text) || /LCM/i.test(text)) {
    result.course = 'LCM';
  }
  
  // ---- Extract Age-Up Date ----
  const ageUpMatch = text.match(/Age\s*(?:on|as\s*of)\s*(\w+\s+\d{1,2},?\s+\d{4})/i);
  if (ageUpMatch) {
    result.ageUpDate = parseDate(ageUpMatch[1]);
  }
  
  // ---- Extract Events from Order of Events Table ----
  // Use the last page(s) which typically contain the event table
  const lastPages = pages.slice(-2).join('\n');
  result.events = parseEventsFromText(lastPages.length > 500 ? lastPages : text);
  
  // Debug: Log parsing summary
  console.log('=== PDF PARSING RESULTS ===');
  console.log('Name:', result.name);
  console.log('Dates:', result.startDate, '-', result.endDate);
  console.log('Entry Deadline:', result.entryDeadline);
  console.log('Fees:', result.fees);
  console.log('Events found:', result.events?.length || 0);
  console.log('===========================');
  
  return result;
}

/**
 * Parse events from the Order of Events section
 */
function parseEventsFromText(text) {
  const events = [];
  const seenEventNumbers = new Set();
  
  // First, try to find the ORDER OF EVENTS section
  const orderSection = text.match(/ORDER\s*OF\s*EVENTS[\s\S]*$/i);
  const searchText = orderSection ? orderSection[0] : text;
  
  console.log('ORDER OF EVENTS section found:', orderSection ? 'Yes' : 'No');
  if (orderSection) {
    console.log('Events section length:', searchText.length);
    console.log('First 500 chars of events section:', searchText.substring(0, 500));
  }
  
  // Try to extract session dates from the events section
  // Look for patterns like "Friday November 14, 2025" or "Saturday November 15, 2025"
  const sessionDates = {};
  const dateMatches = searchText.matchAll(/(Friday|Saturday|Sunday|Thursday)\s*,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{1,2})\s*,?\s*(\d{4})/gi);
  for (const match of dateMatches) {
    const dayName = match[1];
    const dateStr = `${match[2]} ${match[3]}, ${match[4]}`;
    sessionDates[dayName.toLowerCase()] = parseDate(dateStr);
    console.log(`Session date found: ${dayName} = ${dateStr}`);
  }
  
  // Normalize the text - collapse multiple spaces but preserve structure
  let normalizedText = searchText
    .replace(/\s+/g, ' ')  // Collapse whitespace
    .replace(/(\d)\s+&\s*([UuOo])/g, '$1&$2')  // "10 & U" → "10&U"
    .replace(/(\d)\s+-\s+(\d)/g, '$1-$2')  // "11 - 12" → "11-12"
    .replace(/Med\s*ley/gi, 'Medley')  // "Med ley" → "Medley"
    .replace(/Free\s*style/gi, 'Freestyle')  // "Free style" → "Freestyle"
    // Fix split 2-digit event numbers: "5 2" → "52", "6 0" → "60", "6 4" → "64"
    // These appear after strokes/relay markers at end of lines
    .replace(/(\b(?:Free|Back|Breast|Fly|IM|Relay)\s*[*#]?\s*)(\d)\s+(\d)\b/gi, '$1$2$3')
    // Also fix at start of lines (before age groups)
    .replace(/\b(\d)\s+(\d)\s+((?:10&U|11-12|\d{1,2}&[UuOo]|\d{1,2}-\d{1,2}))/g, '$1$2 $3');
  
  console.log('Normalized events text (first 1200 chars):', normalizedText.substring(0, 1200));
  
  // Also log the last part where Sunday events are
  console.log('Normalized events text (last 600 chars):', normalizedText.substring(normalizedText.length - 600));
  
  // Pattern to match event entries
  // Format: EventNum AgeGroup Distance Stroke [EventNum]
  // Examples after normalization: "1 11-12 50 Breast 2", "17 10&U 200 Free Relay 18"
  // IMPORTANT: Put longer options FIRST in alternation (Free Relay before Free, etc.)
  const eventPattern = /\b(\d{1,3})\s+((?:\d{1,2}&[UuOo](?:nder|ver)?|\d{1,2}-\d{1,2}|Open))\s+(\d{2,4})\s+(Free\s*Relay|Medley\s*Relay|Freestyle|Backstroke|Breaststroke|Butterfly|Free|Back|Breast|Fly|I\.?M\.?|IM)\s*[*#]?\s*(\d{1,3})?\b/gi;
  
  let match;
  let matchCount = 0;
  while ((match = eventPattern.exec(normalizedText)) !== null) {
    matchCount++;
    const girlsEventNum = parseInt(match[1]);
    const ageGroupRaw = match[2];
    const distance = parseInt(match[3]);
    const strokeRaw = match[4];
    const boysEventNum = match[5] ? parseInt(match[5]) : null;
    
    // Debug: log first few matches, relays, and any events > 40
    if (matchCount <= 5 || /relay/i.test(strokeRaw) || girlsEventNum > 40) {
      console.log(`Match ${matchCount}: Event ${girlsEventNum}, Age: ${ageGroupRaw}, Dist: ${distance}, Stroke: ${strokeRaw}, Boys: ${boysEventNum}`);
    }
    
    // Validate distance
    if (distance < 25 || distance > 1650) continue;
    
    const ageGroup = normalizeAgeGroup(ageGroupRaw);
    const stroke = normalizeStroke(strokeRaw);
    const isRelay = /relay/i.test(strokeRaw);
    
    if (!ageGroup || !stroke) continue;
    
    // Check if this looks like a valid pair (boys = girls + 1)
    const isValidPair = boysEventNum && boysEventNum === girlsEventNum + 1;
    
    // If there's a boys number but it's not girls+1, this is likely a column merge issue
    // We'll still add the girls event, but not add the mismatched "boys" event
    if (boysEventNum && !isValidPair) {
      console.log(`Column merge detected: ${girlsEventNum} / ${boysEventNum} - adding girls only`);
    }
    
    // Add girls event
    if (!seenEventNumbers.has(girlsEventNum)) {
      seenEventNumbers.add(girlsEventNum);
      events.push({
        eventNumber: girlsEventNum,
        ageGroup: ageGroup,
        distance: distance,
        stroke: stroke,
        gender: 'Girls',
        isRelay: isRelay,
        eventName: `Girls ${ageGroup} ${distance} ${stroke}`
      });
    }
    
    // Add boys event only if valid pair (boys = girls + 1)
    if (isValidPair && !seenEventNumbers.has(boysEventNum)) {
      seenEventNumbers.add(boysEventNum);
      events.push({
        eventNumber: boysEventNum,
        ageGroup: ageGroup,
        distance: distance,
        stroke: stroke,
        gender: 'Boys',
        isRelay: isRelay,
        eventName: `Boys ${ageGroup} ${distance} ${stroke}`
      });
    }
  }
  
  console.log(`Events parsed: ${events.length} unique events from ${matchCount} regex matches`);
  
  // Log any gaps in event numbers
  const eventNums = events.map(e => e.eventNumber).sort((a, b) => a - b);
  const maxEvent = Math.max(...eventNums);
  const missingEvents = [];
  for (let i = 1; i <= maxEvent; i++) {
    if (!eventNums.includes(i)) {
      missingEvents.push(i);
    }
  }
  if (missingEvents.length > 0) {
    console.log('Missing event numbers:', missingEvents.join(', '));
  }
  
  return events.sort((a, b) => a.eventNumber - b.eventNumber);
}

/**
 * Normalize age group string
 */
function normalizeAgeGroup(ageGroup) {
  if (!ageGroup) return null;
  
  const ag = ageGroup.toLowerCase().replace(/\s+/g, ' ').trim();
  
  // Handle "& Under" formats: 8&U, 8 & Under, 8 &under, 10&U, etc.
  if (/^6\s*&?\s*u(nder)?$/i.test(ag)) return '6 & Under';
  if (/^8\s*&?\s*u(nder)?$/i.test(ag)) return '8 & Under';
  if (/^9\s*&?\s*u(nder)?$/i.test(ag)) return '9 & Under';
  if (/^10\s*&?\s*u(nder)?$/i.test(ag)) return '10 & Under';
  if (/^11\s*&?\s*u(nder)?$/i.test(ag)) return '11 & Under';
  if (/^12\s*&?\s*u(nder)?$/i.test(ag)) return '12 & Under';
  
  // Handle "& Over" formats: 13&O, 13 & Over, 15&O, etc.
  if (/^13\s*&?\s*o(ver)?$/i.test(ag)) return '13 & Over';
  if (/^15\s*&?\s*o(ver)?$/i.test(ag)) return '15 & Over';
  if (/senior/i.test(ag)) return '15 & Over';
  
  // Handle hyphenated age groups: 9-10, 11-12, 13-14, etc.
  // Also handles "11 &12" as "11-12"
  if (/^9\s*[-&]\s*10$/i.test(ag)) return '9-10';
  if (/^9\s*[-&]\s*12$/i.test(ag)) return '9-12';
  if (/^11\s*[-&]\s*12$/i.test(ag)) return '11-12';
  if (/^13\s*[-&]\s*14$/i.test(ag)) return '13-14';
  if (/^15\s*[-&]\s*16$/i.test(ag)) return '15-16';
  if (/^17\s*[-&]\s*18$/i.test(ag)) return '17-18';
  if (/^7\s*[-&]\s*8$/i.test(ag)) return '7-8';
  
  // Handle Open
  if (/open/i.test(ag)) return 'Open';
  
  // Return cleaned up version of original
  return ageGroup.trim();
}

/**
 * Normalize stroke name
 */
function normalizeStroke(stroke) {
  if (!stroke) return null;
  
  const s = stroke.toLowerCase().replace(/\./g, '');
  
  if (/free(?:style)?/.test(s) && !/relay/.test(s)) return 'Freestyle';
  if (/back(?:stroke)?/.test(s)) return 'Backstroke';
  if (/breast(?:stroke)?/.test(s)) return 'Breaststroke';
  if (/fly|butterfly/.test(s)) return 'Butterfly';
  if (/^im$|individual\s*medley/.test(s)) return 'IM';
  if (/medley\s*relay|med\s*relay/.test(s)) return 'Medley Relay';
  if (/free\s*relay/.test(s)) return 'Free Relay';
  
  return stroke;
}

// ============================================
// TIMELINE PDF PARSER (Hy-Tek Session Report)
// ============================================

/**
 * Parse a Hy-Tek timeline/session report PDF
 * Extracts: events with estimated start times, entry counts, heat counts
 */
export async function parseTimelinePDF(file) {
  const { fullText, pages } = await extractTextFromPDF(file);
  
  console.log('Timeline text sample:', fullText.substring(0, 800));
  
  const result = {
    sessions: [],
    events: []
  };
  
  // Split by "Session:" to get each session block
  const sessionParts = fullText.split(/Session:\s*/i);
  
  for (let i = 1; i < sessionParts.length; i++) {
    const sessionText = sessionParts[i];
    
    // Parse session header: "1 Friday Prelims Day of Meet: 1 Starts at 09:00 AM Heat Interval: 30 Seconds"
    const headerMatch = sessionText.match(/^(\d+)\s+([A-Za-z]+\s+(?:Prelims?|Finals?))/i);
    
    const sessionInfo = {
      sessionNumber: headerMatch ? parseInt(headerMatch[1]) : i,
      name: headerMatch ? headerMatch[2].trim() : `Session ${i}`,
      dayOfMeet: null,
      startTime: null,
      heatInterval: 30
    };
    
    // Extract day of meet
    const dayMatch = sessionText.match(/Day\s*of\s*Meet:\s*(\d+)/i);
    if (dayMatch) {
      sessionInfo.dayOfMeet = parseInt(dayMatch[1]);
    }
    
    // Extract start time
    const startMatch = sessionText.match(/Starts\s*at\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i);
    if (startMatch) {
      sessionInfo.startTime = startMatch[1].trim();
    }
    
    // Extract heat interval
    const intervalMatch = sessionText.match(/Heat\s*Interval:\s*(\d+)\s*Seconds/i);
    if (intervalMatch) {
      sessionInfo.heatInterval = parseInt(intervalMatch[1]);
    }
    
    console.log('Parsed session:', sessionInfo);
    result.sessions.push(sessionInfo);
    
    // Parse events in this session
    // Normalize the text carefully to preserve time formats
    let normalizedText = sessionText
      .replace(/_+/g, '')  // Remove underscores first
      // Fix split time formats first (before general space collapse)
      // Handle patterns like "1 0:11 AM" -> "10:11 AM" and "0 9:00 AM" -> "09:00 AM"
      .replace(/(\d)\s+(\d):(\d{2})\s*(AM|PM)/gi, '$1$2:$3 $4')
      .replace(/\s+/g, ' ')  // Now collapse all whitespace to single spaces
      .trim();
    
    // Fix other split numbers (event numbers, entries, heats)
    normalizedText = normalizedText
      .replace(/(Prelims?|Finals?(?:-\d|-S|-1)?)\s+(\d)\s+(\d)\s+(Girls?|Boys?)/gi, '$1 $2$3 $4')  // Fix split event numbers
      .replace(/(Breaststroke|Backstroke|Butterfly|Freestyle|Free\s*Relay|Medley\s*Relay|IM)\s+(\d)\s+(\d)\s+(\d)/gi, '$1 $2$3 $4');  // Fix split entry/heat counts
    
    // Pattern for event lines: "Prelims 4 Boys 10 & Under 50 Breaststroke 27 4 09:12 AM"
    // Format: Round EventNum Gender AgeGroup Distance Stroke Entries Heats StartTime
    // Use explicit stroke names to avoid greedy matching
    const strokePattern = '(Freestyle|Breaststroke|Backstroke|Butterfly|Free\\s*Relay|Medley\\s*Relay|IM)';
    const eventPattern = new RegExp(`(Prelims?|Finals?(?:-\\d|-S|-1)?)\\s+(\\d+)\\s+(Girls?|Boys?)\\s+((?:\\d+\\s*&?\\s*Under|\\d+-\\d+|\\d+\\s*&?\\s*Over))\\s+(\\d+)\\s+${strokePattern}\\s+(\\d+)\\s+(\\d+)\\s*u?\\s+(\\d{1,2}:\\d{2}\\s*(?:AM|PM))`, 'gi');
    
    // Debug: Log the normalized text for this session (first 1000 chars)
    if (sessionInfo.sessionNumber <= 2) {
      console.log(`Session ${sessionInfo.sessionNumber} normalized text (first 1000 chars):`, normalizedText.substring(0, 1000));
    }
    
    let match;
    const foundEvents = new Set();
    
    while ((match = eventPattern.exec(normalizedText)) !== null) {
      const roundType = match[1].toLowerCase();
      const eventNumber = parseInt(match[2]);
      const gender = match[3].toLowerCase().includes('girl') ? 'Girls' : 'Boys';
      const ageGroup = normalizeAgeGroup(match[4]);
      const distance = parseInt(match[5]);
      const stroke = normalizeStroke(match[6].trim());
      const entryCount = parseInt(match[7]);
      const heatCount = parseInt(match[8]);
      const startTime = match[9].trim();
      
      const eventName = `${gender} ${ageGroup} ${distance} ${stroke}`;
      
      result.events.push({
        sessionNumber: sessionInfo.sessionNumber,
        eventNumber,
        eventName,
        gender,
        ageGroup,
        distance,
        stroke,
        isRelay: /relay/i.test(stroke),
        roundType: roundType.includes('final') ? 'finals' : 'prelims',
        entryCount,
        heatCount,
        estimatedStartTime: startTime
      });
      
      foundEvents.add(eventNumber);
      console.log(`Event ${eventNumber}: ${eventName} at ${startTime}`);
    }
    
    // Try a more lenient pattern for events that might be missing entry/heat counts
    const lenientPattern = new RegExp(`(Prelims?|Finals?(?:-\\d|-S|-1)?)\\s+(\\d+)\\s+(Girls?|Boys?)\\s+((?:\\d+\\s*&?\\s*Under|\\d+-\\d+|\\d+\\s*&?\\s*Over))\\s+(\\d+)\\s+${strokePattern}.*?(\\d{1,2}:\\d{2}\\s*(?:AM|PM))`, 'gi');
    
    while ((match = lenientPattern.exec(normalizedText)) !== null) {
      const eventNumber = parseInt(match[2]);
      
      // Skip if we already found this event with the strict pattern
      if (foundEvents.has(eventNumber)) continue;
      
      const roundType = match[1].toLowerCase();
      const gender = match[3].toLowerCase().includes('girl') ? 'Girls' : 'Boys';
      const ageGroup = normalizeAgeGroup(match[4]);
      const distance = parseInt(match[5]);
      const stroke = normalizeStroke(match[6].trim());
      const startTime = match[7].trim();
      
      const eventName = `${gender} ${ageGroup} ${distance} ${stroke}`;
      
      result.events.push({
        sessionNumber: sessionInfo.sessionNumber,
        eventNumber,
        eventName,
        gender,
        ageGroup,
        distance,
        stroke,
        isRelay: /relay/i.test(stroke),
        roundType: roundType.includes('final') ? 'finals' : 'prelims',
        entryCount: null,
        heatCount: null,
        estimatedStartTime: startTime
      });
      
      console.log(`Event ${eventNumber} (lenient): ${eventName} at ${startTime}`);
    }
  }
  
  console.log(`Parsed ${result.sessions.length} sessions and ${result.events.length} events`);
  return result;
}

/**
 * Parse event name string into components
 */
function parseEventName(name) {
  const result = {
    gender: null,
    ageGroup: null,
    distance: null,
    stroke: null,
    isRelay: false
  };
  
  // Gender
  if (/girl/i.test(name)) result.gender = 'Girls';
  else if (/boy/i.test(name)) result.gender = 'Boys';
  else if (/mixed/i.test(name)) result.gender = 'Mixed';
  
  // Age group
  const ageMatch = name.match(/(\d+\s*&?\s*Under|\d+-\d+|\d+\s*&?\s*Over)/i);
  if (ageMatch) result.ageGroup = normalizeAgeGroup(ageMatch[1]);
  
  // Distance
  const distMatch = name.match(/(\d+)\s*(?:Yard|Meter)?/i);
  if (distMatch) result.distance = parseInt(distMatch[1]);
  
  // Stroke
  const strokeMatch = name.match(/(Free(?:style)?|Back(?:stroke)?|Breast(?:stroke)?|Fly|Butterfly|IM|(?:Free|Medley)\s*Relay)/i);
  if (strokeMatch) {
    result.stroke = normalizeStroke(strokeMatch[1]);
    result.isRelay = /relay/i.test(strokeMatch[1]);
  }
  
  return result;
}

// ============================================
// HEAT SHEET PDF PARSER (Hy-Tek Meet Program)
// ============================================

/**
 * Parse a Hy-Tek heat sheet/meet program PDF
 * Extracts: swimmer entries with heat, lane, seed time
 */
export async function parseHeatSheetPDF(file) {
  const { fullText, pages } = await extractTextFromPDF(file);
  
  console.log('Heat sheet text sample:', fullText.substring(0, 800));
  console.log('Heat sheet full length:', fullText.length, 'chars');
  
  const result = {
    meetName: null,
    meetDates: null,
    sessionName: null,
    entries: []
  };
  
  // Extract meet info from header
  const meetMatch = fullText.match(/^(.+?)\s*[-–]\s*(\d{1,2}\/\d{1,2}\/\d{4})/m);
  if (meetMatch) {
    result.meetName = meetMatch[1].trim();
    result.meetDates = meetMatch[2];
  }
  
  // Extract session name (e.g., "Meet Program - Friday Prelims")
  const sessionMatch = fullText.match(/Meet\s*Program\s*[-–]\s*(.+?)(?:\n|$)/m);
  if (sessionMatch) {
    result.sessionName = sessionMatch[1].trim();
  }
  
  let currentEvent = null;
  let currentHeat = null;
  let currentHeatStart = null;
  
  // Normalize text - handle spaces in numbers
  // But be careful not to join seed times with ages
  const normalizedText = fullText
    .replace(/\s+/g, ' ')  // First collapse all whitespace to single spaces
    .trim();
  
  // Split into lines
  const lines = normalizedText.split(/(?=#\d+|Heat\s+\d+)/);
  
  console.log(`Processing ${lines.length} segments from heat sheet`);
  
  for (const segment of lines) {
    // Check for event header: "#4 Boys 10 & Under 50 Yard Breaststroke"
    const eventMatch = segment.match(/#(\d+)\s+(Girls?|Boys?|Mixed)\s+(.+?)(?=Lane|Heat|$)/i);
    if (eventMatch) {
      currentEvent = {
        eventNumber: parseInt(eventMatch[1]),
        gender: eventMatch[2].toLowerCase().includes('girl') ? 'Girls' : 'Boys',
        eventName: eventMatch[3].trim()
      };
      console.log('Found event:', currentEvent);
      
      // Debug: Log segment for events 4, 8, 12 (James's events)
      if ([4, 8, 12].includes(currentEvent.eventNumber)) {
        console.log(`Event ${currentEvent.eventNumber} segment (first 500 chars):`, segment.substring(0, 500));
      }
    }
    
    // Check for heat header: "Heat 1 of 3 Prelims Starts at 09:12 AM"
    const heatMatch = segment.match(/Heat\s+(\d+)\s+of\s+(\d+).*?(?:Starts\s+at\s+)?(\d{1,2}:\d{2}\s*(?:AM|PM)?)?/i);
    if (heatMatch) {
      currentHeat = parseInt(heatMatch[1]);
      currentHeatStart = heatMatch[3] || null;
      console.log('Found heat:', currentHeat, 'start:', currentHeatStart);
    }
    
    // Look for swimmer entries in this segment
    // HY-TEK's PDF extraction puts columns in this order: Team SeedTime Age Name Lane
    // Example: "HNVR-VA 47.41 9 Goodwillie, James G 5"
    
    // Debug: Show segment content for troubleshooting if this is event 4, 8, or 12
    if (currentEvent && [4, 8, 12].includes(currentEvent.eventNumber) && currentHeat) {
      console.log(`Event ${currentEvent.eventNumber} Heat ${currentHeat} segment (500 chars):`, segment.substring(0, 500));
    }
    
    // Pattern: Team SeedTime+Age Name Lane
    // The age is stuck to the seed time: "HNVR-VA 47.419 Goodwillie, James G 5"
    // Seed time format: XX.XX or X:XX.XX, then 1-2 digit age
    
    // Match: Team (NT OR time with optional age stuck) (optional age if separated) Name Lane
    const swimmerPattern = /([A-Z0-9]{2,6}-[A-Z]{2})\s+(NT|[\d:\.]+)\s*(\d{1,2})?\s+([A-Za-z][A-Za-z'\-\.]+,\s*[A-Za-z][A-Za-z'\s\-\.]*(?:\s+[A-Z])?)\s+(\d{1,2})(?:\s|$)/gi;
    
    let swimmerMatch;
    let matchCount = 0;
    while ((swimmerMatch = swimmerPattern.exec(segment)) !== null) {
      if (currentEvent && currentHeat) {
        let teamCode = swimmerMatch[1];
        let seedTimeRaw = swimmerMatch[2];
        let ageStr = swimmerMatch[3];
        let swimmerName = swimmerMatch[4].trim();
        let lane = parseInt(swimmerMatch[5]);
        
        // Parse seed time and age
        // If age is missing, it might be stuck to the end of seedTimeRaw
        let seedTime = seedTimeRaw;
        let age = null;
        
        if (ageStr) {
          age = parseInt(ageStr);
        } else if (seedTimeRaw !== 'NT' && /\d$/.test(seedTimeRaw)) {
          // Age is stuck to seed time - extract last 1-2 digits
          // Check if last digit makes sense as age
          const lastChar = seedTimeRaw[seedTimeRaw.length - 1];
          if (lastChar >= '6' && lastChar <= '9') {
            // Single digit age (6-9)
            seedTime = seedTimeRaw.slice(0, -1);
            age = parseInt(lastChar);
          } else if (seedTimeRaw.length >= 2) {
            // Try last 2 digits (10-12)
            const last2 = seedTimeRaw.slice(-2);
            if (last2 === '10' || last2 === '11' || last2 === '12') {
              seedTime = seedTimeRaw.slice(0, -2);
              age = parseInt(last2);
            }
          }
        }
        
        if (age) {
          matchCount++;
          const entry = {
            eventNumber: currentEvent.eventNumber,
            eventName: currentEvent.eventName,
            gender: currentEvent.gender,
            teamCode: teamCode,
            seedTime: seedTime,
            age: age,
            swimmerName: swimmerName,
            lane: lane,
            seedTimeSeconds: parseTimeToSeconds(seedTime),
            heat: currentHeat,
            heatStartTime: currentHeatStart
          };
          
          result.entries.push(entry);
          console.log('Found swimmer:', entry.swimmerName, 'lane:', entry.lane, 'heat:', entry.heat, 'seed:', entry.seedTime);
        }
      }
    }
    
    // Debug: If no matches in this segment but we have event and heat
    if (currentEvent && currentHeat && matchCount === 0 && [4, 8, 12].includes(currentEvent.eventNumber)) {
      console.log(`⚠ No swimmers matched in Event ${currentEvent.eventNumber} Heat ${currentHeat} segment`);
    }
  }
  
  console.log(`Parsed ${result.entries.length} entries from heat sheet`);
  return result;
}

/**
 * Match heat sheet entries to swimmers in database
 * Returns entries with matched swimmer_id where found
 */
export function matchHeatSheetEntries(entries, dbSwimmers, teamCode) {
  console.log(`Matching ${entries.length} entries against ${dbSwimmers.length} swimmers, team: ${teamCode}`);
  
  return entries.map(entry => {
    // Skip entries that don't match our team code (if specified)
    if (teamCode && !entry.teamCode.toUpperCase().startsWith(teamCode.toUpperCase())) {
      return { ...entry, matched: false, matchReason: 'different_team' };
    }
    
    // Parse entry name: "Goodwillie, James G" -> lastName="Goodwillie", firstName="James"
    const entryNameParts = entry.swimmerName.split(',').map(p => p.trim());
    const lastName = entryNameParts[0]?.toLowerCase() || '';
    const firstNamePart = entryNameParts[1]?.trim() || '';
    const firstName = firstNamePart.split(/\s+/)[0]?.toLowerCase() || '';
    
    console.log(`Trying to match: "${entry.swimmerName}" -> last="${lastName}", first="${firstName}"`);
    
    const match = dbSwimmers.find(swimmer => {
      const swimmerName = swimmer.name.toLowerCase();
      
      // Try different matching strategies
      // Strategy 1: Full name contains both first and last
      if (swimmerName.includes(firstName) && swimmerName.includes(lastName)) {
        return true;
      }
      
      // Strategy 2: Parse swimmer name as "First Middle Last"
      const swimmerParts = swimmerName.split(/\s+/);
      const swimmerFirst = swimmerParts[0];
      const swimmerLast = swimmerParts[swimmerParts.length - 1];
      
      if (swimmerFirst === firstName && swimmerLast === lastName) {
        return true;
      }
      
      // Strategy 3: Just match last name + first initial
      const firstInitial = firstName[0];
      if (swimmerLast === lastName && swimmerFirst.startsWith(firstInitial)) {
        return true;
      }
      
      return false;
    });
    
    if (match) {
      console.log(`  Matched "${entry.swimmerName}" to "${match.name}" (ID: ${match.id})`);
      return {
        ...entry,
        matched: true,
        swimmer_id: match.id,
        matchedSwimmerName: match.name
      };
    }
    
    console.log(`  No match found for "${entry.swimmerName}"`);
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
