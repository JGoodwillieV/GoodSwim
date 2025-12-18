// src/utils/eventUtils.js
// Centralized event name normalization and parsing utilities

// Stroke name mappings for normalization
const STROKE_MAPPINGS = {
  'free': 'freestyle',
  'freestyle': 'freestyle',
  'back': 'backstroke',
  'backstroke': 'backstroke',
  'breast': 'breaststroke',
  'breaststroke': 'breaststroke',
  'fly': 'butterfly',
  'butterfly': 'butterfly',
  'butter': 'butterfly',
  'im': 'im',
  'individual medley': 'im',
  'ind. medley': 'im',
  'medley': 'im'
};

// Short stroke names for display
const STROKE_SHORT = {
  'freestyle': 'Free',
  'backstroke': 'Back',
  'breaststroke': 'Breast',
  'butterfly': 'Fly',
  'im': 'IM'
};

// Stroke order for sorting (standard meet order)
export const STROKE_ORDER = {
  'free': 1, 'freestyle': 1,
  'back': 2, 'backstroke': 2,
  'breast': 3, 'breaststroke': 3,
  'fly': 4, 'butterfly': 4,
  'im': 5, 'individual medley': 5
};

// Standard distances in swimming
export const STANDARD_DISTANCES = ['25', '50', '100', '200', '400', '500', '800', '1000', '1500', '1650'];

/**
 * Normalize an event name to a consistent format
 * Handles variations like "100 Free", "100 Freestyle", "100 FR", etc.
 * @param {string} eventName - Event name to normalize
 * @returns {string} - Normalized event name (e.g., "100 freestyle")
 */
export const normalizeEventName = (eventName) => {
  if (!eventName) return '';
  
  // Regex to match distance and stroke
  const match = String(eventName).match(
    /(\d+)\s*(?:M|Y|SCY|SCM|LCM)?\s*(Freestyle|Free|FR|Backstroke|Back|BK|Breaststroke|Breast|BR|Butterfly|Fly|FL|Individual\s*Medley|Ind\.?\s*Medley|IM)/i
  );
  
  if (match) {
    const dist = match[1];
    let stroke = match[2].toLowerCase();
    
    // Map to canonical stroke name
    if (stroke === 'fr') stroke = 'free';
    if (stroke === 'bk') stroke = 'back';
    if (stroke === 'br') stroke = 'breast';
    if (stroke === 'fl') stroke = 'fly';
    
    const normalizedStroke = STROKE_MAPPINGS[stroke] || stroke;
    return `${dist} ${normalizedStroke}`;
  }
  
  return eventName.toLowerCase().trim();
};

/**
 * Get the base event name without prelim/finals designation
 * @param {string} eventName - Full event name
 * @returns {string} - Base event name without round info
 */
export const getBaseEventName = (eventName) => {
  if (!eventName) return '';
  
  // Remove prelim/finals designation
  let clean = String(eventName).replace(/\s*\((Finals|Prelim|Timed Finals|Prelims)\)/gi, '');
  
  // Try to extract distance + stroke
  const match = clean.match(
    /(\d+)\s*(?:M|Y)?\s*(Free|Freestyle|Back|Backstroke|Breast|Breaststroke|Fly|Butterfly|IM|Individual\s*Medley|Ind\.?\s*Medley)/i
  );
  
  if (match) {
    return `${match[1]} ${match[2]}`;
  }
  
  return clean.trim();
};

/**
 * Parse an event name into its components
 * @param {string} eventName - Event name to parse
 * @returns {{ distance: string, stroke: string, round: string }} - Parsed components
 */
export const parseEventName = (eventName) => {
  if (!eventName) return { distance: '', stroke: '', round: '' };
  
  // Extract round
  let round = '';
  if (/\(Finals?\)/i.test(eventName)) round = 'Finals';
  if (/\(Prelims?\)/i.test(eventName)) round = 'Prelims';
  
  // Clean and parse
  const clean = String(eventName).toLowerCase().replace(/\(.*?\)/g, '').trim();
  const match = clean.match(/\b(25|50|100|200|400|500|800|1000|1500|1650)\s+(.*)/);
  
  if (match) {
    const distance = match[1];
    let strokeRaw = match[2].trim();
    
    // Normalize stroke
    let stroke = '';
    if (strokeRaw.includes('free')) stroke = 'freestyle';
    else if (strokeRaw.includes('back')) stroke = 'backstroke';
    else if (strokeRaw.includes('breast')) stroke = 'breaststroke';
    else if (strokeRaw.includes('fly') || strokeRaw.includes('butter')) stroke = 'butterfly';
    else if (strokeRaw.includes('im') || strokeRaw.includes('medley')) stroke = 'im';
    else stroke = strokeRaw;
    
    return { distance, stroke, round };
  }
  
  return { distance: '', stroke: '', round };
};

/**
 * Format an event name for display
 * @param {string} eventName - Event name to format
 * @param {boolean} short - Use short stroke names
 * @returns {string} - Formatted event name
 */
export const formatEventName = (eventName, short = false) => {
  const { distance, stroke } = parseEventName(eventName);
  
  if (!distance || !stroke) return eventName;
  
  const strokeDisplay = short 
    ? (STROKE_SHORT[stroke] || stroke.charAt(0).toUpperCase() + stroke.slice(1))
    : stroke.charAt(0).toUpperCase() + stroke.slice(1);
  
  return `${distance} ${strokeDisplay}`;
};

/**
 * Sort events in standard meet order (by stroke, then distance)
 * @param {string} eventA - First event name
 * @param {string} eventB - Second event name
 * @returns {number} - Sort comparison result
 */
export const sortEvents = (eventA, eventB) => {
  const a = parseEventName(eventA);
  const b = parseEventName(eventB);
  
  // Sort by stroke order first
  const strokeOrderA = STROKE_ORDER[a.stroke] || 99;
  const strokeOrderB = STROKE_ORDER[b.stroke] || 99;
  
  if (strokeOrderA !== strokeOrderB) {
    return strokeOrderA - strokeOrderB;
  }
  
  // Then by distance
  return parseInt(a.distance || '0', 10) - parseInt(b.distance || '0', 10);
};

/**
 * Check if two event names refer to the same event
 * @param {string} event1 - First event name
 * @param {string} event2 - Second event name
 * @returns {boolean} - True if same event
 */
export const isSameEvent = (event1, event2) => {
  return normalizeEventName(event1) === normalizeEventName(event2);
};

/**
 * Get all unique events from a list of results
 * @param {Array<{ event: string }>} results - Array of result objects
 * @returns {string[]} - Array of unique normalized event names
 */
export const getUniqueEvents = (results) => {
  if (!results || !Array.isArray(results)) return [];
  
  const events = new Set(results.map(r => getBaseEventName(r.event)));
  return Array.from(events).filter(Boolean).sort(sortEvents);
};

