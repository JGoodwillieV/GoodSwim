// src/utils/rosterPdfParser.js
// Parse "Member Directory" style roster PDFs (e.g., SportsEngine exports)

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source using Vite's ?url import
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function isNoiseLine(line) {
  const l = String(line || '').trim();
  if (!l) return true;
  if (/^Roster$/i.test(l)) return true;
  if (/^Account Name\s+Member Name\s+Preferred\s+Roster\s+DOB\s+USS #/i.test(l)) return true;
  if (/^--\s*\d+\s+of\s+\d+\s*--$/i.test(l)) return true;
  if (/^Page\s+\d+\s+of\s+\d+/i.test(l)) return true;
  if (/SportsEngine/i.test(l)) return true;
  return false;
}

function properCaseName(name) {
  return String(name || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function lastCommaFirstToFirstLast(lastCommaFirst) {
  const raw = String(lastCommaFirst || '').trim();
  if (!raw.includes(',')) return properCaseName(raw);
  const [lastRaw, firstRaw] = raw.split(',').map(s => s.trim());
  if (!lastRaw || !firstRaw) return properCaseName(raw);
  return properCaseName(`${firstRaw} ${lastRaw}`);
}

function mdy2ToIso(m, d, yy) {
  const mm = String(m).padStart(2, '0');
  const dd = String(d).padStart(2, '0');
  const year2 = parseInt(yy, 10);
  if (!Number.isFinite(year2)) return null;
  const current2 = new Date().getFullYear() % 100;
  // Pivot: treat <= current year as 2000s, otherwise 1900s (e.g. 75 -> 1975)
  const fullYear = year2 <= current2 ? 2000 + year2 : 1900 + year2;
  return `${fullYear}-${mm}-${dd}`;
}

function deriveGroupName(tailBetweenMemberAndDob) {
  const tail = String(tailBetweenMemberAndDob || '').replace(/\s+/g, ' ').trim();
  if (!tail) return null;

  // Prefer CAT groups (often include color/descriptor)
  const catMatches = [...tail.matchAll(/\bCAT\s*\d+(?:\s+[A-Za-z]+){0,2}\b/gi)];
  if (catMatches.length > 0) {
    return catMatches[catMatches.length - 1][0].replace(/\s+/g, ' ').trim();
  }

  // Known non-CAT groups seen in directory exports
  const knownMulti = [
    'Tropical Storm',
    'Board Members'
  ];
  for (const g of knownMulti) {
    const re = new RegExp(`\\b${g.replace(/\s+/g, '\\s+')}\\b\\s*$`, 'i');
    if (re.test(tail)) return g;
  }

  const knownSingle = ['Coaches', 'Coach'];
  for (const g of knownSingle) {
    const re = new RegExp(`\\b${g}\\b\\s*$`, 'i');
    if (re.test(tail)) return g === 'Coach' ? 'Coaches' : g;
  }

  // Conservative fallback: if tail is 2-3 words and looks like a label (capitalized words)
  const words = tail.split(' ').filter(Boolean);
  if (words.length >= 2 && words.length <= 3 && words.every(w => /^[A-Z][A-Za-z]+$/.test(w))) {
    return words.join(' ');
  }

  return null;
}

/**
 * Extract reasonably line-shaped text from a PDF (preserves row-like structure).
 * For SportsEngine Member Directory PDFs, we need to group all columns of a single
 * data row together, even if they have slightly different Y positions.
 */
export async function extractLinesFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const lines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Collect all text items with their positions
    const items = [];
    for (const item of textContent.items) {
      const str = String(item?.str || '').trim();
      if (!str) continue;
      const x = item.transform?.[4] ?? 0;
      const y = item.transform?.[5] ?? 0;
      items.push({ x, y, str });
    }

    // Sort by Y (descending = top to bottom), then by X (ascending = left to right)
    items.sort((a, b) => {
      // Y positions within 5 points are considered the same row
      const yDiff = b.y - a.y;
      if (Math.abs(yDiff) > 5) return yDiff;
      return a.x - b.x;
    });

    // Group items into rows based on Y proximity
    // Items within 5 points of Y are grouped together
    const rows = [];
    let currentRow = [];
    let lastY = null;

    for (const item of items) {
      if (lastY === null || Math.abs(item.y - lastY) <= 5) {
        currentRow.push(item);
      } else {
        if (currentRow.length > 0) {
          // Sort row by X position and join
          currentRow.sort((a, b) => a.x - b.x);
          rows.push(currentRow);
        }
        currentRow = [item];
      }
      lastY = item.y;
    }
    if (currentRow.length > 0) {
      currentRow.sort((a, b) => a.x - b.x);
      rows.push(currentRow);
    }

    // Convert rows to line strings
    for (const row of rows) {
      const line = row.map(p => p.str).join(' ').replace(/\s+/g, ' ').trim();
      if (line) lines.push(line);
    }
  }

  return lines;
}

/**
 * Parse a SportsEngine-like "Member Directory" PDF into swimmer-like rows.
 * Returns: [{ name, group_name, date_of_birth }]
 */
export async function parseMemberDirectoryPDF(file) {
  const rawLines = await extractLinesFromPDF(file);
  const lines = rawLines.filter(l => !isNoiseLine(l));

  const results = [];
  let buffer = '';

  // Example DOB: 8/10/16
  const dobRegex = /\b(\d{1,2})\/(\d{1,2})\/(\d{2})\b/;
  
  // Match "Last, First" names ONLY - no middle names allowed to avoid over-matching
  // This is critical because the PDF has: "AccountLast, AccountFirst MemberLast, MemberFirst"
  // and we need to match these as TWO separate names, not one name with middle parts
  const nameRegex = /[A-Za-z][A-Za-z'\-.]+,\s*[A-Za-z][A-Za-z'\-.]+/g;

  const flushBuffer = (buf) => {
    const dobMatch = dobRegex.exec(buf);
    if (!dobMatch) return;

    const dobIdx = dobMatch.index ?? 0;

    // In this PDF format, "Account Name" (parent) and "Member Name" (swimmer) appear in sequence.
    // Format: "Account Name" "Member Name" "Preferred" "Roster/Group" DOB ...
    // Example: "Anderson, Kastine Anderson, Marielle CAT 2 8/10/16"
    //           ^-- parent         ^-- swimmer (we want this one)
    // We want the MEMBER NAME (swimmer), which is the SECOND "Last, First" name in the row.

    // Get only the portion of buffer before the DOB for name matching
    const preDob = buf.slice(0, dobIdx);
    
    const nameMatches = [...preDob.matchAll(nameRegex)]
      .map(m => ({
        text: m[0],
        idx: typeof m.index === 'number' ? m.index : -1,
        len: String(m[0] || '').length
      }))
      .filter(m => m.idx >= 0);

    if (nameMatches.length === 0) return;

    // For SportsEngine Member Directory PDFs, the format is ALWAYS:
    // "Account Name" (parent) | "Member Name" (swimmer) | Preferred | Roster | DOB
    // 
    // The SECOND "Last, First" name is always the swimmer (Member Name).
    // If there's only one name, use that one.
    // 
    // Examples:
    //   "Anderson, Kastine Anderson, Marielle CAT 2 8/10/16" → want "Anderson, Marielle"
    //   "Neal, MaryKate Bessellieu, Deacon CAT 3 10/24/13"   → want "Bessellieu, Deacon"
    //   "Andrews, Harrison Andrews, Harrison Coaches 6/6/97" → want "Andrews, Harrison" (same person is coach)
    //   "Ashby, Brice Ashby, Reese CAT 1 2/25/19"           → want "Ashby, Reese"

    let memberNameRaw = null;
    let memberMatchIdx = -1;

    if (nameMatches.length >= 2) {
      // Standard case: Account Name + Member Name → take the SECOND one (index 1)
      memberNameRaw = nameMatches[1].text.trim();
      memberMatchIdx = nameMatches[1].idx;
    } else if (nameMatches.length === 1) {
      // Only one name found (unusual, but handle it)
      memberNameRaw = nameMatches[0].text.trim();
      memberMatchIdx = nameMatches[0].idx;
    }

    if (!memberNameRaw || memberMatchIdx < 0) return;

    // Use the index from the regex match directly, not indexOf
    // This is critical when the same last name appears in both Account and Member names
    // (e.g., "Ashby, Brice Ashby, Reese" - indexOf("Ashby, Reese") would be wrong if it matched partial)
    const memberEnd = memberMatchIdx + memberNameRaw.length;
    if (dobIdx < memberEnd) return;

    const tail = buf.slice(memberEnd, dobIdx).replace(/\s+/g, ' ').trim();
    const group_name = deriveGroupName(tail) || null;
    const date_of_birth = mdy2ToIso(dobMatch[1], dobMatch[2], dobMatch[3]);

    const name = lastCommaFirstToFirstLast(memberNameRaw);
    if (!name) return;

    results.push({
      name,
      group_name,
      date_of_birth
    });
  };

  for (const line of lines) {
    buffer = `${buffer} ${line}`.replace(/\s+/g, ' ').trim();

    if (dobRegex.test(buffer)) {
      flushBuffer(buffer);
      buffer = '';
    }
  }

  // Attempt one last flush (in case last record lacks footer separation)
  if (buffer && dobRegex.test(buffer)) flushBuffer(buffer);

  return results;
}

