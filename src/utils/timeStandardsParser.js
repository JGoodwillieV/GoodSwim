import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import * as XLSX from 'xlsx';
import { timeToSeconds } from './timeUtils';
import { normalizeEventName } from './eventUtils';
import { supabase } from '../supabase';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const AGE_GROUP_MAP = {
  '8 & under': { min: 0, max: 8 },
  '8 and under': { min: 0, max: 8 },
  '8&u': { min: 0, max: 8 },
  '8u': { min: 0, max: 8 },
  '8-under': { min: 0, max: 8 },
  '8-u': { min: 0, max: 8 },
  '9-10': { min: 9, max: 10 },
  '9/10': { min: 9, max: 10 },
  '10 & under': { min: 0, max: 10 },
  '10 and under': { min: 0, max: 10 },
  '10&u': { min: 0, max: 10 },
  '10u': { min: 0, max: 10 },
  '11-12': { min: 11, max: 12 },
  '11/12': { min: 11, max: 12 },
  '13-14': { min: 13, max: 14 },
  '13/14': { min: 13, max: 14 },
  '15-16': { min: 15, max: 16 },
  '15/16': { min: 15, max: 16 },
  '15-18': { min: 15, max: 18 },
  '15/18': { min: 15, max: 18 },
  '15 & over': { min: 15, max: 99 },
  '15 and over': { min: 15, max: 99 },
  '15+': { min: 15, max: 99 },
  '17-18': { min: 17, max: 18 },
  '17/18': { min: 17, max: 18 },
  'open': { min: 0, max: 99 },
  'senior': { min: 15, max: 99 },
};

function parseAgeGroup(str) {
  if (!str) return null;
  const key = String(str).toLowerCase().trim();
  if (AGE_GROUP_MAP[key]) return AGE_GROUP_MAP[key];

  const rangeMatch = key.match(/(\d+)\s*[-/&]\s*(\d+)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    if (min > 19 || (max > 19 && max < 99)) return null;
    return { min, max };
  }

  const overMatch = key.match(/(\d+)\s*(?:&\s*over|\+|and\s*over)/i);
  if (overMatch) {
    const min = parseInt(overMatch[1], 10);
    if (min > 19) return null;
    return { min, max: 99 };
  }

  const underMatch = key.match(/(\d+)\s*(?:&\s*under|and\s*under|-u|u)/i);
  if (underMatch) {
    const max = parseInt(underMatch[1], 10);
    if (max > 19) return null;
    return { min: 0, max };
  }

  return null;
}

function normalizeGender(str) {
  if (!str) return null;
  const s = String(str).trim().toLowerCase();
  if (s === 'm' || s === 'male' || s === 'boys' || s === 'boy' || s === 'men' || s === 'man') return 'M';
  if (s === 'f' || s === 'female' || s === 'girls' || s === 'girl' || s === 'women' || s === 'woman') return 'F';
  return null;
}

export function normalizeCourse(str) {
  if (!str) return null;
  const s = String(str).toUpperCase().trim();
  if (s.includes('SCY') || s.includes('SHORT COURSE YARDS') || s === 'Y' || s === 'YARDS') return 'SCY';
  if (s.includes('LCM') || s.includes('LONG COURSE') || s === 'LC') return 'LCM';
  if (s.includes('SCM') || s.includes('SHORT COURSE METERS')) return 'SCM';
  return null;
}

function detectCourseFromText(text) {
  if (!text) return null;
  const s = text.toUpperCase();
  const courses = [];
  if (/\bSCY\b|SHORT\s*COURSE\s*YARDS?\b|\bYARDS\b|25\s*YARD/i.test(s)) courses.push('SCY');
  if (/\bLCM\b|LONG\s*COURSE\s*METERS?\b|50\s*METER/i.test(s)) courses.push('LCM');
  if (/\bSCM\b|SHORT\s*COURSE\s*METERS?\b|25\s*METER/i.test(s)) courses.push('SCM');
  return courses;
}

const TIME_REGEX = /^(\d{1,2}:)?\d{1,2}\.\d{2}$/;

function isTimeValue(str) {
  if (!str) return false;
  const s = String(str).trim();
  return TIME_REGEX.test(s) && timeToSeconds(s) !== null;
}

function normalizeEvent(rawEvent) {
  if (!rawEvent) return null;
  const normalized = normalizeEventName(rawEvent);
  if (!normalized) return null;

  const match = normalized.match(/^(\d+)\s+(.+)$/);
  if (!match) return null;

  const distance = match[1];
  let stroke = match[2].toLowerCase();
  const DISPLAY = {
    freestyle: 'Free', backstroke: 'Back', breaststroke: 'Breast',
    butterfly: 'Fly', im: 'IM',
  };
  const displayStroke = DISPLAY[stroke] || stroke.charAt(0).toUpperCase() + stroke.slice(1);
  return `${distance} ${displayStroke}`;
}

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------
export async function parseCSV(file) {
  const text = await file.text();
  const rows = text.split(/\r?\n/).map(r => r.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
  return parseTabularRows(rows);
}

// ---------------------------------------------------------------------------
// Excel Parser
// ---------------------------------------------------------------------------
export async function parseExcel(file) {
  const data = new Uint8Array(await file.arrayBuffer());
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  return parseTabularRows(rows.map(r => r.map(c => String(c ?? '').trim())));
}

// ---------------------------------------------------------------------------
// PDF text extraction — shared between parsePDF and reparseWithAI
// ---------------------------------------------------------------------------
async function extractPDFText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const allRowsWithPos = [];
  const allRowsPlain = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const items = textContent.items
      .filter(item => item.str && item.str.trim())
      .map(item => ({
        x: item.transform?.[4] ?? 0,
        y: item.transform?.[5] ?? 0,
        str: item.str.trim(),
      }));

    items.sort((a, b) => {
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 4) return yDiff;
      return a.x - b.x;
    });

    let currentRow = [];
    let lastY = null;

    for (const item of items) {
      if (lastY === null || Math.abs(item.y - lastY) <= 4) {
        currentRow.push(item);
      } else {
        if (currentRow.length > 0) {
          currentRow.sort((a, b) => a.x - b.x);
          allRowsWithPos.push(currentRow);
          allRowsPlain.push(currentRow.map(p => p.str));
        }
        currentRow = [item];
      }
      lastY = item.y;
    }
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x);
      allRowsWithPos.push(currentRow);
      allRowsPlain.push(currentRow.map(p => p.str));
    }
  }

  const fullText = allRowsPlain.map(r => r.join('\t')).join('\n');
  return { allRowsWithPos, allRowsPlain, fullText, numPages: pdf.numPages };
}

// ---------------------------------------------------------------------------
// PDF Parser — always AI first, client-side as fallback
// ---------------------------------------------------------------------------
export async function parsePDF(file) {
  const { allRowsWithPos, allRowsPlain, fullText, numPages } = await extractPDFText(file);

  // 1) Always try AI first — handles arbitrary formats reliably
  console.log(`PDF has ${numPages} pages, ${fullText.length} chars. Sending to AI...`);
  try {
    const aiResult = await parseWithAI(fullText);
    if (aiResult.entries.length > 0) {
      console.log(`AI parser found ${aiResult.entries.length} entries`);
      aiResult.usedAI = true;
      return aiResult;
    }
    console.log('AI returned 0 entries, trying client-side parser...');
  } catch (err) {
    console.error('AI parsing failed, trying client-side parser:', err);
  }

  // 2) Client-side fallback for side-by-side course tables
  const sideBySlideResult = parseSideBySideTable(allRowsWithPos);
  if (sideBySlideResult && sideBySlideResult.entries.length > 0) {
    console.log(`Client-side parser found ${sideBySlideResult.entries.length} entries`);
    sideBySlideResult.usedAI = false;
    return sideBySlideResult;
  }

  // 3) Regex fallback
  const regexResult = parseTabularRows(allRowsPlain);
  regexResult.usedAI = false;
  console.log(`Regex fallback found ${regexResult.entries.length} entries`);
  return regexResult;
}

// ---------------------------------------------------------------------------
// Re-parse with AI — called explicitly by the user to override client-side results
// ---------------------------------------------------------------------------
export async function reparseFileWithAI(file) {
  const name = file.name.toLowerCase();
  let fullText = '';

  if (name.endsWith('.pdf')) {
    const extracted = await extractPDFText(file);
    fullText = extracted.fullText;
  } else if (name.endsWith('.csv')) {
    fullText = await file.text();
  } else if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
    const data = new Uint8Array(await file.arrayBuffer());
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    fullText = rows.map(r => r.map(c => String(c ?? '').trim()).join('\t')).join('\n');
  } else {
    throw new Error('Unsupported file type');
  }

  console.log(`Re-parsing with AI: ${fullText.length} chars`);
  const result = await parseWithAI(fullText);
  result.usedAI = true;
  return result;
}

// ---------------------------------------------------------------------------
// Client-side parser for side-by-side course tables
// e.g.  LCM | SCY | Event | SCY | LCM  (with Girls left, Boys right)
// Uses x-coordinates from PDF.js to map each time to its course column.
// Returns { metadata, entries } or null if the format isn't detected.
// ---------------------------------------------------------------------------
function parseSideBySideTable(rowsWithPos) {
  const COURSE_RE = /^(SCY|LCM|SCM)$/i;
  const TIME_RE = /^\d{1,2}:\d{2}\.\d{2}$|^\d+\.\d{2}$/;
  const GENDER_LABEL_RE = /^(GIRLS?|BOYS?|WOMEN|MEN|MALE|FEMALE|EVENTS?)$/i;

  // ---- Pre-check: does this document have side-by-side course headers? ----
  const headerRowIndices = [];
  for (let i = 0; i < rowsWithPos.length; i++) {
    if (rowsWithPos[i].filter(item => COURSE_RE.test(item.str)).length >= 2) {
      headerRowIndices.push(i);
    }
  }
  if (headerRowIndices.length === 0) return null;

  // ---- Pass 1: Pre-scan for age groups, titles, and gender labels ----
  const rowTexts = rowsWithPos.map(row => row.map(item => item.str).join(' ').trim());

  // Collect age group markers from ALL rows
  const ageGroupMarkers = [];
  for (let i = 0; i < rowTexts.length; i++) {
    const ag = detectAgeGroupFromLine(rowTexts[i]);
    if (ag) ageGroupMarkers.push({ idx: i, ag });
  }

  // Build section-to-age-group map: for each header, find the nearest age group
  const sectionAgeGroups = new Map();
  for (let h = 0; h < headerRowIndices.length; h++) {
    const hIdx = headerRowIndices[h];
    const nextHIdx = h + 1 < headerRowIndices.length ? headerRowIndices[h + 1] : rowsWithPos.length;

    // Check the header row itself first
    const headerNonCourse = rowsWithPos[hIdx]
      .filter(item => !COURSE_RE.test(item.str))
      .map(item => item.str).join(' ');
    const headerAg = parseAgeGroup(headerNonCourse);
    if (headerAg) {
      sectionAgeGroups.set(hIdx, headerAg);
      continue;
    }

    // Look for age group marker between this header and the next (or end)
    for (const { idx, ag } of ageGroupMarkers) {
      if (idx > hIdx && idx < nextHIdx) {
        sectionAgeGroups.set(hIdx, ag);
        break;
      }
    }
  }

  // Collect title candidates (non-time, non-label, non-footnote text)
  const titleCandidates = [];
  for (const text of rowTexts) {
    if (!text || text.length <= 5 || text.length >= 200) continue;
    if (/^\*|^qualifying|^valid|^approved/i.test(text)) continue;
    const isLabel = text.split(/\s+/).every(w => GENDER_LABEL_RE.test(w) || COURSE_RE.test(w) || !w.trim());
    if (isLabel) continue;
    if (TIME_RE.test(text.split(/\s+/)[0])) continue;
    if (detectAgeGroupFromLine(text)) continue;
    titleCandidates.push(text);
  }

  // Pick best title: prefer specific names over generic "TIME STANDARDS"
  let docTitle = '';
  const specificTitle = titleCandidates.find(t => !/^\d{4}\s+TIME\s+STANDARDS?$/i.test(t) && !/^TIME\s+STANDARDS?$/i.test(t));
  const genericTitle = titleCandidates.find(t => /TIME\s+STANDARDS?|QUALIFYING\s+TIMES?/i.test(t));
  if (specificTitle && genericTitle) {
    docTitle = `${genericTitle.match(/\d{4}/)?.[0] || ''} ${specificTitle}`.trim();
  } else {
    docTitle = specificTitle || genericTitle || titleCandidates[0] || '';
  }

  let docSeason = '';
  const sm = docTitle.match(/\b(20\d{2})\s*[-/]\s*(20\d{2})\b/) || docTitle.match(/\b(20\d{2})\b/);
  if (sm) docSeason = sm[0];

  // Determine left/right gender
  let leftGender = 'F', rightGender = 'M';
  for (const row of rowsWithPos) {
    const femaleItem = row.find(item => /^(GIRLS?|WOMEN|FEMALE)$/i.test(item.str));
    const maleItem = row.find(item => /^(BOYS?|MEN|MALE)$/i.test(item.str));
    if (femaleItem && maleItem) {
      if (femaleItem.x > maleItem.x) { leftGender = 'M'; rightGender = 'F'; }
      break;
    }
  }

  // ---- Pass 2: Process data rows with pre-scanned context ----
  const entries = [];
  let columnDefs = null;
  let currentAgeGroup = null;

  for (let rowIdx = 0; rowIdx < rowsWithPos.length; rowIdx++) {
    const row = rowsWithPos[rowIdx];
    const courseItems = row.filter(item => COURSE_RE.test(item.str));

    // --- Header row with course labels ---
    if (courseItems.length >= 2) {
      currentAgeGroup = sectionAgeGroups.get(rowIdx) || currentAgeGroup || { min: 0, max: 99 };

      let centerX;
      const nonCourseItems = row.filter(item => !COURSE_RE.test(item.str) && item.str.length > 0);
      if (nonCourseItems.length > 0) {
        centerX = nonCourseItems.reduce((sum, item) => sum + item.x, 0) / nonCourseItems.length;
      } else {
        const xs = courseItems.map(item => item.x);
        centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
      }

      columnDefs = courseItems.map(item => ({
        x: item.x,
        course: item.str.toUpperCase(),
        gender: item.x < centerX ? leftGender : rightGender,
      })).sort((a, b) => a.x - b.x);
      continue;
    }

    if (!columnDefs || !currentAgeGroup) continue;

    // --- Skip label-only rows ---
    if (row.every(item => GENDER_LABEL_RE.test(item.str) || !item.str.trim())) continue;

    // --- Data row: extract times and event name ---
    const timeItems = row.filter(item => TIME_RE.test(item.str));
    const textItems = row.filter(
      item => !TIME_RE.test(item.str) && !COURSE_RE.test(item.str) && item.str.length > 0
    );

    if (timeItems.length === 0 || textItems.length === 0) continue;

    const rawEventName = textItems.map(item => item.str).join(' ').replace(/^\d+-\d+\s+/, '').trim();
    const dualDistMatch = rawEventName.match(/^(\d+)\s*\/\s*(\d+)\s+(.+)$/);

    for (const timeItem of timeItems) {
      let bestCol = columnDefs[0];
      let bestDist = Math.abs(timeItem.x - bestCol.x);
      for (const col of columnDefs) {
        const dist = Math.abs(timeItem.x - col.x);
        if (dist < bestDist) { bestCol = col; bestDist = dist; }
      }

      let eventName;
      if (dualDistMatch) {
        const metersDist = dualDistMatch[1];
        const yardsDist = dualDistMatch[2];
        const stroke = dualDistMatch[3];
        const dist = bestCol.course === 'SCY' ? yardsDist : metersDist;
        eventName = normalizeEvent(`${dist} ${stroke}`);
      } else {
        eventName = normalizeEvent(rawEventName);
      }
      if (!eventName) continue;

      const seconds = timeToSeconds(timeItem.str);
      if (!seconds || seconds <= 0) continue;

      entries.push({
        standard_name: 'QT',
        event: eventName,
        gender: bestCol.gender,
        age_min: currentAgeGroup.min,
        age_max: currentAgeGroup.max,
        course: bestCol.course,
        time_seconds: seconds,
        time_string: timeItem.str,
      });
    }
  }

  if (entries.length === 0) return null;

  const metadata = {
    name: docTitle,
    organization: '',
    season: docSeason,
    course: null,
    courses_found: [...new Set(entries.map(e => e.course))],
  };

  return { metadata, entries };
}

// ---------------------------------------------------------------------------
// AI Parser — sends extracted text to Supabase edge function
// Splits large documents into chunks to avoid truncation
// ---------------------------------------------------------------------------
async function parseWithAI(fullText) {
  const CHUNK_LIMIT = 80000;

  let allEntries = [];
  let metadata = { name: '', organization: '', season: '', course: null, courses_found: [] };

  if (fullText.length <= CHUNK_LIMIT) {
    // Small enough to send in one call
    const result = await callAIParser(fullText);
    metadata = result.metadata;
    allEntries = result.entries;
  } else {
    // Split into sections by course markers or page breaks
    const sections = splitIntoCoursesSections(fullText, CHUNK_LIMIT);
    console.log(`Document too large (${fullText.length} chars), split into ${sections.length} chunks`);

    for (let i = 0; i < sections.length; i++) {
      console.log(`Parsing chunk ${i + 1}/${sections.length} (${sections[i].length} chars)...`);
      try {
        const result = await callAIParser(sections[i]);
        if (i === 0) {
          metadata = result.metadata;
        } else {
          // Merge courses_found
          for (const c of result.metadata.courses_found || []) {
            if (!metadata.courses_found.includes(c)) metadata.courses_found.push(c);
          }
        }
        allEntries.push(...result.entries);
      } catch (err) {
        console.error(`Chunk ${i + 1} failed:`, err);
      }
    }
  }

  metadata.courses_found = [...new Set(allEntries.map(e => e.course))];
  return { metadata, entries: allEntries };
}

function splitIntoCoursesSections(text, maxChunkSize) {
  // Try to split on course section headers
  const coursePatterns = [
    /(?=.*(?:SHORT\s*COURSE\s*YARDS|SCY\s*(?:TIME|QUALIFYING|STANDARD)))/im,
    /(?=.*(?:LONG\s*COURSE\s*METERS|LCM\s*(?:TIME|QUALIFYING|STANDARD)))/im,
    /(?=.*(?:SHORT\s*COURSE\s*METERS|SCM\s*(?:TIME|QUALIFYING|STANDARD)))/im,
  ];

  // Split by page breaks first
  const pages = text.split(/\n*--- PAGE BREAK ---\n*/);

  // Group pages into course sections by scanning for course markers
  const sections = [];
  let currentSection = '';

  for (const page of pages) {
    if (currentSection.length + page.length > maxChunkSize && currentSection.length > 0) {
      sections.push(currentSection);
      currentSection = '';
    }
    currentSection += (currentSection ? '\n\n' : '') + page;
  }
  if (currentSection) sections.push(currentSection);

  return sections;
}

async function callAIParser(text) {
  const { data, error } = await supabase.functions.invoke('parse-time-standards', {
    body: { text }
  });

  if (error) {
    throw new Error(error.message || 'AI parsing failed');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const metadata = {
    name: data.metadata?.name || '',
    organization: '',
    season: data.metadata?.season || '',
    course: null,
    courses_found: data.metadata?.courses_found || [],
  };

  const entries = (data.entries || [])
    .map(e => ({
      standard_name: e.standard_name || 'QT',
      event: normalizeEvent(e.event) || e.event,
      gender: normalizeGender(e.gender) || e.gender,
      age_min: e.age_min,
      age_max: e.age_max,
      course: normalizeCourse(e.course) || e.course || 'SCY',
      time_seconds: typeof e.time_seconds === 'number' ? e.time_seconds : timeToSeconds(e.time_string),
      time_string: e.time_string,
    }))
    .filter(e => e.time_seconds && e.time_seconds > 0 && e.event && e.gender);

  return { metadata, entries };
}

// ---------------------------------------------------------------------------
// Core tabular parser — works on array-of-arrays (cells per row)
// ---------------------------------------------------------------------------

const HEADER_PATTERNS = {
  event: /^(event|event\s*name|race)$/i,
  gender: /^(gender|sex|g)$/i,
  age_group: /^(age\s*group|age\s*grp|ages?|ag)$/i,
  standard_name: /^(standard|cut|level|std|time\s*standard|cut\s*name|qual)$/i,
  time: /^(time|time\s*standard|cut\s*time|qualifying\s*time|qt|standard\s*time)$/i,
  course: /^(course|pool|sc\/lc)$/i,
};

function detectColumns(headerRow) {
  const mapping = {};
  for (let i = 0; i < headerRow.length; i++) {
    const cell = String(headerRow[i]).trim();
    if (!cell) continue;
    for (const [field, pattern] of Object.entries(HEADER_PATTERNS)) {
      if (pattern.test(cell) && mapping[field] === undefined) {
        mapping[field] = i;
      }
    }
    if (isTimeValue(cell)) continue;
    if (parseAgeGroup(cell)) {
      if (mapping._ageGroupColumns === undefined) mapping._ageGroupColumns = [];
      mapping._ageGroupColumns.push({ index: i, label: cell });
    }
  }
  return mapping;
}

function parseTabularRows(rows) {
  if (!rows || rows.length < 2) return { metadata: {}, entries: [] };

  let headerIdx = -1;
  let mapping = {};

  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;
    const m = detectColumns(row);
    const matched = Object.keys(m).filter(k => !k.startsWith('_')).length;
    if (matched >= 2 || (m.event !== undefined && (m.time !== undefined || (m._ageGroupColumns && m._ageGroupColumns.length > 0)))) {
      mapping = m;
      headerIdx = i;
      break;
    }
  }

  const metadata = extractMetadata(rows, headerIdx);
  const entries = [];

  if (headerIdx < 0) {
    return { metadata, entries: parseFreeformRows(rows, metadata) };
  }

  const dataRows = rows.slice(headerIdx + 1);
  let currentGender = null;
  let currentAgeGroup = null;
  let currentEvent = null;
  let currentCourse = metadata.course;

  for (const row of dataRows) {
    if (!row || row.every(c => !String(c).trim())) continue;
    const fullLine = row.join(' ').trim();

    const genderDetect = detectGenderFromLine(fullLine);
    if (genderDetect) currentGender = genderDetect;

    const ageDetect = detectAgeGroupFromLine(fullLine);
    if (ageDetect) currentAgeGroup = ageDetect;

    // Detect course changes mid-document
    const lineCourse = normalizeCourse(fullLine);
    if (lineCourse) currentCourse = lineCourse;

    const eventCol = mapping.event !== undefined ? normalizeEvent(row[mapping.event]) : null;
    if (eventCol) currentEvent = eventCol;

    const gender = (mapping.gender !== undefined ? normalizeGender(row[mapping.gender]) : null) || currentGender;
    const agStr = mapping.age_group !== undefined ? row[mapping.age_group] : null;
    const ageGroup = (agStr ? parseAgeGroup(agStr) : null) || currentAgeGroup;
    const stdName = mapping.standard_name !== undefined ? String(row[mapping.standard_name]).trim() : null;
    const courseVal = (mapping.course !== undefined ? normalizeCourse(row[mapping.course]) : null) || currentCourse;

    if (mapping._ageGroupColumns && mapping._ageGroupColumns.length > 0) {
      for (const agCol of mapping._ageGroupColumns) {
        const time = String(row[agCol.index] || '').trim();
        if (!isTimeValue(time)) continue;
        const ag = parseAgeGroup(agCol.label);
        if (!ag) continue;
        const event = currentEvent || eventCol;
        if (!event || !gender) continue;

        entries.push({
          standard_name: stdName || metadata.name || 'QT',
          event,
          gender,
          age_min: ag.min,
          age_max: ag.max,
          course: courseVal || 'SCY',
          time_seconds: timeToSeconds(time),
          time_string: time,
        });
      }
    } else if (mapping.time !== undefined) {
      const time = String(row[mapping.time] || '').trim();
      if (!isTimeValue(time)) continue;
      const event = eventCol || currentEvent;
      if (!event || !gender || !ageGroup) continue;

      entries.push({
        standard_name: stdName || metadata.name || 'QT',
        event,
        gender,
        age_min: ageGroup.min,
        age_max: ageGroup.max,
        course: courseVal || 'SCY',
        time_seconds: timeToSeconds(time),
        time_string: time,
      });
    }
  }

  const validEntries = entries.filter(e => e.time_seconds && e.time_seconds > 0);
  // Detect all unique courses across entries
  metadata.courses_found = [...new Set(validEntries.map(e => e.course))];
  return { metadata, entries: validEntries };
}

// ---------------------------------------------------------------------------
// Freeform / fallback parser for PDFs without clear headers
// ---------------------------------------------------------------------------

function parseFreeformRows(rows, metadata) {
  const entries = [];
  let currentGender = null;
  let currentAgeGroup = null;
  let currentCourse = metadata.course;

  for (const row of rows) {
    if (!row || !row.length) continue;
    const line = row.join(' ').trim();
    if (!line) continue;

    const gDetect = detectGenderFromLine(line);
    if (gDetect) { currentGender = gDetect; }

    const agDetect = detectAgeGroupFromLine(line);
    if (agDetect) { currentAgeGroup = agDetect; }

    const lineCourse = normalizeCourse(line);
    if (lineCourse) { currentCourse = lineCourse; }

    const eventMatch = line.match(/\b(25|50|100|200|400|500|800|1000|1500|1650)\s+(Free(?:style)?|Back(?:stroke)?|Breast(?:stroke)?|Butter(?:fly)?|Fly|IM|Individual\s*Medley)/i);
    if (!eventMatch) continue;

    const event = normalizeEvent(`${eventMatch[1]} ${eventMatch[2]}`);
    if (!event) continue;

    const times = [];
    const timeMatches = line.matchAll(/\b(\d{1,2}:\d{2}\.\d{2}|\d{1,3}\.\d{2})\b/g);
    for (const tm of timeMatches) {
      if (isTimeValue(tm[1])) times.push(tm[1]);
    }

    if (times.length === 0) continue;

    const gender = currentGender || 'M';
    const ageGroup = currentAgeGroup || { min: 0, max: 99 };

    for (const time of times) {
      entries.push({
        standard_name: metadata.name || 'QT',
        event,
        gender,
        age_min: ageGroup.min,
        age_max: ageGroup.max,
        course: currentCourse || 'SCY',
        time_seconds: timeToSeconds(time),
        time_string: time,
      });
    }
  }

  const validEntries = entries.filter(e => e.time_seconds && e.time_seconds > 0);
  metadata.courses_found = [...new Set(validEntries.map(e => e.course))];
  return validEntries;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectGenderFromLine(line) {
  if (/\b(girls?|female|women)\b/i.test(line)) return 'F';
  if (/\b(boys?|male|men)\b/i.test(line)) return 'M';
  return null;
}

function detectAgeGroupFromLine(line) {
  const patterns = [
    /\b(\d{1,2})\s*(?:&|and)\s*(under|over)\b/i,
    /\b(\d{1,2})\s*[-/]\s*(\d{1,2})\b/,
    /\b(open|senior)\b/i,
  ];
  for (const p of patterns) {
    const m = line.match(p);
    if (m) {
      const ag = parseAgeGroup(m[0]);
      if (ag) return ag;
    }
  }
  return null;
}

function extractMetadata(rows, headerIdx) {
  const meta = { name: '', organization: '', season: '', course: null, courses_found: [] };
  const scanLimit = headerIdx >= 0 ? headerIdx : Math.min(rows.length, 8);
  const allText = rows.slice(0, scanLimit).map(r => (r || []).join(' ')).join(' ');

  // Detect all courses mentioned in headers
  meta.courses_found = detectCourseFromText(allText);
  if (meta.courses_found.length === 1) {
    meta.course = meta.courses_found[0];
  }

  for (let i = 0; i < scanLimit; i++) {
    const line = (rows[i] || []).join(' ').trim();
    if (!line) continue;

    if (!meta.course) {
      meta.course = normalizeCourse(line);
    }

    const seasonMatch = line.match(/\b(20\d{2})\s*[-/]\s*(20\d{2})\b/) || line.match(/\b(20\d{2})\b/);
    if (seasonMatch && !meta.season) {
      meta.season = seasonMatch[0];
    }

    if (!meta.name && line.length > 5 && line.length < 150) {
      meta.name = line;
    }
  }

  return meta;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function parseTimeStandardsFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.csv')) {
    return parseCSV(file);
  }
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
    return parseExcel(file);
  }
  if (name.endsWith('.pdf')) {
    return parsePDF(file);
  }

  throw new Error(`Unsupported file type: ${file.name}. Please upload a PDF, CSV, or Excel file.`);
}
