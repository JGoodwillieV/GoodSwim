// src/utils/index.js
// Central export for all utility functions

// Time utilities
export {
  timeToSeconds,
  timeToSecondsForSort,
  secondsToTime,
  formatTimeMs,
  formatTimeMsShort,
  formatTime,
  isValidTime,
  calculateImprovement
} from './timeUtils';

// Date utilities
export {
  parseDateSafe,
  formatDateSafe,
  formatDate,
  formatDateCompact,
  formatDateShort,
  formatTimeOfDay,
  isDateInRange,
  toDateString,
  formatDateRange,
  getRelativeTime
} from './dateUtils';

// Event utilities
export {
  normalizeEventName,
  getBaseEventName,
  parseEventName,
  formatEventName,
  sortEvents,
  isSameEvent,
  getUniqueEvents,
  STROKE_ORDER,
  STANDARD_DISTANCES
} from './eventUtils';

