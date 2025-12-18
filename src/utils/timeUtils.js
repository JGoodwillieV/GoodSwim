// src/utils/timeUtils.js
// Centralized time parsing and formatting utilities

/**
 * Convert a time string to seconds
 * Handles formats like "1:23.45", "45.67", and DQ/NS/etc
 * @param {string} timeStr - Time string to parse
 * @returns {number|null} - Time in seconds or null if invalid/DQ
 */
export const timeToSeconds = (timeStr) => {
  if (!timeStr) return null;
  
  // Check for DQ/DNS/etc markers
  const invalidMarkers = ['DQ', 'NS', 'DFS', 'SCR', 'DNF', 'NT', 'DNS'];
  if (invalidMarkers.some(s => String(timeStr).toUpperCase().includes(s))) {
    return null;
  }
  
  // Clean the string (remove any letters)
  const cleanStr = String(timeStr).replace(/[A-Z]/gi, '').trim();
  if (!cleanStr) return null;

  const parts = cleanStr.split(':');
  let val = 0;
  
  if (parts.length === 2) {
    // Format: "1:23.45" (minutes:seconds)
    val = parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  } else if (parts.length === 3) {
    // Format: "1:23:45" (hours:minutes:seconds) - rare but possible
    val = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
  } else {
    // Format: "45.67" (seconds only)
    val = parseFloat(parts[0]);
  }
  
  return isNaN(val) || val <= 0 ? null : val;
};

/**
 * Convert a time string to seconds, returning a large number for invalid times
 * Useful for sorting where invalid times should sort last
 * @param {string} timeStr - Time string to parse
 * @returns {number} - Time in seconds or 999999 if invalid
 */
export const timeToSecondsForSort = (timeStr) => {
  const result = timeToSeconds(timeStr);
  return result === null ? 999999 : result;
};

/**
 * Convert seconds to a formatted time string
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string like "1:23.45" or "45.67"
 */
export const secondsToTime = (seconds) => {
  if (!seconds || seconds >= 999999 || seconds <= 0) return "-";
  
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  
  return mins > 0 ? `${mins}:${secs.padStart(5, '0')}` : secs;
};

/**
 * Format milliseconds to a readable time string
 * @param {number} ms - Time in milliseconds
 * @returns {string} - Formatted time string like "1:23.45"
 */
export const formatTimeMs = (ms) => {
  if (ms === null || ms === undefined) return '--';
  
  const totalSeconds = ms / 1000;
  const mins = Math.floor(totalSeconds / 60);
  const secs = (totalSeconds % 60).toFixed(2);
  
  if (mins > 0) {
    return `${mins}:${secs.padStart(5, '0')}`;
  }
  return secs;
};

/**
 * Format milliseconds to a short time string (without leading zeros on seconds)
 * @param {number} ms - Time in milliseconds
 * @returns {string} - Formatted time string
 */
export const formatTimeMsShort = (ms) => {
  if (ms === null || ms === undefined) return '--';
  
  const totalSeconds = ms / 1000;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  
  if (mins > 0) {
    return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
  }
  return secs.toFixed(2);
};

/**
 * Format seconds to a readable time for display
 * @param {number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
export const formatTime = (seconds) => {
  if (seconds === null || seconds === undefined || seconds <= 0) return '--';
  
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  
  if (mins > 0) {
    return `${mins}:${secs.padStart(5, '0')}`;
  }
  return secs;
};

/**
 * Check if a time string represents a valid swim time
 * @param {string} timeStr - Time string to validate
 * @returns {boolean} - True if valid time
 */
export const isValidTime = (timeStr) => {
  if (!timeStr) return false;
  const str = String(timeStr);
  if (str.trim() === '' || str === '0.00') return false;
  if (['DQ', 'NS', 'DFS', 'SCR', 'DNF', 'NT', 'DNS'].some(x => str.toUpperCase().includes(x))) {
    return false;
  }
  const seconds = timeToSeconds(timeStr);
  return seconds !== null && seconds > 0;
};

/**
 * Compare two times and return the improvement (negative = faster = better)
 * @param {string} newTime - New time string
 * @param {string} oldTime - Old time string
 * @returns {number|null} - Difference in seconds (negative means improvement)
 */
export const calculateImprovement = (newTime, oldTime) => {
  const newSec = timeToSeconds(newTime);
  const oldSec = timeToSeconds(oldTime);
  
  if (newSec === null || oldSec === null) return null;
  return newSec - oldSec;
};

