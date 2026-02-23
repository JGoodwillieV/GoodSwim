// src/components/Roster.jsx
// Team roster management component
import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import Icon from './Icon';
import { supabase } from '../supabase';
import { checkMultipleResults, updateMultipleRecords } from '../utils/teamRecordsManager';
import { isValidTime } from '../utils/timeUtils';
import { parseMemberDirectoryPDF } from '../utils/rosterPdfParser';
import { useSubscription } from '../hooks/useSubscription';
import { useFeatureGate, UsageLimitBanner } from './gates';

export default function Roster({ 
  swimmers, 
  setSwimmers, 
  setViewSwimmer, 
  navigateTo, 
  setRecordBreaks, 
  setShowRecordModal,
  hideTitle = false
}) {
  const [showImport, setShowImport] = useState(false);
  const [importType, setImportType] = useState('roster'); 
  const [isImporting, setIsImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState(''); 
  const [importCourse, setImportCourse] = useState('SCY');
  const [importProgress, setImportProgress] = useState(null);
  const fileInputRef = useRef(null);

  // Subscription & Feature Access
  const { tier, swimmerCount, isTrial, canAddSwimmer, remainingSwimmers, getLimit, teamId: subTeamId, isPaid } = useSubscription();
  const sd3Access = useFeatureGate('sd3_import');
  const csvAccess = useFeatureGate('csv_import');
  const maxSwimmers = getLimit('max_swimmers');

  const syncBillingAfterRosterChange = async (teamId) => {
    if (!isPaid || !teamId) return;
    try {
      await supabase.functions.invoke('sync-swimmer-billing', {
        body: { team_id: teamId }
      });
    } catch (err) {
      console.warn('Billing sync failed (non-blocking):', err);
    }
  };

  // --- FILTER & SORT ---
  const filteredSwimmers = useMemo(() => {
    const filtered = swimmers.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return filtered.sort((a, b) => {
      const lastA = a.name.trim().split(' ').pop().toLowerCase();
      const lastB = b.name.trim().split(' ').pop().toLowerCase();
      
      if (lastA === lastB) {
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }
      return lastA.localeCompare(lastB);
    });
  }, [swimmers, searchQuery]);

  const calculateAge = (dobStr) => {
    if (!dobStr || dobStr.length !== 8) return null;
    const month = parseInt(dobStr.substring(0, 2)) - 1;
    const day = parseInt(dobStr.substring(2, 4));
    const year = parseInt(dobStr.substring(4, 8));
    const birthDate = new Date(year, month, day);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const dobMmddyyyyToIso = (dobStr) => {
    if (!dobStr || dobStr.length !== 8) return null;
    const mm = dobStr.substring(0, 2);
    const dd = dobStr.substring(2, 4);
    const yyyy = dobStr.substring(4, 8);
    if (!/^\d{2}$/.test(mm) || !/^\d{2}$/.test(dd) || !/^\d{4}$/.test(yyyy)) return null;
    return `${yyyy}-${mm}-${dd}`;
  };

  const normalizeSwimmerNameKey = (name) => {
    if (!name) return '';
    let n = String(name).trim();
    // Convert "Last, First ..." to "First Last" before normalizing
    if (n.includes(',')) {
      const parts = n.split(',').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const first = parts[1].split(/\s+/)[0];
        const last = parts[0];
        n = `${first} ${last}`;
      }
    }
    return n
      .toLowerCase()
      .replace(/['".]/g, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const mergeSwimmersById = (prev, nextRows) => {
    const byId = new Map(prev.map(s => [s.id, s]));
    nextRows.forEach((row) => {
      if (!row?.id) return;
      const existing = byId.get(row.id) || {};
      byId.set(row.id, { ...existing, ...row });
    });
    return Array.from(byId.values());
  };

  const getUserAndTeamContext = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) throw new Error('You must be logged in to import.');

    const { data: teamMember, error } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    if (!teamMember?.team_id) throw new Error('No team association found for your account.');

    return { userId: user.id, teamId: teamMember.team_id };
  };

  const handleRosterUpsert = async (incomingSwimmersRaw) => {
    // Deduplicate within the import file (by normalized name)
    const incomingByKey = new Map();
    incomingSwimmersRaw.forEach((s) => {
      const key = normalizeSwimmerNameKey(s?.name);
      if (!key) return;
      if (!incomingByKey.has(key)) {
        incomingByKey.set(key, s);
        return;
      }
      const prev = incomingByKey.get(key);
      // Merge: keep the most informative values (prefer non-empty, prefer non-default group)
      const prevGroup = prev?.group_name ? String(prev.group_name).trim() : '';
      const nextGroup = s?.group_name ? String(s.group_name).trim() : '';
      const chooseGroup = () => {
        const prevIsDefault = prevGroup.toLowerCase() === 'imported';
        const nextIsDefault = nextGroup.toLowerCase() === 'imported';
        if (nextGroup && !nextIsDefault) return nextGroup;
        if (prevGroup && !prevIsDefault) return prevGroup;
        return nextGroup || prevGroup || 'Imported';
      };
      incomingByKey.set(key, {
        ...prev,
        ...s,
        group_name: chooseGroup(),
        age: (typeof s?.age === 'number' ? s.age : prev?.age) ?? null,
        gender: s?.gender || prev?.gender || 'M',
        date_of_birth: s?.date_of_birth || prev?.date_of_birth || null
      });
    });

    const incomingSwimmers = Array.from(incomingByKey.values());

    // Match against existing swimmers (by normalized name within this team)
    const teamId = incomingSwimmers[0]?.team_id || null;
    const existingByKey = new Map();
    swimmers.forEach((s) => {
      if (teamId && s?.team_id && s.team_id !== teamId) return;
      const key = normalizeSwimmerNameKey(s?.name);
      if (!key) return;
      if (!existingByKey.has(key)) existingByKey.set(key, s);
    });

    const toInsert = [];
    const toUpdatePatches = [];
    incomingSwimmers.forEach((incoming) => {
      const key = normalizeSwimmerNameKey(incoming?.name);
      if (!key) return;
      const existing = existingByKey.get(key);
      if (!existing) {
        toInsert.push(incoming);
        return;
      }
      const patch = buildRosterUpdatePatch(existing, incoming);
      if (patch) toUpdatePatches.push(patch);
    });

    // Enforce swimmer limit for trial users (limit only applies to NEW inserts, not updates)
    let skippedNewDueToLimit = 0;
    if (maxSwimmers !== null && toInsert.length > 0) {
      const currentCount = swimmers.length;
      const availableSlots = Math.max(0, maxSwimmers - currentCount);
      if (availableSlots === 0) {
        skippedNewDueToLimit = toInsert.length;
        toInsert.splice(0);

        // Allow updates even if no slots remain
        if (toUpdatePatches.length === 0) {
          alert(`You've reached your swimmer limit (${maxSwimmers}). Please upgrade to add more swimmers.`);
          setShowImport(false);
          setIsImporting(false);
          return;
        }
      } else if (toInsert.length > availableSlots) {
        const originalCount = toInsert.length;
        skippedNewDueToLimit = Math.max(0, originalCount - availableSlots);
        toInsert.splice(availableSlots);
      }
    }

    if (toInsert.length === 0 && toUpdatePatches.length === 0) {
      alert('No valid roster records found.');
      return;
    }

    let updatedRows = [];
    let insertedRows = [];

    if (toUpdatePatches.length > 0) {
      const { data, error } = await supabase.from('swimmers').upsert(toUpdatePatches).select();
      if (error) throw error;
      updatedRows = data || [];
    }

    if (toInsert.length > 0) {
      const { data, error } = await supabase.from('swimmers').insert(toInsert).select();
      if (error) throw error;
      insertedRows = data || [];
    }

    if (updatedRows.length > 0 || insertedRows.length > 0) {
      setSwimmers(prev => mergeSwimmersById(prev, [...updatedRows, ...insertedRows]));
    }

    // Sync billing if swimmers were added
    if (insertedRows.length > 0) {
      syncBillingAfterRosterChange(teamId);
    }

    const addedCount = insertedRows.length;
    const updatedCount = updatedRows.length;
    const skippedNote = skippedNewDueToLimit > 0
      ? ` (Skipped ${skippedNewDueToLimit} new swimmer${skippedNewDueToLimit === 1 ? '' : 's'} due to plan limit.)`
      : '';
    if (addedCount > 0 && updatedCount > 0) {
      alert(`Roster import complete: ${addedCount} added, ${updatedCount} updated.${skippedNote}`);
    } else if (addedCount > 0) {
      alert(`Successfully imported ${addedCount} new swimmer${addedCount === 1 ? '' : 's'}!${skippedNote}`);
    } else {
      alert(`Roster import complete: ${updatedCount} updated.${skippedNote}`);
    }
    setShowImport(false);
  };

  const buildRosterUpdatePatch = (existing, incoming) => {
    if (!existing?.id || !incoming) return null;
    const patch = { id: existing.id };

    // Update name if import provides a cleaned formatting (but avoid blank)
    if (incoming.name && incoming.name.trim() && incoming.name.trim() !== (existing.name || '').trim()) {
      patch.name = incoming.name.trim();
    }

    // Group: only overwrite when incoming is meaningful OR existing is empty/unassigned/imported
    const incomingGroup = incoming.group_name ? String(incoming.group_name).trim() : '';
    const existingGroup = existing.group_name ? String(existing.group_name).trim() : '';
    if (incomingGroup) {
      const incomingIsDefault = incomingGroup.toLowerCase() === 'imported';
      const existingIsEmptyOrDefault =
        !existingGroup ||
        existingGroup.toLowerCase() === 'unassigned' ||
        existingGroup.toLowerCase() === 'imported';
      if ((!incomingIsDefault && incomingGroup !== existingGroup) || (incomingIsDefault && existingIsEmptyOrDefault && incomingGroup !== existingGroup)) {
        patch.group_name = incomingGroup;
      }
    }

    // Only fill in missing demographic data, or update when changed and import provides a value
    if (incoming.gender && incoming.gender !== existing.gender) {
      // Only set gender if missing, or if existing is invalid/empty
      if (!existing.gender) patch.gender = incoming.gender;
    }

    if (typeof incoming.age === 'number' && Number.isFinite(incoming.age) && incoming.age > 0) {
      if (existing.age == null || existing.age !== incoming.age) patch.age = incoming.age;
    }

    if (incoming.date_of_birth) {
      if (!existing.date_of_birth || String(existing.date_of_birth).slice(0, 10) !== String(incoming.date_of_birth).slice(0, 10)) {
        patch.date_of_birth = incoming.date_of_birth;
      }
    }

    // Only set status/efficiency_score if missing (don't overwrite coach edits)
    if (incoming.status && !existing.status) patch.status = incoming.status;
    if (typeof incoming.efficiency_score === 'number' && existing.efficiency_score == null) patch.efficiency_score = incoming.efficiency_score;

    // USA Swimming ID: update if incoming provides one and existing is missing or different
    if (incoming.usa_swimming_id) {
      if (!existing.usa_swimming_id || existing.usa_swimming_id !== incoming.usa_swimming_id) {
        patch.usa_swimming_id = incoming.usa_swimming_id;
      }
    }

    // Parent email: update if incoming provides one and existing is missing
    if (incoming.parent_email && !existing.parent_email) {
      patch.parent_email = incoming.parent_email;
    }

    // Parent account name: update if incoming provides one and existing is missing
    if (incoming.parent_account_name && !existing.parent_account_name) {
      patch.parent_account_name = incoming.parent_account_name;
    }

    const changedKeys = Object.keys(patch).filter(k => k !== 'id');
    return changedKeys.length > 0 ? patch : null;
  };

  // --- CSV ROSTER IMPORT (smart column detection) ---
  const COLUMN_MATCHERS = {
    name:                 ['name', 'swimmer name', 'swimmer', 'full name', 'athlete', 'athlete name'],
    first_name:           ['first name', 'first', 'fname'],
    last_name:            ['last name', 'last', 'lname', 'surname'],
    group_name:           ['group', 'group name', 'practice group', 'squad', 'team group', 'level'],
    age:                  ['age'],
    gender:               ['gender', 'sex', 'm/f', 'male/female'],
    date_of_birth:        ['date of birth', 'dob', 'birthday', 'birth date', 'birthdate', 'birth_date'],
    usa_swimming_id:      ['usa swimming id', 'usas id', 'usa-s id', 'member id', 'registration id', 'usas #', 'usa_swimming_id', 'uss id', 'uss#'],
    parent_email:         ['parent email', 'guardian email', 'email', 'parent_email', 'contact email'],
    parent_account_name:  ['parent name', 'guardian name', 'parent', 'guardian', 'parent_name', 'contact name', 'account name'],
  };

  const detectColumnMapping = (headerRow) => {
    const mapping = {};
    const headers = headerRow.map(h => String(h).trim().toLowerCase());

    for (const [field, aliases] of Object.entries(COLUMN_MATCHERS)) {
      const idx = headers.findIndex(h => aliases.includes(h));
      if (idx !== -1) mapping[field] = idx;
    }
    return mapping;
  };

  const parseDateValue = (val) => {
    if (!val) return null;
    if (val instanceof Date) {
      const y = val.getFullYear();
      const m = String(val.getMonth() + 1).padStart(2, '0');
      const d = String(val.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    const s = String(val).trim();
    // ISO: YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // US: MM/DD/YYYY or M/D/YYYY
    const usMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (usMatch) return `${usMatch[3]}-${usMatch[1].padStart(2, '0')}-${usMatch[2].padStart(2, '0')}`;
    // US short: MM/DD/YY
    const usShort = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    if (usShort) {
      const century = parseInt(usShort[3]) > 50 ? '19' : '20';
      return `${century}${usShort[3]}-${usShort[1].padStart(2, '0')}-${usShort[2].padStart(2, '0')}`;
    }
    return null;
  };

  const parseGenderValue = (val) => {
    if (!val) return null;
    const s = String(val).trim().toUpperCase();
    if (s === 'M' || s === 'MALE' || s === 'BOY') return 'M';
    if (s === 'F' || s === 'FEMALE' || s === 'GIRL') return 'F';
    return null;
  };

  const computeAgeFromDob = (isoDate) => {
    if (!isoDate) return null;
    const [year, month, day] = isoDate.split('-').map(Number);
    const dob = new Date(year, month - 1, day);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  const handleCSVRosterImport = async (rows) => {
    if (!rows || rows.length < 2) {
      alert('File appears empty or has no data rows.');
      return;
    }

    const mapping = detectColumnMapping(rows[0]);

    // Must have at least a name column (or first+last)
    const hasName = mapping.name != null || (mapping.first_name != null && mapping.last_name != null);
    if (!hasName) {
      alert('Could not detect a "Name" column in your file.\n\nPlease use the downloadable template or make sure your header row includes a "Name" column.');
      return;
    }

    const { userId, teamId } = await getUserAndTeamContext();
    const incoming = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every(cell => !cell && cell !== 0)) continue;

      let name = '';
      if (mapping.name != null) {
        name = String(row[mapping.name] ?? '').trim();
        // Handle "Last, First" format
        if (name.includes(',')) {
          const parts = name.split(',').map(p => p.trim());
          if (parts.length >= 2) name = `${parts[1]} ${parts[0]}`;
        }
      } else {
        const first = String(row[mapping.first_name] ?? '').trim();
        const last = String(row[mapping.last_name] ?? '').trim();
        name = `${first} ${last}`.trim();
      }

      if (!name) continue;

      // Title-case the name
      name = name.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      const dob = mapping.date_of_birth != null ? parseDateValue(row[mapping.date_of_birth]) : null;
      const ageRaw = mapping.age != null ? parseInt(row[mapping.age]) : null;
      const age = (Number.isFinite(ageRaw) && ageRaw > 0) ? ageRaw : computeAgeFromDob(dob);

      incoming.push({
        name,
        group_name: mapping.group_name != null ? (String(row[mapping.group_name] ?? '').trim() || 'Imported') : 'Imported',
        status: 'New',
        efficiency_score: 70,
        age,
        gender: mapping.gender != null ? parseGenderValue(row[mapping.gender]) : null,
        date_of_birth: dob,
        usa_swimming_id: mapping.usa_swimming_id != null ? (String(row[mapping.usa_swimming_id] ?? '').trim() || null) : null,
        parent_email: mapping.parent_email != null ? (String(row[mapping.parent_email] ?? '').trim() || null) : null,
        parent_account_name: mapping.parent_account_name != null ? (String(row[mapping.parent_account_name] ?? '').trim() || null) : null,
        coach_id: userId,
        team_id: teamId,
      });
    }

    if (incoming.length === 0) {
      alert('No valid swimmer rows found in the file.');
      return;
    }

    await handleRosterUpsert(incoming);
  };

  // CSV Parser
  const parseCSVWithQuotes = (text) => {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') { 
          currentCell += '"'; 
          i++; 
        } else { 
          inQuotes = !inQuotes; 
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (currentCell || currentRow.length > 0) { 
          currentRow.push(currentCell.trim()); 
          rows.push(currentRow); 
          currentRow = []; 
          currentCell = ''; 
        }
        if (char === '\r' && nextChar === '\n') i++; 
      } else { 
        currentCell += char; 
      }
    }
    
    if (currentCell || currentRow.length > 0) { 
      currentRow.push(currentCell.trim()); 
      rows.push(currentRow); 
    }
    return rows;
  };

  // --- IMPORT HANDLER (Supports CSV & Excel Rows) ---
  const handleResultsImport = async (rows, progressPrefix = '') => {
    const { teamId } = await getUserAndTeamContext();
    const entriesToInsert = [];
    const swimmerMap = {}; 
    const swimmerGenderUpdates = {};
    
    setImportProgress(prev => ({ ...prev, step: `${progressPrefix}Matching swimmers...` }));
    
    // Build Name Map (include full swimmer object for gender checking)
    swimmers.forEach(s => {
      if (s?.team_id && s.team_id !== teamId) return;
      const parts = s.name.toLowerCase().trim().split(' ');
      const first = parts[0];
      const last = parts[parts.length - 1];
      swimmerMap[`${last}, ${first}`] = { id: s.id, gender: s.gender };
      swimmerMap[`${last},${first}`] = { id: s.id, gender: s.gender };
    });

    // Skip header (i=1)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 5) continue; 

      const nameCell = row[1]; 
      const eventCell = row[2]; 
      const prelimTime = row[4];
      const finalsTime = row[5]; 
      const dateVal = row[10];  

      if (!nameCell) continue;

      let rawName = String(nameCell).split('\n')[0].replace(/['"]/g, '').trim().toLowerCase();
      let swimmerInfo = null;
      
      if (rawName.includes(',')) {
        const p = rawName.split(',');
        const last = p[0].trim();
        const firstChunk = p[1].trim().split(' ')[0]; 
        const key = `${last}, ${firstChunk}`;
        if (swimmerMap[key]) swimmerInfo = swimmerMap[key];
      }

      if (swimmerInfo) {
        const targetId = swimmerInfo.id;
        let cleanEvent = String(eventCell).replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Extract gender from event cell (e.g., "Male (9-10) 50 Free" or "Female (11-12) 100 Fly")
        // Only update gender if swimmer doesn't already have one set
        if (!swimmerInfo.gender && !swimmerGenderUpdates[targetId]) {
          const eventLower = cleanEvent.toLowerCase();
          if (eventLower.startsWith('male') || eventLower.includes(' male ') || eventLower.includes('boys')) {
            swimmerGenderUpdates[targetId] = 'M';
          } else if (eventLower.startsWith('female') || eventLower.includes(' female ') || eventLower.includes('girls')) {
            swimmerGenderUpdates[targetId] = 'F';
          }
        }
        
        // Handle Date (Excel Object vs CSV String)
        let cleanDate = new Date().toISOString().split('T')[0];
        if (dateVal) {
          if (dateVal instanceof Date) {
            // Extract date in local timezone to avoid timezone shift
            const year = dateVal.getFullYear();
            const month = String(dateVal.getMonth() + 1).padStart(2, '0');
            const day = String(dateVal.getDate()).padStart(2, '0');
            cleanDate = `${year}-${month}-${day}`;
          } else if (typeof dateVal === 'string' && dateVal.includes('/')) {
            const dParts = dateVal.split('/'); 
            if (dParts.length === 3) {
              cleanDate = `20${dParts[2]}-${dParts[0].padStart(2, '0')}-${dParts[1].padStart(2, '0')}`;
            }
          }
        }

        if (isValidTime(prelimTime)) {
          entriesToInsert.push({ 
            team_id: teamId,
            swimmer_id: targetId, 
            event: `${cleanEvent} (Prelim)`, 
            time: String(prelimTime), 
            date: cleanDate, 
            video_url: null,
            course: importCourse
          });
        }
        if (isValidTime(finalsTime)) {
          entriesToInsert.push({ 
            team_id: teamId,
            swimmer_id: targetId, 
            event: `${cleanEvent} (Finals)`, 
            time: String(finalsTime), 
            date: cleanDate, 
            video_url: null,
            course: importCourse
          });
        }
      }
    }

    if (entriesToInsert.length > 0) {
      // Duplicate Check
      setImportProgress(prev => ({ ...prev, step: `${progressPrefix}Checking ${entriesToInsert.length} results for duplicates...` }));
      const uniqueSwimmerIds = [...new Set(entriesToInsert.map(e => e.swimmer_id))];
      const { data: existingData } = await supabase
        .from('results')
        .select('swimmer_id, event, time, date')
        .eq('team_id', teamId)
        .in('swimmer_id', uniqueSwimmerIds);

      const existingSignatures = new Set(
        existingData?.map(r => `${r.swimmer_id}|${r.event}|${r.time}|${r.date}`)
      );
      
      const newEntries = entriesToInsert.filter(
        e => !existingSignatures.has(`${e.swimmer_id}|${e.event}|${e.time}|${e.date}`)
      );

      if (newEntries.length > 0) {
        setImportProgress(prev => ({ ...prev, step: `${progressPrefix}Importing ${newEntries.length} new results...` }));
        const { error } = await supabase.from('results').insert(newEntries);
        
        if (error) {
          const msg = String(error?.message || 'Unknown error');
          if (msg.toLowerCase().includes('row-level security')) {
            return { error: `Permission error: your account doesn't have access to import results for this team.\n\nDetails: ${msg}` };
          } else {
            return { error: 'Database error: ' + msg };
          }
        } else { 
          // Update swimmer genders if we found any (batched in parallel)
          const genderUpdateIds = Object.keys(swimmerGenderUpdates);
          let genderUpdateCount = 0;
          if (genderUpdateIds.length > 0) {
            const genderResults = await Promise.all(
              genderUpdateIds.map(swimmerId =>
                supabase
                  .from('swimmers')
                  .update({ gender: swimmerGenderUpdates[swimmerId] })
                  .eq('id', swimmerId)
              )
            );
            genderUpdateCount = genderResults.filter(r => !r.error).length;
            
            if (genderUpdateCount > 0) {
              setSwimmers(prev => prev.map(s => {
                if (swimmerGenderUpdates[s.id]) {
                  return { ...s, gender: swimmerGenderUpdates[s.id] };
                }
                return s;
              }));
            }
          }
          
          // Check for team record breaks
          setImportProgress(prev => ({ ...prev, step: `${progressPrefix}Checking for team record breaks...` }));
          
          let breaks = [];
          try {
            breaks = await checkMultipleResults(newEntries) || [];
          } catch (err) {
            console.error('Error checking for record breaks:', err);
          }
          
          return { imported: newEntries.length, duplicates: entriesToInsert.length - newEntries.length, genderUpdates: genderUpdateCount, recordBreaks: breaks };
        }
      } else {
        return { imported: 0, duplicates: entriesToInsert.length, genderUpdates: 0, recordBreaks: 0 };
      }
    } else {
      return { imported: 0, duplicates: 0, matched: 0, genderUpdates: 0, recordBreaks: 0 };
    }
  };

  // Helper: read a single file and return parsed rows
  const readFileToRows = (file) => {
    return new Promise((resolve, reject) => {
      const isExcel = file.name.match(/\.(xls|xlsx)$/i);
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          if (isExcel) {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            resolve(XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }));
          } else {
            resolve(parseCSVWithQuotes(event.target.result));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      
      if (isExcel) reader.readAsArrayBuffer(file);
      else reader.readAsText(file);
    });
  };

  // --- FILE SELECTION & PARSING (supports multiple files) ---
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    
    setIsImporting(true);
    setImportProgress({ totalFiles: files.length, currentFile: 0, step: 'Starting...' });

    try {
      // Roster imports (single file only)
      if (importType === 'roster') {
        const file = files[0];
        const isPdf = file.name.match(/\.pdf$/i);
        const isSD3 = file.name.match(/\.sd3$/i);
        const isSpreadsheet = file.name.match(/\.(csv|xls|xlsx)$/i);
        
        if (isSpreadsheet) {
          // CSV/Excel roster import — available on all tiers
          if (!csvAccess.isUnlocked) {
            alert(`CSV/Excel Roster Import requires ${csvAccess.requiredTierDisplay} plan. Please upgrade to use this feature.`);
            setShowImport(false);
            return;
          }
          setImportProgress({ totalFiles: 1, currentFile: 1, step: 'Reading spreadsheet...' });
          const rows = await readFileToRows(file);
          setImportProgress({ totalFiles: 1, currentFile: 1, step: 'Mapping columns & importing...' });
          await handleCSVRosterImport(rows);
        } else if (isPdf) {
          if (!sd3Access.isUnlocked) {
            alert(`Roster PDF Import requires ${sd3Access.requiredTierDisplay} plan. Please upgrade to use this feature.`);
            setShowImport(false);
            return;
          }
          setImportProgress({ totalFiles: 1, currentFile: 1, step: 'Parsing PDF...' });
          const { userId, teamId } = await getUserAndTeamContext();
          const parsed = await parseMemberDirectoryPDF(file);
          const excluded = new Set(['coaches', 'board members']);
          const incoming = parsed
            .filter(p => p?.name)
            .filter(p => !(p?.group_name && excluded.has(String(p.group_name).toLowerCase())))
            .map((p) => ({
              name: p.name,
              group_name: p.group_name || 'Imported',
              status: 'New',
              efficiency_score: 70,
              age: p.date_of_birth ? (() => {
                const [year, month, day] = p.date_of_birth.split('-').map(Number);
                const dob = new Date(year, month - 1, day);
                const today = new Date();
                let age = today.getFullYear() - dob.getFullYear();
                const m = today.getMonth() - dob.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
                return age;
              })() : null,
              gender: null,
              date_of_birth: p.date_of_birth || null,
              usa_swimming_id: p.usa_swimming_id || null,
              parent_email: p.parent_email || null,
              parent_account_name: p.parent_account_name || null,
              coach_id: userId,
              team_id: teamId
            }));
          await handleRosterUpsert(incoming);
        } else if (isSD3) {
          if (!sd3Access.isUnlocked) {
            alert(`Roster Import (SD3/PDF) requires ${sd3Access.requiredTierDisplay} plan. Please upgrade to use this feature.`);
            setShowImport(false);
            return;
          }
          setImportProgress({ totalFiles: 1, currentFile: 1, step: 'Parsing SD3...' });
          const text = await file.text();
          const incomingSwimmersRaw = await parseSD3Roster(text);
          await handleRosterUpsert(incomingSwimmersRaw);
        } else {
          alert('Unsupported file type. Please upload a CSV, Excel (.xls/.xlsx), SD3, or PDF file.');
        }
        return;
      }

      // Results imports (supports multiple files)
      const resultFiles = files.filter(f => f.name.match(/\.(csv|xls|xlsx)$/i));
      if (!resultFiles.length) {
        alert('No valid result files found. Please upload .csv, .xls, or .xlsx files.');
        return;
      }

      let totalImported = 0;
      let totalDuplicates = 0;
      let totalGenderUpdates = 0;
      const allRecordBreaks = [];
      const errors = [];

      // Detect first-ever import: if no existing team records, skip the modal
      let isFirstImport = false;
      try {
        const { teamId: importTeamId } = await getUserAndTeamContext();
        const { count } = await supabase
          .from('team_records')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', importTeamId);
        isFirstImport = !count;
      } catch (e) {
        console.error('Error checking for first import:', e);
      }

      for (let i = 0; i < resultFiles.length; i++) {
        const file = resultFiles[i];
        const fileLabel = resultFiles.length > 1 ? `[${i + 1}/${resultFiles.length}] ${file.name}: ` : '';
        
        setImportProgress({ 
          totalFiles: resultFiles.length, 
          currentFile: i + 1, 
          fileName: file.name,
          step: `${fileLabel}Reading file...` 
        });

        try {
          const rows = await readFileToRows(file);
          const result = await handleResultsImport(rows, fileLabel);
          
          if (result?.error) {
            errors.push(`${file.name}: ${result.error}`);
          } else if (result) {
            totalImported += result.imported || 0;
            totalDuplicates += result.duplicates || 0;
            totalGenderUpdates += result.genderUpdates || 0;
            if (result.recordBreaks?.length) {
              allRecordBreaks.push(...result.recordBreaks);
            }
          }
        } catch (err) {
          console.error(`Error processing ${file.name}:`, err);
          errors.push(`${file.name}: ${err.message}`);
        }
      }

      // Show record modal only after ALL files are done
      if (allRecordBreaks.length > 0) {
        if (isFirstImport) {
          // First import ever — silently save initial records without the celebration modal
          try {
            await updateMultipleRecords(allRecordBreaks);
            console.log(`First import: silently saved ${allRecordBreaks.length} initial team records`);
          } catch (e) {
            console.error('Error auto-saving initial records:', e);
          }
        } else {
          setRecordBreaks(allRecordBreaks);
          setShowRecordModal(true);
        }
      }

      // Show final summary
      setImportProgress(prev => ({ ...prev, step: 'Complete!' }));
      
      let summary = `Imported ${totalImported} results`;
      if (totalDuplicates > 0) summary += ` (${totalDuplicates} duplicates skipped)`;
      if (allRecordBreaks.length > 0 && !isFirstImport) summary += `\n\n${allRecordBreaks.length} TEAM RECORD(S) BROKEN! Check the modal.`;
      if (allRecordBreaks.length > 0 && isFirstImport) summary += `\n\n${allRecordBreaks.length} initial team record(s) saved.`;
      if (totalGenderUpdates > 0) summary += `\n\nUpdated gender for ${totalGenderUpdates} swimmer(s).`;
      if (resultFiles.length > 1) summary = `Processed ${resultFiles.length} files.\n\n${summary}`;
      if (errors.length > 0) summary += `\n\nErrors:\n${errors.join('\n')}`;
      
      alert(totalImported > 0 ? `Success! ${summary}` : (errors.length > 0 ? summary : 'No new results found. All entries were duplicates.'));
      setShowImport(false);
    } catch (err) {
      console.error(err);
      alert('Error importing: ' + err.message);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      e.target.value = null;
    }
  };

  // SD3 Logic
  const parseSD3Roster = async (text) => {
    const lines = text.split(/\r\n|\n/);
    const newEntries = [];
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get team_id from team_members table
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (!teamMember || !teamMember.team_id) {
      throw new Error('No team association found for your account.');
    }
    
    const d0Regex = /^D0\d[A-Z0-9]{2,6}\s+(.+?)\s+[A-Z0-9]{8,}/;
    
    lines.forEach((line) => {
      if (line.startsWith('D0')) {
        let cleanName = '';
        let age = null;
        let gender = 'M';
        let date_of_birth = null;
        const match = line.match(d0Regex);
        
        if (match && match[1]) {
          cleanName = match[1].trim();
        } else {
          let rawSection = line.substring(5, 45);
          cleanName = rawSection
            .replace(/^[A-Z0-9]{2,6}\s+/, '')
            .trim()
            .replace(/\s+[A-Z0-9]{5,}$/, '')
            .trim();
        }
        
        if (cleanName) {
          cleanName = cleanName.replace(/\s[A-Z0-9]{6,}$/i, '').trim();
          const dobStr = line.substring(55, 63).trim();
          age = calculateAge(dobStr);
          date_of_birth = dobMmddyyyyToIso(dobStr);
          const genderMatch = line.match(/\d{8}\s*\d{1,2}([MF])/);
          if (genderMatch) gender = genderMatch[1];

          if (cleanName.includes(',')) {
            const parts = cleanName.split(',');
            if (parts.length >= 2) {
              cleanName = `${parts[1].trim()} ${parts[0].trim()}`;
            }
          }
          
          const formattedName = cleanName
            .toLowerCase()
            .split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
            
          newEntries.push({ 
            name: formattedName, 
            group_name: 'Imported', 
            status: 'New', 
            efficiency_score: 70, 
            age, 
            gender, 
            date_of_birth,
            coach_id: user.id,
            team_id: teamMember.team_id
          });
        }
      }
    });
    
    return newEntries;
  };

  const handleAddManual = async () => {
    const name = window.prompt('Enter Swimmer Name:');
    if (!name) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get team_id from team_members table
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (!teamMember || !teamMember.team_id) {
      alert('Unable to add swimmer: No team association found.');
      return;
    }
    
    const newSwimmer = { 
      name, 
      group_name: 'Unassigned', 
      status: 'New', 
      efficiency_score: 50, 
      coach_id: user.id,
      team_id: teamMember.team_id
    };
    
    const { data, error } = await supabase.from('swimmers').insert([newSwimmer]).select();
    if (!error) {
      setSwimmers(prev => [...prev, ...data]);
      syncBillingAfterRosterChange(teamMember.team_id);
    }
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col relative pb-24 md:pb-8">
      <header className="flex flex-col md:flex-row justify-between md:items-center mb-8 shrink-0 gap-4">
        {!hideTitle && <h2 className="text-2xl font-bold text-slate-800">Team Roster</h2>}
        
        <div className="relative w-full md:w-64">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search roster..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
          />
        </div>

        <div className="flex gap-3 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <button 
            onClick={() => { setImportType('results'); setShowImport(true); }} 
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 hover:text-blue-600 transition-colors whitespace-nowrap"
          >
            <Icon name="trophy" size={16} /> Import Results
          </button>
          <button 
            onClick={() => { setImportType('roster'); setShowImport(true); }} 
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Icon name="file-up" size={16} /> Import Roster
          </button>
          <button 
            onClick={handleAddManual} 
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Icon name="plus" size={16} /> Add Swimmer
          </button>
        </div>
      </header>
      
      {/* Roster Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-y-auto flex-1 min-h-0 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-4 font-medium bg-slate-50">Name</th>
              <th className="px-6 py-4 font-medium bg-slate-50">Group</th>
              <th className="px-6 py-4 font-medium bg-slate-50">Gender</th>
              <th className="px-6 py-4 font-medium bg-slate-50">Age</th>
              <th className="px-6 py-4 font-medium bg-slate-50">Date of Birth</th>
              <th className="px-6 py-4 font-medium text-right bg-slate-50">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredSwimmers.length > 0 ? filteredSwimmers.map(s => (
              <tr 
                key={s.id} 
                onClick={() => setViewSwimmer(s)} 
                className="hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                <td className="px-6 py-4 text-slate-500">{s.group_name || 'Unassigned'}</td>
                <td className="px-6 py-4 text-slate-600">
                  {s.gender || '-'}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {s.age || '-'}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {s.date_of_birth ? (() => {
                    // Parse as local date to avoid timezone shift
                    // date_of_birth is stored as YYYY-MM-DD, parse parts directly
                    const [year, month, day] = s.date_of_birth.split('-').map(Number);
                    return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`;
                  })() : '-'}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    Edit
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                  No swimmers match "{searchQuery}"
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">
                {importType === 'roster' ? 'Import Team Roster' : 'Import Meet Results'}
              </h3>
              <button 
                onClick={() => setShowImport(false)} 
                className="text-slate-400 hover:text-slate-600"
              >
                <Icon name="x" size={20} />
              </button>
            </div>

            {/* Show swimmer limit warning for trial users */}
            {importType === 'roster' && maxSwimmers !== null && (
              <div className="mb-4">
                <UsageLimitBanner 
                  limitKey="max_swimmers"
                  currentUsage={swimmers.length}
                  showWhenUnderLimit={true}
                />
              </div>
            )}

            {/* Roster import options */}
            {importType === 'roster' && (
              <div className="mb-4 space-y-3">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <Icon name="download" size={18} className="text-blue-600 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-800 text-sm">Need a template?</p>
                      <p className="text-xs text-blue-600 mt-0.5 mb-2">Download our CSV template to see the expected format, then fill it in with your swimmers.</p>
                      <a
                        href="/roster_template.csv"
                        download="roster_template.csv"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 underline underline-offset-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon name="file-spreadsheet" size={14} /> Download CSV Template
                      </a>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  <span className="font-medium text-slate-600">Supported formats:</span> CSV, Excel (.xls/.xlsx){sd3Access.isUnlocked ? ', SD3, Member Directory PDF' : ''}
                </p>

                {!sd3Access.isUnlocked && !csvAccess.isUnlocked && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <Icon name="lock" size={18} className="text-amber-600" />
                      <div>
                        <p className="font-medium text-amber-800 text-sm">Roster Import requires an upgrade</p>
                        <p className="text-xs text-amber-600">Upgrade your plan to import rosters</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Course selector for results import */}
            {importType === 'results' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Course Type</label>
                <div className="flex items-center bg-slate-100 rounded-lg p-1 w-fit">
                  {['SCY', 'LCM'].map((c) => (
                    <button
                      key={c}
                      onClick={() => setImportCourse(c)}
                      className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                        importCourse === c
                          ? 'bg-white text-blue-700 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {c === 'SCY' ? 'SCY (Short Course Yards)' : 'LCM (Long Course Meters)'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileSelect} 
              className="hidden" 
              accept={importType === 'roster' ? '.csv,.xls,.xlsx,.sd3,.pdf' : '.csv,.xls,.xlsx'}
              multiple={importType === 'results'}
            />
            
            {isImporting && importProgress ? (
              <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center mb-6 border-blue-200 bg-blue-50/50">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4 bg-blue-100 text-blue-600">
                  <Icon name="loader-2" size={24} className="animate-spin" />
                </div>
                
                {importProgress.totalFiles > 1 && (
                  <p className="text-sm font-semibold text-blue-700 mb-2">
                    File {importProgress.currentFile} of {importProgress.totalFiles}
                    {importProgress.fileName && <span className="font-normal text-blue-500"> — {importProgress.fileName}</span>}
                  </p>
                )}
                
                <p className="text-slate-700 font-medium mb-3">{importProgress.step}</p>
                
                {importProgress.totalFiles > 1 && (
                  <div className="w-full max-w-xs">
                    <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${(importProgress.currentFile / importProgress.totalFiles) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-blue-400 mt-1">{Math.round((importProgress.currentFile / importProgress.totalFiles) * 100)}%</p>
                  </div>
                )}
              </div>
            ) : (
              <div 
                onClick={() => {
                  const rosterLocked = importType === 'roster' && !csvAccess.isUnlocked && !sd3Access.isUnlocked;
                  if (rosterLocked) {
                    window.dispatchEvent(new CustomEvent('navigate', { detail: 'billing' }));
                    return;
                  }
                  fileInputRef.current.click();
                }} 
                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center mb-6 group cursor-pointer transition-colors ${
                  importType === 'roster' && !csvAccess.isUnlocked && !sd3Access.isUnlocked
                    ? 'border-slate-200 bg-slate-50 opacity-90'
                    : importType === 'results' 
                      ? 'border-yellow-300 hover:bg-yellow-50 bg-slate-50' 
                      : 'border-slate-300 hover:bg-slate-100 hover:border-blue-400 bg-slate-50'
                }`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${
                  importType === 'results' 
                    ? 'bg-yellow-100 text-yellow-600' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  <Icon name={importType === 'results' ? 'trophy' : 'file-up'} size={24} />
                </div>
                <p className="text-slate-800 font-bold text-lg mb-1">
                  {(importType === 'roster' && !csvAccess.isUnlocked && !sd3Access.isUnlocked)
                    ? 'Upgrade to Import'
                    : 'Drag & drop or click to upload'}
                </p>
                {importType === 'results' && (
                  <p className="text-slate-400 text-sm">You can select multiple files at once</p>
                )}
                {importType === 'roster' && (csvAccess.isUnlocked || sd3Access.isUnlocked) && (
                  <p className="text-slate-400 text-sm">CSV, Excel{sd3Access.isUnlocked ? ', SD3, or PDF' : ''}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

