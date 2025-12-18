// src/utils/eventRecommendationEngine.js
// Auto-generates event recommendations for swimmers based on multiple scoring factors

import { supabase } from '../supabase';

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normalize event names for consistent matching
 */
export const normalizeEventName = (eventName) => {
  if (!eventName) return '';
  
  // Remove (Finals) and (Prelim) markers
  let clean = eventName.replace(/\s*\((Finals|Prelim)\)/i, '').trim();
  
  // Extract distance and stroke
  const match = clean.match(/(\d+)\s*(?:M|Y|Yard|Meter)?\s*(Free|Back|Breast|Fly|IM|Freestyle|Backstroke|Breaststroke|Butterfly|Ind\.?\s*Medley|Medley|FR|BK|BR|FL)/i);
  
  if (match) {
    const distance = match[1];
    let stroke = match[2].toLowerCase();
    
    // Normalize stroke names
    const strokeMap = {
      'free': 'Freestyle', 'freestyle': 'Freestyle', 'fr': 'Freestyle',
      'back': 'Backstroke', 'backstroke': 'Backstroke', 'bk': 'Backstroke',
      'breast': 'Breaststroke', 'breaststroke': 'Breaststroke', 'br': 'Breaststroke',
      'fly': 'Butterfly', 'butterfly': 'Butterfly', 'fl': 'Butterfly',
      'im': 'IM', 'medley': 'IM', 'ind medley': 'IM', 'ind. medley': 'IM'
    };
    
    stroke = strokeMap[stroke] || stroke;
    return `${distance} ${stroke}`;
  }
  
  return clean;
};

/**
 * Convert time string to seconds
 */
export const timeToSeconds = (timeStr) => {
  if (!timeStr) return null;
  
  // Check for DQ/NS/etc
  if (['DQ', 'NS', 'DFS', 'SCR', 'DNF'].some(s => timeStr.toUpperCase().includes(s))) {
    return null;
  }
  
  const cleanStr = String(timeStr).replace(/[A-Z]/gi, '').trim();
  if (!cleanStr) return null;
  
  const parts = cleanStr.split(':');
  let seconds = 0;
  
  if (parts.length === 2) {
    // MM:SS.ss format
    seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
  } else {
    // SS.ss format
    seconds = parseFloat(parts[0]);
  }
  
  return isNaN(seconds) ? null : seconds;
};

/**
 * Convert seconds to time string
 */
export const secondsToTime = (seconds) => {
  if (!seconds || seconds >= 999999) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return mins > 0 ? `${mins}:${secs.padStart(5, '0')}` : secs;
};

/**
 * Get swimmer's age group(s) based on their age
 */
export const getSwimmerAgeGroups = (age) => {
  if (!age || age < 0) return [];
  
  const groups = [];
  
  // Standard age groups with common variations
  if (age <= 8) {
    groups.push('8 & Under', '8&U', '8 and Under', '8U');
  }
  if (age <= 10) {
    groups.push('10 & Under', '10&U', '10 and Under', '10U');
  }
  if (age <= 12) {
    groups.push('12 & Under', '12&U', '12 and Under', '12U');
  }
  
  // Two-year age bands
  if (age >= 9 && age <= 10) groups.push('9-10', '9/10');
  if (age >= 11 && age <= 12) groups.push('11-12', '11/12');
  if (age >= 13 && age <= 14) groups.push('13-14', '13/14');
  if (age >= 15 && age <= 16) groups.push('15-16', '15/16');
  if (age >= 17 && age <= 18) groups.push('17-18', '17/18');
  if (age >= 15 && age <= 18) groups.push('15-18');
  
  // "Over" groups
  if (age >= 15) groups.push('Senior', 'Open', '15-Over', '15 & Over');
  if (age >= 13) groups.push('13-Over', '13 & Over', '13+');
  if (age >= 11) groups.push('11-Over', '11 & Over', '11+');
  
  // Add specific age
  groups.push(`${age}`);
  groups.push(`${age} Year Old`);
  groups.push(`Age ${age}`);
  
  return groups;
};

/**
 * Check if swimmer is eligible for an event based on age and gender
 */
export const isEligibleForEvent = (swimmer, meetEvent) => {
  // Skip relays for now (can add relay logic later)
  if (meetEvent.is_relay) {
    return false;
  }
  
  // Gender match
  if (meetEvent.gender && meetEvent.gender.toUpperCase() !== 'X' && meetEvent.gender.toUpperCase() !== 'MIXED') {
    const swimmerGender = (swimmer.gender || 'M').toUpperCase();
    const eventGender = meetEvent.gender.toUpperCase();
    
    // Handle common gender variations
    const genderMatch = 
      swimmerGender === eventGender ||
      (swimmerGender === 'M' && (eventGender === 'MALE' || eventGender === 'BOYS' || eventGender === 'MEN')) ||
      (swimmerGender === 'F' && (eventGender === 'FEMALE' || eventGender === 'GIRLS' || eventGender === 'WOMEN')) ||
      (swimmerGender === 'MALE' && (eventGender === 'M' || eventGender === 'BOYS' || eventGender === 'MEN')) ||
      (swimmerGender === 'FEMALE' && (eventGender === 'F' || eventGender === 'GIRLS' || eventGender === 'WOMEN'));
    
    if (!genderMatch) {
      return false;
    }
  }
  
  // Age group match - be flexible if no age group specified
  if (meetEvent.age_group) {
    const swimmerAge = parseInt(swimmer.age);
    
    // If swimmer has no valid age, skip age checking (assume eligible)
    if (!swimmerAge || isNaN(swimmerAge) || swimmerAge <= 0) {
      console.warn('⚠️ Swimmer has no valid age, allowing all age groups');
      return true;
    }
    
    const ageGroups = getSwimmerAgeGroups(swimmerAge);
    const eventAgeGroup = meetEvent.age_group.toString();
    
    // Check for "Open" or "All" age groups first
    if (eventAgeGroup.toLowerCase().includes('open') || 
        eventAgeGroup.toLowerCase().includes('all') ||
        eventAgeGroup.trim() === '') {
      return true;
    }
    
    // More flexible matching
    const matches = ageGroups.some(ag => {
      const agStr = ag.toString();
      // Direct match
      if (eventAgeGroup.includes(agStr) || agStr.includes(eventAgeGroup)) {
        return true;
      }
      // Case insensitive match
      if (eventAgeGroup.toLowerCase().includes(agStr.toLowerCase()) || 
          agStr.toLowerCase().includes(eventAgeGroup.toLowerCase())) {
        return true;
      }
      return false;
    });
    
    if (!matches) {
      return false;
    }
  }
  
  return true;
};

// ============================================
// SCORING FUNCTIONS
// ============================================

/**
 * Calculate improvement trajectory over last 90 days
 */
const calculateImprovement = (eventHistory) => {
  if (!eventHistory || eventHistory.length < 2) return null;
  
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  
  // Get times in last 90 days
  const recentTimes = eventHistory.filter(r => {
    const resultDate = new Date(r.date);
    return resultDate >= ninetyDaysAgo;
  });
  
  if (recentTimes.length < 2) return null;
  
  // Sort by date
  recentTimes.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  const oldestRecent = timeToSeconds(recentTimes[0].time);
  const newestRecent = timeToSeconds(recentTimes[recentTimes.length - 1].time);
  
  if (!oldestRecent || !newestRecent) return null;
  
  // Calculate improvement (negative = faster)
  const secondsDrop = oldestRecent - newestRecent;
  const percentDrop = (secondsDrop / oldestRecent) * 100;
  
  return {
    secondsDrop,
    percentDrop,
    oldTime: recentTimes[0].time,
    newTime: recentTimes[recentTimes.length - 1].time
  };
};

/**
 * Calculate distance to next standard
 */
const calculateStandardsProximity = (bestTimeSeconds, standards, swimmer) => {
  if (!bestTimeSeconds || !standards || standards.length === 0) return null;
  
  const swimmerAge = parseInt(swimmer.age) || 0;
  const swimmerGender = (swimmer.gender || 'M').toUpperCase();
  
  // Filter standards for this swimmer
  const relevantStandards = standards.filter(std => {
    const stdGender = (std.gender || 'M').toUpperCase();
    const genderMatch = stdGender === swimmerGender;
    const ageMatch = swimmerAge >= std.age_min && swimmerAge <= std.age_max;
    return genderMatch && ageMatch;
  });
  
  if (relevantStandards.length === 0) return null;
  
  // Sort standards by time (fastest to slowest)
  const standardLevels = ['AAAA', 'AAA', 'AA', 'A', 'BB', 'B'];
  const orderedStandards = [];
  
  standardLevels.forEach(level => {
    const std = relevantStandards.find(s => s.name === level);
    if (std) orderedStandards.push(std);
  });
  
  // Find current level and next level
  let currentLevel = null;
  let nextStandard = null;
  
  for (let i = orderedStandards.length - 1; i >= 0; i--) {
    const std = orderedStandards[i];
    if (bestTimeSeconds <= std.time_seconds) {
      currentLevel = std.name;
      // Next standard is the one before this in the array (faster)
      if (i > 0) {
        nextStandard = orderedStandards[i - 1];
      }
    }
  }
  
  // If no current level, the next standard is the slowest one (B)
  if (!currentLevel && orderedStandards.length > 0) {
    nextStandard = orderedStandards[orderedStandards.length - 1];
  }
  
  if (!nextStandard) return { currentLevel, nextStandard: null, secondsAway: null, percentAway: null };
  
  const secondsAway = bestTimeSeconds - nextStandard.time_seconds;
  const percentAway = (secondsAway / nextStandard.time_seconds) * 100;
  
  return {
    currentLevel,
    nextStandard: nextStandard.name,
    nextStandardTime: nextStandard.time_seconds,
    secondsAway,
    percentAway: Math.abs(percentAway)
  };
};

/**
 * Calculate relative strength (how good is this event relative to standards)
 */
const calculateRelativeStrength = (bestTimeSeconds, standards, swimmer) => {
  const proximity = calculateStandardsProximity(bestTimeSeconds, standards, swimmer);
  
  if (!proximity || !proximity.currentLevel) return 0;
  
  // Score based on current level achieved
  const scoreMap = {
    'AAAA': 15,
    'AAA': 12,
    'AA': 10,
    'A': 8,
    'BB': 6,
    'B': 4
  };
  
  return scoreMap[proximity.currentLevel] || 0;
};

/**
 * Check if event is a "signature event" (top events by standards)
 */
const isSignatureEvent = (eventName, allEventScores) => {
  // Sort events by relative strength score
  const sorted = [...allEventScores].sort((a, b) => b.relativeStrength - a.relativeStrength);
  
  // Top 3 are signature events
  const top3 = sorted.slice(0, 3);
  return top3.some(e => e.eventName === eventName);
};

/**
 * Calculate event pairing compatibility
 * Prevents back-to-back distance events and checks for complementary events
 */
const calculateEventPairingScore = (eventName, selectedEvents) => {
  let score = 5; // Base score for no conflicts
  
  // Parse current event
  const match = eventName.match(/(\d+)\s*(\w+)/);
  if (!match) return score;
  
  const [, distance, stroke] = match;
  const dist = parseInt(distance);
  const isDistance = dist >= 200 || stroke === 'IM';
  
  for (const selectedEvent of selectedEvents) {
    const selectedMatch = selectedEvent.match(/(\d+)\s*(\w+)/);
    if (!selectedMatch) continue;
    
    const [, selDistance, selStroke] = selectedMatch;
    const selDist = parseInt(selDistance);
    const selIsDistance = selDist >= 200 || selStroke === 'IM';
    
    // Penalty for multiple distance events
    if (isDistance && selIsDistance) {
      score -= 3;
    }
    
    // Bonus for complementary events (same stroke, different distance)
    if (stroke === selStroke && dist !== selDist) {
      score += 2;
    }
    
    // Small bonus for different strokes (versatility)
    if (stroke !== selStroke) {
      score += 1;
    }
  }
  
  return Math.max(0, score); // Never negative
};

/**
 * Check for event spacing conflicts (events too close together)
 */
const checkEventSpacing = (meetEvent, selectedMeetEvents, meetEvents) => {
  // If events have session/time info, check spacing
  if (!meetEvent.session_number) return true; // No session info, can't check
  
  for (const selected of selectedMeetEvents) {
    // Same session - check event numbers
    if (selected.session_number === meetEvent.session_number) {
      const eventGap = Math.abs(meetEvent.event_number - selected.event_number);
      
      // Flag if events are back-to-back (1 event apart)
      if (eventGap <= 1) {
        return false; // Too close
      }
      
      // Warn if events are within 3 events
      if (eventGap <= 3) {
        return 'warn'; // Close but manageable
      }
    }
  }
  
  return true; // Good spacing
};

/**
 * Determine event difficulty based on distance and stroke
 */
const getEventDifficulty = (eventName) => {
  const match = eventName.match(/(\d+)\s*(\w+)/);
  if (!match) return 1;
  
  const [, distance, stroke] = match;
  const dist = parseInt(distance);
  
  // Base difficulty by distance
  let difficulty = 1;
  if (dist >= 500) difficulty = 5;
  else if (dist >= 200) difficulty = 3;
  else if (dist >= 100) difficulty = 2;
  
  // Stroke multipliers
  const strokeMultipliers = {
    'Butterfly': 1.3,
    'Fly': 1.3,
    'Breaststroke': 1.2,
    'Breast': 1.2,
    'IM': 1.4,
    'Backstroke': 1.0,
    'Back': 1.0,
    'Freestyle': 1.0,
    'Free': 1.0
  };
  
  const multiplier = strokeMultipliers[stroke] || 1.0;
  return difficulty * multiplier;
};

// ============================================
// MAIN RECOMMENDATION ENGINE
// ============================================

/**
 * Generate event recommendations for a single swimmer
 */
export const generateRecommendationsForSwimmer = async (swimmer, meet, options = {}) => {
  const {
    mode = 'balanced', // 'championship', 'developmental', 'balanced'
    maxEvents = 3,
    focusOnStandardsChasers = false
  } = options;
  
  try {
    console.log('🔍 Generating recommendations for:', swimmer.name, {
      age: swimmer.age,
      gender: swimmer.gender,
      mode,
      maxEvents,
      fullSwimmer: swimmer
    });
    
    // 1. Load meet events
    const { data: meetEvents } = await supabase
      .from('meet_events')
      .select('*')
      .eq('meet_id', meet.id)
      .order('event_number');
    
    console.log('📋 Found meet events:', meetEvents?.length || 0);
    
    if (!meetEvents || meetEvents.length === 0) {
      return { swimmer, recommendations: [], error: 'No events found for this meet' };
    }
    
    // Debug: Show first few events
    if (meetEvents.length > 0) {
      console.log('📋 Sample events:', meetEvents.slice(0, 3).map(e => ({
        name: e.event_name,
        age_group: e.age_group,
        gender: e.gender,
        is_relay: e.is_relay
      })));
      
      // Show swimmer's eligible age groups
      const swimmerAge = parseInt(swimmer.age) || 0;
      const swimmerAgeGroups = getSwimmerAgeGroups(swimmerAge);
      console.log('👤 Swimmer age groups:', swimmerAgeGroups);
      console.log('👤 Swimmer gender:', swimmer.gender);
      
      // DETAILED COMPARISON
      console.log('🔍 DETAILED ELIGIBILITY CHECK:');
      console.log(`   Swimmer: ${swimmer.name}, Age: ${swimmer.age} (parsed: ${swimmerAge}), Gender: ${swimmer.gender}`);
      console.log(`   Age Groups: ${swimmerAgeGroups.join(', ')}`);
      console.log(`   First Event: "${meetEvents[0].event_name}"`);
      console.log(`   Event Age Group: "${meetEvents[0].age_group}"`);
      console.log(`   Event Gender: "${meetEvents[0].gender}"`);
      console.log(`   Is Relay: ${meetEvents[0].is_relay}`);
      
      // Check if first event matches
      const testMatch = isEligibleForEvent(swimmer, meetEvents[0]);
      console.log(`   Would Match First Event? ${testMatch}`);
    }
    
    // 2. Load swimmer's historical results
    const { data: results } = await supabase
      .from('results')
      .select('event, time, date')
      .eq('swimmer_id', swimmer.id)
      .order('date', { ascending: false });
    
    // 3. Load time standards
    const swimmerAge = parseInt(swimmer.age) || 0;
    const swimmerGender = (swimmer.gender || 'M').toUpperCase();
    
    const { data: allStandards } = await supabase
      .from('time_standards')
      .select('*')
      .eq('gender', swimmerGender)
      .lte('age_min', swimmerAge)
      .gte('age_max', swimmerAge);
    
    // 4. Load team records for proximity checking
    const { data: teamRecords } = await supabase
      .from('team_records')
      .select('*')
      .eq('gender', swimmerGender);
    
    // 5. Group results by event
    const eventHistory = {};
    
    if (results) {
      results.forEach(r => {
        const normalized = normalizeEventName(r.event);
        if (!normalized) return;
        
        if (!eventHistory[normalized]) {
          eventHistory[normalized] = [];
        }
        
        eventHistory[normalized].push(r);
      });
    }
    
    // 6. Calculate scores for each eligible event
    const scoredEvents = [];
    const allEventScores = []; // For signature event calculation
    let eligibleCount = 0;
    let ineligibleReasons = [];
    
    for (const meetEvent of meetEvents) {
      // Check eligibility
      const isEligible = isEligibleForEvent(swimmer, meetEvent);
      
      if (!isEligible) {
        // Track why events are ineligible for debugging
        const swimmerAge = parseInt(swimmer.age) || 0;
        const swimmerAgeGroups = getSwimmerAgeGroups(swimmerAge);
        
        ineligibleReasons.push({
          event: meetEvent.event_name,
          event_age_group: meetEvent.age_group,
          event_gender: meetEvent.gender,
          is_relay: meetEvent.is_relay,
          swimmer_age: swimmerAge,
          swimmer_age_groups: swimmerAgeGroups.slice(0, 3), // First 3 for brevity
          swimmer_gender: swimmer.gender
        });
        continue;
      }
      
      eligibleCount++;
      
      // Normalize meet event name
      const eventName = normalizeEventName(meetEvent.event_name);
      const history = eventHistory[eventName] || [];
      
      // Get best time
      const validTimes = history
        .map(r => timeToSeconds(r.time))
        .filter(t => t !== null);
      
      const hasPreviousTime = validTimes.length > 0;
      const bestTimeSeconds = hasPreviousTime ? Math.min(...validTimes) : null;
      
      // Get standards for this event
      const eventStandards = allStandards ? allStandards.filter(std => {
        const stdEvent = normalizeEventName(std.event);
        return stdEvent === eventName;
      }) : [];
      
      // === TIER 1: ELIGIBILITY SCORE (10 points) ===
      let eligibilityScore = 10; // Always 10 if we got here
      
      // === TIER 2: PERFORMANCE SCORE (0-40 points) ===
      let performanceScore = 0;
      
      // Recent improvement (0-15 points)
      const improvement = hasPreviousTime ? calculateImprovement(history) : null;
      let improvementPoints = 0;
      let improvementReason = '';
      
      if (improvement) {
        if (improvement.percentDrop >= 5) {
          improvementPoints = 15;
          improvementReason = `Improved ${improvement.percentDrop.toFixed(1)}% in last 90 days`;
        } else if (improvement.percentDrop >= 2) {
          improvementPoints = 10;
          improvementReason = `Improved ${improvement.percentDrop.toFixed(1)}% in last 90 days`;
        } else if (improvement.percentDrop > 0) {
          improvementPoints = 5;
          improvementReason = `Slight improvement in last 90 days`;
        }
      } else if (!hasPreviousTime) {
        improvementReason = 'New event opportunity';
      }
      
      // Standards level achieved (0-15 points)
      const relativeStrength = bestTimeSeconds 
        ? calculateRelativeStrength(bestTimeSeconds, eventStandards, swimmer)
        : 0;
      
      performanceScore = improvementPoints + relativeStrength;
      
      // === TIER 3: OPPORTUNITY SCORE (0-30 points) ===
      let opportunityScore = 0;
      let opportunityReasons = [];
      
      if (bestTimeSeconds && eventStandards.length > 0) {
        const proximity = calculateStandardsProximity(bestTimeSeconds, eventStandards, swimmer);
        
        if (proximity && proximity.nextStandard) {
          // Within 3 seconds of next standard: +15
          if (Math.abs(proximity.secondsAway) <= 3) {
            opportunityScore += 15;
            opportunityReasons.push(`${Math.abs(proximity.secondsAway).toFixed(2)}s from ${proximity.nextStandard}`);
          }
          // Within 5% of next standard: +10
          else if (proximity.percentAway <= 5) {
            opportunityScore += 10;
            opportunityReasons.push(`${proximity.percentAway.toFixed(1)}% from ${proximity.nextStandard}`);
          }
        }
      }
      
      // Check team record proximity
      if (bestTimeSeconds && teamRecords && teamRecords.length > 0) {
        const matchingRecord = teamRecords.find(rec => {
          const recEvent = normalizeEventName(rec.event);
          // Check if age groups match
          const ageGroups = getSwimmerAgeGroups(swimmer.age);
          const ageGroupMatch = !rec.age_group || ageGroups.some(ag => 
            rec.age_group.includes(ag) || ag.includes(rec.age_group)
          );
          return recEvent === eventName && ageGroupMatch;
        });
        
        if (matchingRecord && matchingRecord.time_seconds) {
          const recordSeconds = matchingRecord.time_seconds;
          const secondsFromRecord = bestTimeSeconds - recordSeconds;
          
          // Within 3 seconds of team record: +10
          if (secondsFromRecord > 0 && secondsFromRecord <= 3) {
            opportunityScore += 10;
            opportunityReasons.push(`${secondsFromRecord.toFixed(2)}s from team record`);
          }
          // Within 5% of team record: +5
          else if (secondsFromRecord > 0 && (secondsFromRecord / recordSeconds) * 100 <= 5) {
            opportunityScore += 5;
            opportunityReasons.push('Close to team record');
          }
          // Already holds the record!
          else if (secondsFromRecord <= 0) {
            opportunityScore += 5;
            opportunityReasons.push('Current team record holder 🏆');
          }
        }
      }
      
      // New event bonus (for developmental meets)
      if (!hasPreviousTime && mode === 'developmental') {
        opportunityScore += 10;
        opportunityReasons.push('New event to try');
      }
      
      // === TIER 4: STRATEGIC SCORE (0-20 points) ===
      let strategicScore = 0;
      let strategicReasons = [];
      
      // Will calculate signature events after we have all scores
      allEventScores.push({
        eventName,
        relativeStrength,
        meetEvent
      });
      
      // Calculate event difficulty
      const difficulty = getEventDifficulty(eventName);
      
      // === CALCULATE FINAL SCORE ===
      const totalScore = eligibilityScore + performanceScore + opportunityScore + strategicScore;
      
      scoredEvents.push({
        meetEvent,
        eventName,
        hasPreviousTime,
        bestTime: bestTimeSeconds ? secondsToTime(bestTimeSeconds) : null,
        bestTimeSeconds,
        improvement,
        improvementReason,
        opportunityReasons,
        strategicReasons,
        difficulty,
        scores: {
          eligibility: eligibilityScore,
          performance: performanceScore,
          opportunity: opportunityScore,
          strategic: strategicScore,
          total: totalScore
        },
        history: history.length
      });
    }
    
    // 7. Add signature event bonus and event pairing intelligence
    scoredEvents.forEach(evt => {
      if (evt.bestTimeSeconds && isSignatureEvent(evt.eventName, allEventScores)) {
        evt.scores.strategic += 10;
        evt.scores.total += 10;
        evt.isSignatureEvent = true;
        evt.strategicReasons.push('Signature event (top 3)');
      }
    });
    
    // 8. Apply mode-specific filters
    let filteredEvents = [...scoredEvents];
    
    if (mode === 'championship') {
      // Focus on best events, filter out new events
      filteredEvents = filteredEvents.filter(e => e.hasPreviousTime);
    } else if (mode === 'developmental') {
      // Include new events, be more exploratory
      // Already handled in opportunity scoring
    }
    
    if (focusOnStandardsChasers) {
      // Prioritize events with close standards
      filteredEvents = filteredEvents.filter(e => 
        e.opportunityReasons.length > 0 || e.isSignatureEvent
      );
    }
    
    // 9. Sort by score and intelligently select top N with event pairing
    filteredEvents.sort((a, b) => b.scores.total - a.scores.total);
    
    // Get session limit from meet (default to 3)
    const sessionLimit = meet?.events_per_day_limit || 3;
    
    // Smart selection with event pairing intelligence and session limits
    const recommendations = [];
    const selectedEventNames = [];
    const selectedMeetEvents = [];
    const sessionCounts = {}; // Track events per session
    let skippedForSpacing = 0;
    let skippedForSessionLimit = 0;
    
    for (const event of filteredEvents) {
      if (recommendations.length >= maxEvents) break;
      
      // Check session limit
      const sessionNum = event.meetEvent.session_number;
      if (sessionNum) {
        const currentSessionCount = sessionCounts[sessionNum] || 0;
        if (currentSessionCount >= sessionLimit) {
          // Skip this event - session is full
          skippedForSessionLimit++;
          event.strategicReasons.push(`⚠️ Session ${sessionNum} already has ${sessionLimit} events`);
          continue;
        }
      }
      
      // Calculate pairing score with already selected events
      const pairingScore = calculateEventPairingScore(event.eventName, selectedEventNames);
      const spacingCheck = checkEventSpacing(event.meetEvent, selectedMeetEvents, meetEvents);
      
      // Add pairing bonus to strategic score
      event.scores.strategic += pairingScore;
      event.scores.total += pairingScore;
      
      // Check spacing warnings
      if (spacingCheck === false) {
        event.strategicReasons.push('⚠️ Back-to-back with another event');
        event.hasSpacingWarning = true;
      } else if (spacingCheck === 'warn') {
        event.strategicReasons.push('Close spacing with another event');
      }
      
      // In championship mode, avoid events with spacing issues
      // But still add them if we haven't reached maxEvents and no other options
      if (mode === 'championship' && spacingCheck === false) {
        skippedForSpacing++;
        // Only skip if we have plenty of other options
        if (filteredEvents.length - skippedForSpacing - skippedForSessionLimit > maxEvents) {
          continue; // Skip this event
        }
      }
      
      // Add event to recommendations
      recommendations.push(event);
      selectedEventNames.push(event.eventName);
      selectedMeetEvents.push(event.meetEvent);
      
      // Increment session count
      if (sessionNum) {
        sessionCounts[sessionNum] = (sessionCounts[sessionNum] || 0) + 1;
      }
    }
    
    console.log(`📊 Selection: Requested ${maxEvents}, Generated ${recommendations.length}, Skipped ${skippedForSpacing} for spacing, ${skippedForSessionLimit} for session limits`);
    console.log(`📅 Session distribution:`, sessionCounts, `(Limit: ${sessionLimit} per session)`);
    
    // Calculate total difficulty
    const totalDifficulty = recommendations.reduce((sum, r) => sum + r.difficulty, 0);
    const avgDifficulty = recommendations.length > 0 ? totalDifficulty / recommendations.length : 0;
    
    console.log('✅ Generated recommendations:', {
      swimmer: swimmer.name,
      eligible: eligibleCount,
      scored: scoredEvents.length,
      recommended: recommendations.length
    });
    
    // If no eligible events, log why
    if (eligibleCount === 0) {
      console.warn('⚠️ No eligible events found. Sample reasons:', ineligibleReasons.slice(0, 5));
      console.warn('💡 Tip: Check if swimmer age/gender match event requirements');
      
      const uniqueAgeGroups = [...new Set(meetEvents.map(e => e.age_group))];
      console.warn('💡 Event age groups in meet:', uniqueAgeGroups);
      
      const swimmerAge = parseInt(swimmer.age) || 0;
      console.warn(`💡 Swimmer is ${swimmerAge} years old. Does this match any of the age groups above?`);
      
      // Print a clear comparison table
      console.table([{
        'Swimmer': swimmer.name,
        'Age': swimmer.age,
        'Gender': swimmer.gender,
        'Meet Age Groups': uniqueAgeGroups.join(', '),
        'Match?': 'Check above'
      }]);
      
      console.warn('📝 SOLUTION: Either:');
      console.warn('   1. Verify swimmer age is correct in their profile');
      console.warn('   2. Add "Open" age group events to the meet');
      console.warn('   3. Add age group events that match the swimmer\'s age');
    }
    
    return {
      swimmer,
      recommendations,
      allScores: filteredEvents, // For debugging/review
      stats: {
        totalEventsScored: scoredEvents.length,
        eventsWithHistory: scoredEvents.filter(e => e.hasPreviousTime).length,
        newEvents: scoredEvents.filter(e => !e.hasPreviousTime).length,
        totalDifficulty: totalDifficulty.toFixed(1),
        avgDifficulty: avgDifficulty.toFixed(1),
        eligibleEvents: eligibleCount,
        ineligibleSample: ineligibleReasons.slice(0, 3)
      }
    };
    
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return {
      swimmer,
      recommendations: [],
      error: error.message
    };
  }
};

/**
 * Generate recommendations for multiple swimmers
 */
export const generateRecommendationsForGroup = async (swimmers, meet, options = {}) => {
  const results = [];
  
  for (const swimmer of swimmers) {
    const result = await generateRecommendationsForSwimmer(swimmer, meet, options);
    results.push(result);
  }
  
  return results;
};

/**
 * Auto-apply recommendations (insert into meet_entries)
 */
export const applyRecommendations = async (recommendations, meet) => {
  const entriesToInsert = [];
  
  for (const rec of recommendations) {
    const { meetEvent, bestTime, bestTimeSeconds } = rec;
    const swimmer = rec.swimmer || recommendations[0]?.swimmer; // Handle both formats
    
    if (!swimmer) continue;
    
    // Generate event code
    const strokeCodes = {
      'Freestyle': 'FR', 'Free': 'FR',
      'Backstroke': 'BK', 'Back': 'BK',
      'Breaststroke': 'BR', 'Breast': 'BR',
      'Butterfly': 'FL', 'Fly': 'FL',
      'IM': 'IM', 'Individual Medley': 'IM'
    };
    const strokeCode = strokeCodes[meetEvent.stroke] || meetEvent.stroke?.substring(0, 2).toUpperCase() || 'UN';
    const eventCode = `${meetEvent.distance}${strokeCode}`;
    
    entriesToInsert.push({
      meet_id: meet.id,
      swimmer_id: swimmer.id,
      swimmer_name: swimmer.name,
      usa_swimming_id: swimmer.usa_swimming_id || null,
      meet_event_id: meetEvent.id,
      event_number: meetEvent.event_number,
      event_name: meetEvent.event_name,
      event_code: eventCode,
      seed_time_display: bestTime,
      seed_time_seconds: bestTimeSeconds,
      session_number: meetEvent.session_number || null
    });
  }
  
  if (entriesToInsert.length === 0) {
    return { success: false, message: 'No entries to insert' };
  }
  
  try {
    const { error } = await supabase
      .from('meet_entries')
      .insert(entriesToInsert);
    
    if (error) throw error;
    
    return {
      success: true,
      count: entriesToInsert.length,
      message: `Successfully added ${entriesToInsert.length} entries`
    };
  } catch (error) {
    console.error('Error applying recommendations:', error);
    return {
      success: false,
      message: error.message
    };
  }
};

