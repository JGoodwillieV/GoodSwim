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
 */
export async function extractLinesFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const lines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Group items by Y position into lines
    const byY = new Map();
    for (const item of textContent.items) {
      const str = String(item?.str || '').trim();
      if (!str) continue;
      const x = item.transform?.[4] ?? 0;
      const y = item.transform?.[5] ?? 0;
      // Round Y to avoid tiny float differences
      const yKey = Math.round(y * 2) / 2; // 0.5 increments
      if (!byY.has(yKey)) byY.set(yKey, []);
      byY.get(yKey).push({ x, str });
    }

    const yKeys = Array.from(byY.keys()).sort((a, b) => b - a); // top to bottom
    for (const yKey of yKeys) {
      const parts = byY.get(yKey).sort((a, b) => a.x - b.x).map(p => p.str);
      const line = parts.join(' ').replace(/\s+/g, ' ').trim();
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
  const nameRegex = /[A-Za-z][A-Za-z'\-.]+,\s*[A-Za-z][A-Za-z'\-.]+(?:\s+[A-Za-z][A-Za-z'\-.]+)*/g;

  const flushBuffer = (buf) => {
    const dobMatch = dobRegex.exec(buf);
    if (!dobMatch) return;

    const names = [...buf.matchAll(nameRegex)].map(m => m[0]);
    if (names.length === 0) return;
    const memberNameRaw = (names.length >= 2 ? names[1] : names[0]).trim();

    const bufLower = buf.toLowerCase();
    const memberIdx = bufLower.indexOf(memberNameRaw.toLowerCase());
    if (memberIdx < 0) return;

    const memberEnd = memberIdx + memberNameRaw.length;
    const dobIdx = dobMatch.index ?? bufLower.indexOf(dobMatch[0].toLowerCase());
    if (dobIdx < 0 || dobIdx < memberEnd) return;

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

