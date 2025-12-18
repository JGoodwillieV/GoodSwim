// Team Records Manager
// Handles automatic detection and updates of team records

import { supabase } from '../supabase';

/**
 * Converts time string to seconds for comparison
 */
export function timeToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 999999;
  
  const clean = timeStr.trim().replace(/[^\d:.]/g, '');
  
  // Handle MM:SS.ss format
  if (clean.includes(':')) {
    const [mins, secs] = clean.split(':');
    return parseFloat(mins) * 60 + parseFloat(secs || 0);
  }
  
  // Handle SS.ss format
  return parseFloat(clean);
}

/**
 * Formats seconds into time display string
 */
export function secondsToTimeDisplay(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return mins > 0 ? `${mins}:${secs.padStart(5, '0')}` : secs;
}

/**
 * Extracts base event name from full event string
 * e.g., "Female (11/12) 50 Free (Prelim)" -> "50 Free"
 */
export function extractEventName(fullEvent) {
  if (!fullEvent) return '';
  
  // Remove prelim/finals markers and gender/age group info
  let clean = fullEvent.replace(/\s*\((Finals|Prelim)\)/i, '');
  clean = clean.replace(/^(Male|Female)\s*\([^)]+\)\s*/i, '');
  
  // Extract distance and stroke
  const match = clean.match(/(\d+)\s*(?:M|Y)?\s*(Free|Back|Breast|Fly|IM|Freestyle|Backstroke|Breaststroke|Butterfly|Ind\.?\s*Medley)/i);
  
  if (match) {
    const distance = match[1];
    let stroke = match[2];
    
    // Normalize stroke names
    if (stroke.toLowerCase().includes('free')) stroke = 'Free';
    else if (stroke.toLowerCase().includes('back')) stroke = 'Back';
    else if (stroke.toLowerCase().includes('breast')) stroke = 'Breast';
    else if (stroke.toLowerCase().includes('fly') || stroke.toLowerCase().includes('butter')) stroke = 'Fly';
    else if (stroke.toLowerCase().includes('im') || stroke.toLowerCase().includes('medley')) stroke = 'IM';
    
    return `${distance} ${stroke}`;
  }
  
  return clean.trim();
}

/**
 * Determines age group from age
 */
export function getAgeGroup(age) {
  if (age <= 8) return '8 & Under';
  if (age <= 10) return '9/10';
  if (age <= 12) return '11/12';
  if (age <= 14) return '13/14';
  return '15 & Over';
}

/**
 * Normalizes gender format (M/F -> Male/Female)
 */
export function normalizeGender(gender) {
  if (!gender) return null;
  const g = gender.toString().toUpperCase();
  if (g === 'M' || g === 'MALE') return 'Male';
  if (g === 'F' || g === 'FEMALE') return 'Female';
  return null;
}

/**
 * Checks if a result breaks a team record
 * @param {Object} result - The swim result to check
 * @param {string} result.swimmer_id - ID of the swimmer
 * @param {string} result.event - Event name
 * @param {string} result.time - Time string
 * @param {string} result.date - Date of the swim
 * @returns {Promise<Object|null>} Record break info or null if no record broken
 */
export async function checkForRecordBreak(result) {
  try {
    console.log('  Checking result:', result);
    
    // 1. Get swimmer info
    const { data: swimmer, error: swimmerError } = await supabase
      .from('swimmers')
      .select('name, date_of_birth, gender')
      .eq('id', result.swimmer_id)
      .single();
    
    if (swimmerError || !swimmer) {
      console.error('  ❌ Error fetching swimmer:', swimmerError);
      return null;
    }
    
    console.log('  ✅ Swimmer:', swimmer.name, 'Gender:', swimmer.gender);
    
    // 2. Calculate swimmer's age on the date of the swim
    const swimDate = new Date(result.date);
    const birthDate = new Date(swimmer.date_of_birth);
    let age = swimDate.getFullYear() - birthDate.getFullYear();
    const monthDiff = swimDate.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && swimDate.getDate() < birthDate.getDate())) {
      age--;
    }
    console.log('  ✅ Age on', result.date, ':', age);
    
    // 3. Extract event name and convert time to seconds
    const eventName = extractEventName(result.event);
    const timeSeconds = timeToSeconds(result.time);
    console.log('  ✅ Event extracted:', result.event, '→', eventName);
    console.log('  ✅ Time converted:', result.time, '→', timeSeconds, 'seconds');
    
    if (timeSeconds >= 999999 || !eventName) {
      console.log('  ❌ Invalid time or event');
      return null; // Invalid time or event
    }
    
    // 4. Determine age group and normalize gender
    const ageGroup = getAgeGroup(age);
    const gender = normalizeGender(swimmer.gender);
    console.log('  ✅ Age group:', ageGroup, '| Gender:', gender);
    
    if (!gender) {
      console.log('  ❌ Invalid gender');
      return null;
    }
    
    // 5. Fetch current team record
    console.log('  🔍 Looking for record:', eventName, ageGroup, gender);
    const { data: currentRecord, error: recordError } = await supabase
      .from('team_records')
      .select('*')
      .eq('event', eventName)
      .eq('age_group', ageGroup)
      .eq('gender', gender)
      .eq('course', 'SCY')
      .maybeSingle(); // Use maybeSingle to avoid error if no record exists
    
    if (recordError) {
      console.error('  ❌ Error fetching team record:', recordError);
      return null;
    }
    
    if (currentRecord) {
      console.log('  ✅ Found current record:', currentRecord.time_seconds, 'by', currentRecord.swimmer_name);
    } else {
      console.log('  ℹ️  No existing record for this event/age/gender');
    }
    
    // 6. Check if the new time is faster
    const isNewRecord = !currentRecord || timeSeconds < currentRecord.time_seconds;
    console.log('  📊 Comparison:', timeSeconds, 'vs', currentRecord?.time_seconds, '→ New record?', isNewRecord);
    
    if (isNewRecord) {
      const recordBreak = {
        swimmer_id: result.swimmer_id,
        swimmer_name: swimmer.name,
        event: eventName,
        age_group: ageGroup,
        gender: gender,
        time_seconds: timeSeconds,
        time_display: secondsToTimeDisplay(timeSeconds),
        date: result.date,
        previous_record: currentRecord,
        improvement: currentRecord ? currentRecord.time_seconds - timeSeconds : null
      };
      console.log('  🎉 RECORD BROKEN!', recordBreak);
      return recordBreak;
    }
    
    console.log('  ℹ️  No record broken for this result');
    return null;
  } catch (error) {
    console.error('  ❌ Error checking for record break:', error);
    return null;
  }
}

/**
 * Checks multiple results for record breaks
 * @param {Array} results - Array of results to check
 * @returns {Promise<Array>} Array of record breaks found
 */
export async function checkMultipleResults(results) {
  console.log('📋 Checking', results.length, 'results for record breaks...');
  const recordBreaks = [];
  
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    console.log(`\n[${i + 1}/${results.length}] Checking result:`, result.event, result.time);
    const recordBreak = await checkForRecordBreak(result);
    if (recordBreak) {
      recordBreaks.push(recordBreak);
      console.log('  ✅ Added to record breaks list');
    }
  }
  
  console.log('\n🏁 Record check complete. Total breaks:', recordBreaks.length);
  
  // Deduplicate: Keep only the FASTEST time for each event/age/gender combo
  const deduped = deduplicateRecordBreaks(recordBreaks);
  
  if (deduped.length < recordBreaks.length) {
    console.log(`📊 Deduplicated: ${recordBreaks.length} → ${deduped.length} (kept fastest times only)`);
  }
  
  return deduped;
}

/**
 * Deduplicates record breaks, keeping only the fastest time for each event/age/gender
 * @param {Array} recordBreaks - Array of record break objects
 * @returns {Array} Deduplicated array with only fastest times
 */
function deduplicateRecordBreaks(recordBreaks) {
  const map = new Map();
  
  for (const record of recordBreaks) {
    const key = `${record.event}|${record.age_group}|${record.gender}`;
    const existing = map.get(key);
    
    if (!existing || record.time_seconds < existing.time_seconds) {
      // This is faster than what we have, or first one for this key
      map.set(key, record);
      console.log(`  🏆 ${key}: Keeping ${record.time_display} by ${record.swimmer_name}${existing ? ` (faster than ${existing.time_display})` : ''}`);
    } else {
      console.log(`  ⏭️  ${key}: Skipping ${record.time_display} (slower than ${existing.time_display})`);
    }
  }
  
  return Array.from(map.values());
}

/**
 * Updates a team record in the database and logs to history
 * @param {Object} recordBreak - The record break information
 * @returns {Promise<boolean>} Success status
 */
export async function updateTeamRecord(recordBreak) {
  try {
    const recordData = {
      event: recordBreak.event,
      age_group: recordBreak.age_group,
      gender: recordBreak.gender,
      swimmer_name: recordBreak.swimmer_name,
      time_seconds: recordBreak.time_seconds,
      time_display: recordBreak.time_display,
      date: recordBreak.date,
      course: 'SCY',
      updated_at: new Date().toISOString()
    };
    
    // 1. Log to record history FIRST (before updating current record)
    const historyData = {
      event: recordBreak.event,
      age_group: recordBreak.age_group,
      gender: recordBreak.gender,
      swimmer_id: recordBreak.swimmer_id,
      swimmer_name: recordBreak.swimmer_name,
      time_seconds: recordBreak.time_seconds,
      time_display: recordBreak.time_display,
      date: recordBreak.date,
      course: 'SCY',
      previous_record_holder: recordBreak.previous_record?.swimmer_name || null,
      previous_time_seconds: recordBreak.previous_record?.time_seconds || null,
      previous_time_display: recordBreak.previous_record?.time_display || null,
      improvement_seconds: recordBreak.improvement || null,
      broken_at: new Date().toISOString()
    };
    
    const { error: historyError } = await supabase
      .from('record_history')
      .insert([historyData]);
    
    if (historyError) {
      console.warn('⚠️ Could not log to record history:', historyError);
      // Continue anyway - don't fail the update if history fails
    } else {
      console.log('📚 Logged to record history:', recordBreak.swimmer_name, recordBreak.event);
    }
    
    // 2. If there was a previous record, mark it as superseded
    if (recordBreak.previous_record) {
      // Update the previous history entry to mark when it was broken
      await supabase
        .from('record_history')
        .update({ 
          held_until: new Date().toISOString()
        })
        .eq('event', recordBreak.event)
        .eq('age_group', recordBreak.age_group)
        .eq('gender', recordBreak.gender)
        .eq('swimmer_name', recordBreak.previous_record.swimmer_name)
        .eq('time_seconds', recordBreak.previous_record.time_seconds)
        .is('held_until', null); // Only update current record holder
    }
    
    // 3. Check if record exists in team_records
    const { data: existing } = await supabase
      .from('team_records')
      .select('id')
      .eq('event', recordBreak.event)
      .eq('age_group', recordBreak.age_group)
      .eq('gender', recordBreak.gender)
      .eq('course', 'SCY')
      .maybeSingle();
    
    // 4. Update or insert current team record
    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('team_records')
        .update(recordData)
        .eq('id', existing.id);
      
      if (error) {
        console.error('Error updating team record:', error);
        return false;
      }
    } else {
      // Insert new record (for new events)
      const { error } = await supabase
        .from('team_records')
        .insert([recordData]);
      
      if (error) {
        console.error('Error inserting team record:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error updating team record:', error);
    return false;
  }
}

/**
 * Updates multiple team records
 * @param {Array} recordBreaks - Array of record breaks
 * @returns {Promise<Object>} Summary of updates
 */
export async function updateMultipleRecords(recordBreaks) {
  const results = {
    success: [],
    failed: []
  };
  
  for (const recordBreak of recordBreaks) {
    const success = await updateTeamRecord(recordBreak);
    if (success) {
      results.success.push(recordBreak);
    } else {
      results.failed.push(recordBreak);
    }
  }
  
  return results;
}

