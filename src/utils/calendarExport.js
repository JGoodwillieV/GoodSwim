// Calendar Export Utility
// Generate .ics files for Google Calendar, iCloud, Outlook, etc.

/**
 * Formats a date for iCalendar format (YYYYMMDD)
 */
const formatICSDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

/**
 * Formats a datetime for iCalendar format (YYYYMMDDTHHmmss)
 */
const formatICSDateTime = (dateStr, timeStr) => {
  if (!dateStr) return '';
  
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  if (timeStr) {
    const [hours, minutes] = timeStr.split(':');
    return `${year}${month}${day}T${hours}${minutes}00`;
  }
  
  return `${year}${month}${day}T000000`;
};

/**
 * Escapes special characters in iCalendar text fields
 */
const escapeICSText = (text) => {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
};

/**
 * Generates a unique ID for an event
 */
const generateUID = (event) => {
  const timestamp = new Date().getTime();
  return `${event.id}-${timestamp}@stormtracker.app`;
};

/**
 * Creates an .ics file content for a single event
 */
export const createICSFile = (event) => {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//StormTracker//Calendar Export//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'BEGIN:VEVENT'];
  
  // UID
  lines.push(`UID:${generateUID(event)}`);
  
  // Timestamp
  const now = new Date();
  const timestamp = formatICSDateTime(now.toISOString().split('T')[0], 
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
  lines.push(`DTSTAMP:${timestamp}Z`);
  
  // Title
  lines.push(`SUMMARY:${escapeICSText(event.title)}`);
  
  // Description
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeICSText(event.description)}`);
  }
  
  // Location
  if (event.location_name) {
    let location = event.location_name;
    if (event.location_address) {
      location += `, ${event.location_address}`;
    }
    lines.push(`LOCATION:${escapeICSText(location)}`);
  }
  
  // Date/Time
  if (event.all_day || !event.start_time) {
    // All-day event
    const startDate = formatICSDate(event.start_date);
    const endDate = event.end_date 
      ? formatICSDate(event.end_date)
      : formatICSDate(new Date(new Date(event.start_date).getTime() + 86400000).toISOString()); // Next day
    
    lines.push(`DTSTART;VALUE=DATE:${startDate}`);
    lines.push(`DTEND;VALUE=DATE:${endDate}`);
  } else {
    // Timed event
    const startDateTime = formatICSDateTime(event.start_date, event.start_time);
    
    // Calculate end time (add 1 hour if not specified)
    let endDateTime;
    if (event.end_time) {
      endDateTime = formatICSDateTime(event.end_date || event.start_date, event.end_time);
    } else {
      const startDate = new Date(`${event.start_date}T${event.start_time}`);
      const endDate = new Date(startDate.getTime() + 3600000); // Add 1 hour
      const endDateStr = endDate.toISOString().split('T')[0];
      const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      endDateTime = formatICSDateTime(endDateStr, endTimeStr);
    }
    
    lines.push(`DTSTART:${startDateTime}`);
    lines.push(`DTEND:${endDateTime}`);
  }
  
  // Status
  lines.push('STATUS:CONFIRMED');
  
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');
  
  return lines.join('\r\n');
};

/**
 * Downloads an .ics file for the event
 */
export const downloadICSFile = (event) => {
  const icsContent = createICSFile(event);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  
  // Create a filename-safe title
  const safeTitle = event.title
    .replace(/[^a-z0-9]/gi, '_')
    .toLowerCase()
    .substring(0, 50);
  
  link.download = `${safeTitle}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

/**
 * Generates Google Calendar URL
 */
export const getGoogleCalendarURL = (event) => {
  const baseURL = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  
  const params = new URLSearchParams();
  params.append('text', event.title);
  
  if (event.description) {
    params.append('details', event.description);
  }
  
  if (event.location_name) {
    let location = event.location_name;
    if (event.location_address) {
      location += `, ${event.location_address}`;
    }
    params.append('location', location);
  }
  
  // Dates
  if (event.all_day || !event.start_time) {
    const startDate = formatICSDate(event.start_date);
    const endDate = event.end_date 
      ? formatICSDate(event.end_date)
      : formatICSDate(new Date(new Date(event.start_date).getTime() + 86400000).toISOString());
    params.append('dates', `${startDate}/${endDate}`);
  } else {
    const startDateTime = formatICSDateTime(event.start_date, event.start_time);
    let endDateTime;
    if (event.end_time) {
      endDateTime = formatICSDateTime(event.end_date || event.start_date, event.end_time);
    } else {
      const startDate = new Date(`${event.start_date}T${event.start_time}`);
      const endDate = new Date(startDate.getTime() + 3600000);
      const endDateStr = endDate.toISOString().split('T')[0];
      const endTimeStr = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
      endDateTime = formatICSDateTime(endDateStr, endTimeStr);
    }
    params.append('dates', `${startDateTime}/${endDateTime}`);
  }
  
  return `${baseURL}&${params.toString()}`;
};

/**
 * Opens event in Google Calendar (new window)
 */
export const openInGoogleCalendar = (event) => {
  const url = getGoogleCalendarURL(event);
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * Formats a date range for display
 */
export const formatEventDateRange = (event) => {
  if (!event.start_date) return '';
  
  const startDate = new Date(event.start_date);
  const options = { month: 'short', day: 'numeric' };
  
  if (event.end_date && event.end_date !== event.start_date) {
    const endDate = new Date(event.end_date);
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.toLocaleDateString('en-US', { month: 'short' })} ${startDate.getDate()}-${endDate.getDate()}`;
    }
    return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
  }
  
  let dateStr = startDate.toLocaleDateString('en-US', options);
  
  if (event.start_time && !event.all_day) {
    const [hours, minutes] = event.start_time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    dateStr += ` • ${displayHour}:${minutes} ${ampm}`;
  }
  
  return dateStr;
};

