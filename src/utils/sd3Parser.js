// src/utils/sd3Parser.js
// SD3 File Parser for USA Swimming Meet Entries
// Parses fixed-width SD3 format files

/**
 * Stroke codes used in SD3 format
 */
const STROKE_CODES = {
  '1': 'Freestyle',
  '2': 'Backstroke',
  '3': 'Breaststroke',
  '4': 'Butterfly',
  '5': 'IM',
  '6': 'Freestyle Relay',
  '7': 'Medley Relay'
};

/**
 * Parse a D01 record (individual entry)
 * 
 * Actual format from analysis (1-indexed positions):
 * Example: "D01VA      Ashby, Tyler J              053640D7ADB4AUSA07282016 9MM  50240A UN10           43.84Y"
 * 
 * Pos 01-03: Record type "D01"
 * Pos 04-05: LSC code "VA"
 * Pos 12-39: Swimmer name "Ashby, Tyler J"
 * Pos 40-51: USA Swimming ID (12 chars) "053640D7ADB4"
 * Pos 52-54: Citizenship "USA"
 * Pos 55-62: Birth date MMDDYYYY "07282016"
 * Pos 64-65: Age " 9" (right-aligned, can be 2 digits)
 * Pos 66-67: Gender + attached "MM" (first M = Male, second M = attached member)
 * Pos 68+: Event section containing: event code, event number, age group, seed time
 */
function parseD01Record(line) {
  try {
    // Use 0-indexed substring (position - 1)
    const swimmerName = line.substring(11, 39).trim();
    const usaSwimmingId = line.substring(39, 51).trim();
    const birthDate = line.substring(54, 62).trim();
    const ageStr = line.substring(63, 65).trim();
    const age = parseInt(ageStr, 10);
    const genderChar = line.substring(65, 66).trim();
    
    // Event section starts at position 68 (0-indexed: 67)
    const eventSection = line.substring(67).trim();
    
    // Parse event section
    // Format examples from actual file:
    // " 50240A UN10           43.84Y"  -> event=502, num=40, age=UN10, time=43.84
    // "200134A UN10         2:43.38Y"  -> event=2001, num=34, age=UN10, time=2:43.38
    // " 504110AUN10           43.46Y"  -> event=504, num=110, age=UN10, time=43.46
    // "5001 2A UN10         7:10.48Y"  -> event=5001, num=2, age=UN10, time=7:10.48
    
    // First, find the seed time at the end (it has Y or L suffix)
    const timeMatch = eventSection.match(/([\d:\.]+)[YL]\s*$/);
    let seedTimeStr = timeMatch ? timeMatch[1] : null;
    
    // Remove the time from the section to parse the rest
    let restSection = eventSection;
    if (timeMatch) {
      restSection = eventSection.substring(0, eventSection.lastIndexOf(timeMatch[1])).trim();
    }
    
    // Now parse: eventCode + eventNumber + ageGroup
    // Examples of restSection:
    // " 50240A UN10" or "200134A UN10" or " 504110AUN10" or "5001 2A UN10"
    
    // Find age group (UN10, 15OV, 1314, etc.) - usually at the end
    const ageGroupMatch = restSection.match(/\s*(UN\d+|\d{2}OV|\d{4}B?)\s*$/i);
    let ageGroup = ageGroupMatch ? ageGroupMatch[1] : '';
    
    // Remove age group from section
    if (ageGroupMatch) {
      restSection = restSection.substring(0, restSection.lastIndexOf(ageGroupMatch[1])).trim();
    }
    
    // Now restSection should be: eventCode + eventNumber (with possible A/B suffix)
    // Examples: " 50240A" or "200134A" or " 504110A" or "5001 2A"
    
    // Remove A/B suffix
    restSection = restSection.replace(/[AB]\s*$/i, '').trim();
    
    // Now we need to split event code from event number
    // Event codes end with stroke digit (1-7) and are 3-5 digits
    // Examples: 502 (50 Back), 2001 (200 Free), 5001 (500 Free), 16501 (1650 Free)
    
    // Remove spaces
    const combined = restSection.replace(/\s+/g, '');
    
    // Find where event code ends by looking for valid stroke code
    let eventCode = '';
    let eventNum = '';
    
    // Try different lengths for event code (from 3 to 5 digits)
    for (let len = 3; len <= Math.min(5, combined.length); len++) {
      const possibleCode = combined.substring(0, len);
      const strokeDigit = possibleCode.slice(-1);
      const distance = possibleCode.slice(0, -1);
      
      // Valid stroke codes are 1-7
      // Valid distances: 25, 50, 100, 200, 400, 500, 800, 1000, 1500, 1650
      const validDistances = ['25', '50', '100', '200', '400', '500', '800', '1000', '1500', '1650'];
      
      if (STROKE_CODES[strokeDigit] && validDistances.includes(distance)) {
        eventCode = possibleCode;
        eventNum = combined.substring(len);
        break;
      }
    }
    
    if (!eventCode) {
      console.warn('Could not parse event code from:', combined, 'full section:', eventSection);
      return null;
    }
    
    const strokeCode = eventCode.slice(-1);
    const distance = eventCode.slice(0, -1);
    const stroke = STROKE_CODES[strokeCode] || 'Unknown';
    
    // Parse seed time
    let seedTimeSeconds = null;
    let seedTimeDisplay = null;
    
    if (seedTimeStr) {
      seedTimeDisplay = seedTimeStr;
      
      if (seedTimeStr.includes(':')) {
        const timeParts = seedTimeStr.split(':');
        const minutes = parseInt(timeParts[0], 10);
        const seconds = parseFloat(timeParts[1]);
        seedTimeSeconds = minutes * 60 + seconds;
      } else if (!isNaN(parseFloat(seedTimeStr))) {
        seedTimeSeconds = parseFloat(seedTimeStr);
      }
    }
    
    const isBonus = ageGroup.endsWith('B');
    const cleanAgeGroup = ageGroup.replace(/B$/i, '');
    
    return {
      swimmerName,
      usaSwimmingId,
      birthDate,
      age: isNaN(age) ? null : age,
      gender: genderChar === 'M' ? 'Male' : genderChar === 'F' ? 'Female' : null,
      eventCode,
      eventNumber: parseInt(eventNum, 10) || null,
      eventName: `${distance} ${stroke}`,
      distance: parseInt(distance, 10),
      stroke,
      ageGroup: cleanAgeGroup,
      isBonus,
      seedTimeSeconds,
      seedTimeDisplay
    };
  } catch (error) {
    console.error('Error parsing D01 record:', error, line);
    return null;
  }
}

/**
 * Parse meet info from B1 record
 * 
 * Example: "B11        2025 RAYS Nutcracker Classic -    ...   1204202512072025"
 * Pos 12-100: Meet name
 * Pos 122-129: Start date MMDDYYYY (0-indexed: 121-129)
 * Pos 130-137: End date MMDDYYYY (0-indexed: 129-137)
 */
function parseB1Record(line) {
  try {
    const meetName = line.substring(11, 100).trim();
    
    // Dates are at fixed positions near end
    const startDateStr = line.substring(121, 129).trim();
    const endDateStr = line.substring(129, 137).trim();
    
    let startDate = null;
    let endDate = null;
    
    if (startDateStr && startDateStr.length === 8) {
      // Format: MMDDYYYY -> YYYY-MM-DD
      const mm = startDateStr.substring(0, 2);
      const dd = startDateStr.substring(2, 4);
      const yyyy = startDateStr.substring(4, 8);
      startDate = `${yyyy}-${mm}-${dd}`;
    }
    
    if (endDateStr && endDateStr.length === 8) {
      const mm = endDateStr.substring(0, 2);
      const dd = endDateStr.substring(2, 4);
      const yyyy = endDateStr.substring(4, 8);
      endDate = `${yyyy}-${mm}-${dd}`;
    }
    
    return {
      name: meetName,
      startDate,
      endDate
    };
  } catch (error) {
    console.error('Error parsing B1 record:', error);
    return null;
  }
}

/**
 * Parse team info from C1 record
 */
function parseC1Record(line) {
  try {
    const teamCode = line.substring(11, 17).trim();
    const teamName = line.substring(17, 47).trim();
    
    return {
      teamCode,
      teamName
    };
  } catch (error) {
    console.error('Error parsing C1 record:', error);
    return null;
  }
}

/**
 * Main parser function - parses entire SD3 file
 */
export function parseSD3File(fileContent) {
  const lines = fileContent.split(/\r?\n/);
  
  const result = {
    meet: null,
    team: null,
    entries: [],
    swimmers: new Map(), // Unique swimmers
    errors: []
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line.length < 3) continue;
    
    const recordType = line.substring(0, 3);
    
    try {
      switch (recordType) {
        case 'B11':
        case 'B12':
          const meetInfo = parseB1Record(line);
          if (meetInfo) result.meet = meetInfo;
          break;
          
        case 'C11':
        case 'C12':
          const teamInfo = parseC1Record(line);
          if (teamInfo) result.team = teamInfo;
          break;
          
        case 'D01':
          const entry = parseD01Record(line);
          if (entry) {
            result.entries.push(entry);
            
            // Track unique swimmers
            if (!result.swimmers.has(entry.usaSwimmingId)) {
              result.swimmers.set(entry.usaSwimmingId, {
                name: entry.swimmerName,
                usaSwimmingId: entry.usaSwimmingId,
                age: entry.age,
                gender: entry.gender,
                entries: []
              });
            }
            result.swimmers.get(entry.usaSwimmingId).entries.push(entry);
          }
          break;
          
        // Skip D3 (additional swimmer info), E01 (relay entries), Z01 (file summary), A01 (file header)
        default:
          break;
      }
    } catch (error) {
      result.errors.push({ line: i + 1, error: error.message });
    }
  }
  
  // Convert swimmers Map to array
  result.swimmerList = Array.from(result.swimmers.values());
  
  return result;
}

/**
 * Format time for display (seconds to MM:SS.ss or SS.ss)
 */
export function formatTime(seconds) {
  if (!seconds) return '--';
  
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2).padStart(5, '0');
    return `${mins}:${secs}`;
  }
  
  return seconds.toFixed(2);
}

/**
 * Group entries by swimmer for display
 */
export function groupEntriesBySwimmer(entries) {
  const grouped = {};
  
  entries.forEach(entry => {
    const key = entry.usaSwimmingId || entry.swimmerName;
    if (!grouped[key]) {
      grouped[key] = {
        swimmerName: entry.swimmerName,
        usaSwimmingId: entry.usaSwimmingId,
        age: entry.age,
        gender: entry.gender,
        entries: []
      };
    }
    grouped[key].entries.push(entry);
  });
  
  return Object.values(grouped);
}

export default {
  parseSD3File,
  formatTime,
  groupEntriesBySwimmer
};
