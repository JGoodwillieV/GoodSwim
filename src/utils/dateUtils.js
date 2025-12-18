// src/utils/dateUtils.js
// Centralized date parsing and formatting utilities
// Note: These utilities handle timezone issues by parsing dates manually

/**
 * Parse a date string safely without timezone conversion
 * This prevents the common issue where "2024-01-15" becomes "2024-01-14" due to UTC conversion
 * @param {string} dateStr - Date string (YYYY-MM-DD or ISO format)
 * @returns {Date} - Date object set to local midnight
 */
export const parseDateSafe = (dateStr) => {
  if (!dateStr) return new Date();
  
  // Extract just the date part (handles both "2024-01-15" and "2024-01-15T00:00:00Z")
  const datePart = String(dateStr).split('T')[0];
  const [year, month, day] = datePart.split('-').map(n => parseInt(n, 10));
  
  // Create date in local timezone (month is 0-indexed)
  return new Date(year, month - 1, day);
};

/**
 * Format a date string without timezone conversion issues
 * @param {string} dateStr - Date string (YYYY-MM-DD or ISO format)
 * @param {Intl.DateTimeFormatOptions} options - Formatting options
 * @returns {string} - Formatted date string
 */
export const formatDateSafe = (dateStr, options = {}) => {
  if (!dateStr) return '';
  
  const date = parseDateSafe(dateStr);
  
  // Default options if none provided
  const defaultOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  const formatOptions = Object.keys(options).length > 0 ? options : defaultOptions;
  
  return date.toLocaleDateString('en-US', formatOptions);
};

/**
 * Format a date for display (short format: "Jan 15, 2024")
 * @param {string} dateStr - Date string
 * @returns {string} - Formatted date
 */
export const formatDate = (dateStr) => {
  return formatDateSafe(dateStr, { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Format a date for compact display (e.g., "Jan 15, '24")
 * @param {string} dateStr - Date string
 * @returns {string} - Formatted date
 */
export const formatDateCompact = (dateStr) => {
  return formatDateSafe(dateStr, { month: 'short', day: 'numeric', year: '2-digit' });
};

/**
 * Format a date for charts (e.g., "Jan 15")
 * @param {string} dateStr - Date string
 * @returns {string} - Formatted date without year
 */
export const formatDateShort = (dateStr) => {
  return formatDateSafe(dateStr, { month: 'short', day: 'numeric' });
};

/**
 * Format a time string (HH:MM:SS or HH:MM) to readable format
 * @param {string} timeStr - Time string
 * @returns {string} - Formatted time like "3:30 PM"
 */
export const formatTimeOfDay = (timeStr) => {
  if (!timeStr) return '';
  
  const [hours, minutes] = timeStr.split(':').map(n => parseInt(n, 10));
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
};

/**
 * Check if a date is within a range
 * @param {string} dateStr - Date to check
 * @param {string} startStr - Start of range
 * @param {string} endStr - End of range
 * @returns {boolean}
 */
export const isDateInRange = (dateStr, startStr, endStr) => {
  const date = parseDateSafe(dateStr);
  const start = parseDateSafe(startStr);
  const end = parseDateSafe(endStr);
  
  return date >= start && date <= end;
};

/**
 * Get a date string in YYYY-MM-DD format (for database storage)
 * @param {Date} date - Date object
 * @returns {string} - Date string in YYYY-MM-DD format
 */
export const toDateString = (date) => {
  if (!date) return '';
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Format a date range for display
 * @param {string} startStr - Start date
 * @param {string} endStr - End date (optional)
 * @returns {string} - Formatted range like "Jan 15 - Jan 17, 2024"
 */
export const formatDateRange = (startStr, endStr) => {
  const start = parseDateSafe(startStr);
  
  if (!endStr || endStr === startStr) {
    return formatDateSafe(startStr);
  }
  
  const end = parseDateSafe(endStr);
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  
  if (start.getFullYear() === end.getFullYear()) {
    if (startMonth === endMonth) {
      // Same month: "Jan 15-17, 2024"
      return `${startMonth} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
    }
    // Different months: "Jan 15 - Feb 2, 2024"
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
  }
  
  // Different years
  return `${formatDateSafe(startStr)} - ${formatDateSafe(endStr)}`;
};

/**
 * Get relative time description (e.g., "2 days ago", "in 3 hours")
 * @param {string|Date} dateInput - Date to compare
 * @returns {string} - Relative time description
 */
export const getRelativeTime = (dateInput) => {
  const date = typeof dateInput === 'string' ? parseDateSafe(dateInput) : dateInput;
  const now = new Date();
  const diffMs = date - now;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
  if (diffDays < 0 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
  
  return formatDateSafe(date.toISOString());
};

