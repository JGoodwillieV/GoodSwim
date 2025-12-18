// src/MeetsManager.jsx
// Comprehensive swim meet management for coaches
// Handles: meet creation, PDF parsing, commitments, entries, timeline, heat sheets

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import {
  Calendar, MapPin, Clock, Users, ChevronLeft, ChevronRight,
  Upload, FileText, Plus, Search, Filter, Edit2, Trash2,
  Check, X, AlertCircle, Loader2, Download, Eye,
  DollarSign, Award, Timer, Play, Video, ExternalLink, List
} from 'lucide-react';
import { parseMeetInfoPDF, parseTimelinePDF, parseHeatSheetPDF, matchHeatSheetEntries } from './utils/meetPdfParser';
import { parseSD3File } from './utils/sd3Parser';
import AutoGenerateEventsModal from './AutoGenerateEventsModal';
import { CheckCircle, Edit3, MessageSquare, Send, Waves, Bell } from 'lucide-react';

// Import centralized utilities
import { formatDateSafe, formatTimeOfDay } from './utils/dateUtils';

// ============================================
// SHARED COMPONENTS
// ============================================

const StatusBadge = ({ status }) => {
  const styles = {
    draft: 'bg-slate-100 text-slate-600',
    open: 'bg-green-100 text-green-700',
    closed: 'bg-amber-100 text-amber-700',
    completed: 'bg-blue-100 text-blue-700'
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles.draft}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Draft'}
    </span>
  );
};

// Alias for backward compatibility
const formatDate = formatDateSafe;

const formatTime = (time) => {
  if (!time) return '';
  try {
    let timeString = time;
    
    // Handle different timestamp formats
    if (typeof time === 'string') {
      // ISO format: "2025-11-14T09:00:00.000Z" or "2025-11-14T09:00:00"
      if (time.includes('T')) {
        const date = new Date(time);
        timeString = date.toTimeString().split(' ')[0]; // Gets "HH:MM:SS"
      }
      // Space-separated: "2025-11-14 09:00:00"
      else if (time.includes(' ')) {
        timeString = time.split(' ')[1];
      }
      // Already just time: "09:00:00"
    }
    
    const [hours, mins] = timeString.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12}:${mins} ${ampm}`;
  } catch (error) {
    console.error('Error formatting time:', time, error);
    return time;
  }
};

// ============================================
// MEET CARD COMPONENT (for list view)
// ============================================

const MeetCard = ({ meet, stats, onClick }) => {
  const isPast = new Date(meet.end_date || meet.start_date) < new Date();
  
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all cursor-pointer ${isPast ? 'opacity-75' : ''}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">{meet.name}</h3>
          <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
            <Calendar size={14} />
            <span>{formatDate(meet.start_date)}{meet.end_date && meet.end_date !== meet.start_date && ` - ${formatDate(meet.end_date)}`}</span>
          </div>
        </div>
        <StatusBadge status={meet.status} />
      </div>
      
      {meet.location_name && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
          <MapPin size={14} />
          <span>{meet.location_name}</span>
        </div>
      )}
      
      {stats && (
        <div className="flex gap-4 pt-3 border-t border-slate-100">
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{stats.committed_count || 0}</div>
            <div className="text-xs text-slate-500">Committed</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-amber-600">{stats.pending_count || 0}</div>
            <div className="text-xs text-slate-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-slate-400">{stats.declined_count || 0}</div>
            <div className="text-xs text-slate-500">Declined</div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// MEET FORM MODAL
// ============================================

const MeetFormModal = ({ meet, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: meet?.name || '',
    start_date: meet?.start_date || '',
    end_date: meet?.end_date || '',
    entry_deadline: meet?.entry_deadline || '',
    location_name: meet?.location_name || '',
    location_address: meet?.location_address || '',
    sanction_number: meet?.sanction_number || '',
    team_code: meet?.team_code || 'HNVR',
    meet_type: meet?.meet_type || 'timed_finals',
    course: meet?.course || 'SCY',
    events_per_day_limit: meet?.events_per_day_limit || 3,
    entry_fee_individual: meet?.entry_fee_individual || '',
    entry_fee_relay: meet?.entry_fee_relay || '',
    entry_fee_surcharge: meet?.entry_fee_surcharge || '',
    host_team: meet?.host_team || '',
    meet_director_name: meet?.meet_director_name || '',
    meet_director_email: meet?.meet_director_email || '',
  });
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setParsing(true);
    try {
      const parsed = await parseMeetInfoPDF(file);
      
      // Update form with parsed data
      setFormData(prev => ({
        ...prev,
        name: parsed.name || prev.name,
        start_date: parsed.startDate ? parsed.startDate.toISOString().split('T')[0] : prev.start_date,
        end_date: parsed.endDate ? parsed.endDate.toISOString().split('T')[0] : prev.end_date,
        location_name: parsed.locationName || prev.location_name,
        location_address: parsed.locationAddress || prev.location_address,
        sanction_number: parsed.sanctionNumber || prev.sanction_number,
        events_per_day_limit: parsed.eventsPerDayLimit || prev.events_per_day_limit,
        entry_fee_individual: parsed.fees?.individual || prev.entry_fee_individual,
        entry_fee_relay: parsed.fees?.relay || prev.entry_fee_relay,
        entry_fee_surcharge: parsed.fees?.surcharge || prev.entry_fee_surcharge,
        host_team: parsed.hostTeam || prev.host_team,
        meet_director_name: parsed.meetDirector?.name || prev.meet_director_name,
        meet_director_email: parsed.meetDirector?.email || prev.meet_director_email,
        course: parsed.course || prev.course,
        meet_type: parsed.meetType || prev.meet_type,
        entry_deadline: parsed.entryDeadline ? parsed.entryDeadline.toISOString().split('T')[0] : prev.entry_deadline,
      }));
      
      // Store parsed events if any
      if (parsed.events?.length > 0) {
        setFormData(prev => ({ ...prev, _parsedEvents: parsed.events }));
      }
      
    } catch (error) {
      console.error('PDF parsing error:', error);
      alert('Error parsing PDF: ' + error.message);
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.start_date) {
      alert('Meet name and start date are required');
      return;
    }
    
    setLoading(true);
    try {
      const { _parsedEvents, ...rawMeetData } = formData;
      
      // Clean up data - convert empty strings to null for optional fields
      const meetData = {
        ...rawMeetData,
        end_date: rawMeetData.end_date || null,
        entry_deadline: rawMeetData.entry_deadline || null,
        location_name: rawMeetData.location_name || null,
        location_address: rawMeetData.location_address || null,
        sanction_number: rawMeetData.sanction_number || null,
        host_team: rawMeetData.host_team || null,
        meet_director_name: rawMeetData.meet_director_name || null,
        meet_director_email: rawMeetData.meet_director_email || null,
        entry_fee_individual: rawMeetData.entry_fee_individual || null,
        entry_fee_relay: rawMeetData.entry_fee_relay || null,
        entry_fee_surcharge: rawMeetData.entry_fee_surcharge || null,
      };
      
      if (meet?.id) {
        // Update existing
        const { error } = await supabase
          .from('meets')
          .update(meetData)
          .eq('id', meet.id);
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('meets')
          .insert({ ...meetData, status: 'draft' })
          .select()
          .single();
        if (error) throw error;
        
        // Insert parsed events if any
        if (_parsedEvents?.length > 0) {
          // Log all parsed events for debugging
          console.log('All parsed events:', _parsedEvents.map(e => `#${e.eventNumber} ${e.gender} ${e.ageGroup} ${e.distance} ${e.stroke}`));
          
          // Deduplicate events by event_number (keep first occurrence)
          const seenEventNumbers = new Set();
          const uniqueEvents = _parsedEvents.filter(evt => {
            const key = evt.eventNumber;
            if (seenEventNumbers.has(key)) {
              console.log(`Skipping duplicate event #${key}`);
              return false;
            }
            seenEventNumbers.add(key);
            return true;
          });
          
          console.log(`Inserting ${uniqueEvents.length} unique events (${_parsedEvents.length} total parsed)`);
          
          const eventsToInsert = uniqueEvents.map(evt => ({
            meet_id: data.id,
            event_number: evt.eventNumber,
            event_name: evt.eventName || `${evt.gender || ''} ${evt.ageGroup || ''} ${evt.distance || ''} ${evt.stroke || ''}`.trim(),
            age_group: evt.ageGroup,
            gender: evt.gender,
            distance: evt.distance,
            stroke: evt.stroke,
            is_relay: evt.isRelay || false
          }));
          
          // Insert in batches to avoid issues
          const batchSize = 50;
          for (let i = 0; i < eventsToInsert.length; i += batchSize) {
            const batch = eventsToInsert.slice(i, i + batchSize);
            const { error: eventsError } = await supabase.from('meet_events').insert(batch);
            if (eventsError) {
              console.error(`Error inserting events batch ${i}-${i+batch.length}:`, eventsError);
              // Continue with other batches
            }
          }
        }
      }
      
      onSave();
    } catch (error) {
      alert('Error saving meet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-xl font-bold">{meet ? 'Edit Meet' : 'Create New Meet'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* PDF Upload */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="text-blue-600" size={20} />
              <span className="font-medium text-blue-800">Auto-fill from Meet Info PDF</span>
            </div>
            <p className="text-sm text-blue-600 mb-3">Upload the meet announcement PDF to auto-populate fields</p>
            <label className={`inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 ${parsing ? 'opacity-50 cursor-wait' : ''}`}>
              {parsing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {parsing ? 'Parsing...' : 'Upload PDF'}
              <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" disabled={parsing} />
            </label>
          </div>
          
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 border-b pb-2">Basic Information</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Meet Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Start Date *</label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Entry Deadline</label>
              <input
                type="date"
                value={formData.entry_deadline}
                onChange={(e) => setFormData({ ...formData, entry_deadline: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Sanction Number</label>
              <input
                type="text"
                value={formData.sanction_number}
                onChange={(e) => setFormData({ ...formData, sanction_number: e.target.value })}
                placeholder="e.g., VA-24-123"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Your Team Code</label>
              <input
                type="text"
                value={formData.team_code}
                onChange={(e) => setFormData({ ...formData, team_code: e.target.value.toUpperCase() })}
                placeholder="e.g., HNVR, RAYS"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">Used for matching heat sheets to your swimmers</p>
            </div>
          </div>
          
          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 border-b pb-2">Location</h3>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Venue Name</label>
              <input
                type="text"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                placeholder="e.g., NOVA Aquatic Center"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
              <input
                type="text"
                value={formData.location_address}
                onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                placeholder="123 Pool Lane, Reston, VA 20190"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Meet Format */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 border-b pb-2">Meet Format</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Meet Type</label>
                <select
                  value={formData.meet_type}
                  onChange={(e) => setFormData({ ...formData, meet_type: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="timed_finals">Timed Finals</option>
                  <option value="prelims_finals">Prelims/Finals</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Course</label>
                <select
                  value={formData.course}
                  onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SCY">Short Course Yards (SCY)</option>
                  <option value="SCM">Short Course Meters (SCM)</option>
                  <option value="LCM">Long Course Meters (LCM)</option>
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Events Per Day Limit</label>
              <input
                type="number"
                value={formData.events_per_day_limit}
                onChange={(e) => setFormData({ ...formData, events_per_day_limit: parseInt(e.target.value) || 3 })}
                min="1"
                max="10"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          {/* Entry Fees */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-700 border-b pb-2">Entry Fees</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Individual ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.entry_fee_individual}
                  onChange={(e) => setFormData({ ...formData, entry_fee_individual: e.target.value })}
                  placeholder="6.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Relay ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.entry_fee_relay}
                  onChange={(e) => setFormData({ ...formData, entry_fee_relay: e.target.value })}
                  placeholder="20.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Surcharge ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.entry_fee_surcharge}
                  onChange={(e) => setFormData({ ...formData, entry_fee_surcharge: e.target.value })}
                  placeholder="10.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {meet ? 'Update Meet' : 'Create Meet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================
// EVENT ROW - With inline editing
// ============================================

const EventRow = ({ event, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    event_number: event.event_number,
    event_name: event.event_name
  });

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('meet_events')
        .update({
          event_number: parseInt(editValues.event_number),
          event_name: editValues.event_name
        })
        .eq('id', event.id);
      
      if (error) throw error;
      setEditing(false);
      onUpdate();
    } catch (error) {
      alert('Error updating event: ' + error.message);
    }
  };

  if (editing) {
    return (
      <tr className="bg-blue-50">
        <td className="px-4 py-2">
          <input
            type="number"
            value={editValues.event_number}
            onChange={e => setEditValues(prev => ({ ...prev, event_number: e.target.value }))}
            className="w-16 border rounded px-2 py-1 text-sm"
            autoFocus
          />
        </td>
        <td className="px-4 py-2">
          <input
            type="text"
            value={editValues.event_name}
            onChange={e => setEditValues(prev => ({ ...prev, event_name: e.target.value }))}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </td>
        <td className="px-4 py-2 text-slate-600">{event.age_group}</td>
        <td className="px-4 py-2 text-slate-600">{event.distance}</td>
        <td className="px-4 py-2 text-slate-600">{event.stroke}</td>
        <td className="px-4 py-2 text-right">
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleSave}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
            >
              <Check size={16} />
            </button>
            <button
              onClick={() => setEditing(false)}
              className="p-1 text-slate-400 hover:bg-slate-100 rounded"
            >
              <X size={16} />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="hover:bg-slate-50 group">
      <td className="px-4 py-3 font-medium text-slate-800">
        <span 
          onClick={() => setEditing(true)}
          className="cursor-pointer hover:text-blue-600"
          title="Click to edit"
        >
          {event.event_number}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-700">
        <span 
          onClick={() => setEditing(true)}
          className="cursor-pointer hover:text-blue-600"
          title="Click to edit"
        >
          {event.event_name}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-600">{event.age_group}</td>
      <td className="px-4 py-3 text-slate-600">{event.distance}</td>
      <td className="px-4 py-3 text-slate-600">{event.stroke}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setEditing(true)}
            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ============================================
// EVENTS TAB - Manage meet events
// ============================================

const EventsTab = ({ meet, onRefresh }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    event_number: '',
    event_name: '',
    age_group: '11-12',
    gender: 'Mixed',
    distance: '',
    stroke: 'Freestyle',
    is_relay: false
  });

  useEffect(() => {
    loadEvents();
  }, [meet.id]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('meet_events')
        .select('*')
        .eq('meet_id', meet.id)
        .order('event_number');
      setEvents(data || []);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.event_number || !newEvent.distance || !newEvent.stroke) {
      alert('Please fill in event number, distance, and stroke');
      return;
    }

    try {
      const eventName = newEvent.event_name || 
        `${newEvent.gender} ${newEvent.age_group} ${newEvent.distance} ${newEvent.stroke}`;
      
      const { error } = await supabase
        .from('meet_events')
        .insert({
          meet_id: meet.id,
          event_number: parseInt(newEvent.event_number),
          event_name: eventName,
          age_group: newEvent.age_group,
          gender: newEvent.gender,
          distance: parseInt(newEvent.distance),
          stroke: newEvent.stroke,
          is_relay: newEvent.is_relay
        });

      if (error) throw error;
      
      setShowAddModal(false);
      setNewEvent({
        event_number: '',
        event_name: '',
        age_group: '11-12',
        gender: 'Mixed',
        distance: '',
        stroke: 'Freestyle',
        is_relay: false
      });
      loadEvents();
      onRefresh();
    } catch (error) {
      alert('Error adding event: ' + error.message);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Delete this event?')) return;
    
    try {
      const { error } = await supabase
        .from('meet_events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      loadEvents();
      onRefresh();
    } catch (error) {
      alert('Error deleting event: ' + error.message);
    }
  };

  const addStandardEvents = async (ageGroup) => {
    const standardEvents = [
      { distance: 50, stroke: 'Freestyle' },
      { distance: 100, stroke: 'Freestyle' },
      { distance: 200, stroke: 'Freestyle' },
      { distance: 500, stroke: 'Freestyle' },
      { distance: 50, stroke: 'Backstroke' },
      { distance: 100, stroke: 'Backstroke' },
      { distance: 50, stroke: 'Breaststroke' },
      { distance: 100, stroke: 'Breaststroke' },
      { distance: 50, stroke: 'Butterfly' },
      { distance: 100, stroke: 'Butterfly' },
      { distance: 100, stroke: 'IM' },
      { distance: 200, stroke: 'IM' },
    ];

    // Get next event number
    const maxEventNum = events.length > 0 
      ? Math.max(...events.map(e => e.event_number || 0)) 
      : 0;

    const newEvents = standardEvents.map((evt, idx) => ({
      meet_id: meet.id,
      event_number: maxEventNum + idx + 1,
      event_name: `${ageGroup} ${evt.distance} ${evt.stroke}`,
      age_group: ageGroup,
      gender: 'Mixed',
      distance: evt.distance,
      stroke: evt.stroke,
      is_relay: false
    }));

    try {
      const { error } = await supabase
        .from('meet_events')
        .insert(newEvents);
      
      if (error) throw error;
      loadEvents();
      onRefresh();
    } catch (error) {
      alert('Error adding events: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <span className="text-lg font-semibold text-slate-800">{events.length} Events</span>
        </div>
        <div className="flex gap-2">
          <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
              <Plus size={16} />
              Add Standard Set
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button onClick={() => addStandardEvents('10 & Under')} className="w-full px-4 py-2 text-left hover:bg-slate-50 text-sm">10 & Under Events</button>
              <button onClick={() => addStandardEvents('11-12')} className="w-full px-4 py-2 text-left hover:bg-slate-50 text-sm">11-12 Events</button>
              <button onClick={() => addStandardEvents('13-14')} className="w-full px-4 py-2 text-left hover:bg-slate-50 text-sm">13-14 Events</button>
              <button onClick={() => addStandardEvents('15 & Over')} className="w-full px-4 py-2 text-left hover:bg-slate-50 text-sm">15 & Over Events</button>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Single Event
          </button>
        </div>
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Award size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-600 font-medium">No events added yet</p>
          <p className="text-sm text-slate-500 mt-1">Add events so swimmers can be entered</p>
          <p className="text-sm text-slate-500">Use "Add Standard Set" for quick setup</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Age Group</th>
                <th className="px-4 py-3 font-medium">Distance</th>
                <th className="px-4 py-3 font-medium">Stroke</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map(evt => (
                <EventRow 
                  key={evt.id} 
                  event={evt} 
                  onUpdate={loadEvents}
                  onDelete={() => handleDeleteEvent(evt.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Single Event Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">Add Event</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Event #</label>
                  <input
                    type="number"
                    value={newEvent.event_number}
                    onChange={e => setNewEvent(prev => ({ ...prev, event_number: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Age Group</label>
                  <select
                    value={newEvent.age_group}
                    onChange={e => setNewEvent(prev => ({ ...prev, age_group: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="8 & Under">8 & Under</option>
                    <option value="10 & Under">10 & Under</option>
                    <option value="11-12">11-12</option>
                    <option value="13-14">13-14</option>
                    <option value="15-16">15-16</option>
                    <option value="15 & Over">15 & Over</option>
                    <option value="Open">Open</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Distance</label>
                  <select
                    value={newEvent.distance}
                    onChange={e => setNewEvent(prev => ({ ...prev, distance: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">Select...</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                    <option value="200">200</option>
                    <option value="400">400</option>
                    <option value="500">500</option>
                    <option value="800">800</option>
                    <option value="1000">1000</option>
                    <option value="1500">1500</option>
                    <option value="1650">1650</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Stroke</label>
                  <select
                    value={newEvent.stroke}
                    onChange={e => setNewEvent(prev => ({ ...prev, stroke: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="Freestyle">Freestyle</option>
                    <option value="Backstroke">Backstroke</option>
                    <option value="Breaststroke">Breaststroke</option>
                    <option value="Butterfly">Butterfly</option>
                    <option value="IM">IM</option>
                    <option value="Free Relay">Free Relay</option>
                    <option value="Medley Relay">Medley Relay</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Event Name (optional)</label>
                <input
                  type="text"
                  value={newEvent.event_name}
                  onChange={e => setNewEvent(prev => ({ ...prev, event_name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="Auto-generated if blank"
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={newEvent.is_relay}
                  onChange={e => setNewEvent(prev => ({ ...prev, is_relay: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-slate-700">This is a relay event</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEvent}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================
// COMMITMENTS TAB
// ============================================

const CommitmentsTab = ({ meet, onRefresh }) => {
  const [commitments, setCommitments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadCommitments();
  }, [meet.id]);

  const loadCommitments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meet_commitments')
        .select(`
          *,
          swimmers(id, name, age, gender, group_name),
          parents(id, account_name, email)
        `)
        .eq('meet_id', meet.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCommitments(data || []);
    } catch (error) {
      console.error('Error loading commitments:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCommitments = useMemo(() => {
    if (filter === 'all') return commitments;
    return commitments.filter(c => c.status === filter);
  }, [commitments, filter]);

  const stats = useMemo(() => ({
    total: commitments.length,
    committed: commitments.filter(c => c.status === 'committed').length,
    pending: commitments.filter(c => c.status === 'pending').length,
    declined: commitments.filter(c => c.status === 'declined').length
  }), [commitments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
          <div className="text-sm text-slate-500">Total</div>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.committed}</div>
          <div className="text-sm text-green-600">Committed</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
          <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          <div className="text-sm text-amber-600">Pending</div>
        </div>
        <div className="bg-slate-50 rounded-xl border p-4 text-center">
          <div className="text-2xl font-bold text-slate-400">{stats.declined}</div>
          <div className="text-sm text-slate-500">Declined</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'committed', 'pending', 'declined'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Commitments List */}
      {filteredCommitments.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Users size={48} className="mx-auto mb-4 opacity-50" />
          <p>No commitments yet</p>
          <p className="text-sm">Parents will commit their swimmers once the meet is published</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border divide-y">
          {filteredCommitments.map(commitment => (
            <div key={commitment.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  commitment.status === 'committed' ? 'bg-green-100 text-green-600' :
                  commitment.status === 'declined' ? 'bg-slate-100 text-slate-400' :
                  'bg-amber-100 text-amber-600'
                }`}>
                  {commitment.status === 'committed' ? <Check size={20} /> :
                   commitment.status === 'declined' ? <X size={20} /> :
                   <Clock size={20} />}
                </div>
                <div>
                  <div className="font-medium text-slate-800">{commitment.swimmers?.name}</div>
                  <div className="text-sm text-slate-500">
                    {commitment.swimmers?.group_name} • {commitment.parents?.account_name}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <StatusBadge status={commitment.status} />
                {commitment.committed_at && (
                  <div className="text-xs text-slate-400 mt-1">
                    {formatDate(commitment.committed_at)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// CONFIRMATION BADGE COMPONENT
// ============================================

const ConfirmationBadge = ({ status }) => {
  const config = {
    pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: Clock },
    confirmed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle },
    change_requested: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Edit3 },
    scratched: { bg: 'bg-red-100', text: 'text-red-700', icon: X }
  };
  
  const { bg, text, icon: Icon } = config[status] || config.pending;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
      <Icon size={12} />
      {(status || 'pending').replace('_', ' ')}
    </span>
  );
};

// ============================================
// SD3 UPLOAD MODAL
// ============================================

const SD3UploadModal = ({ meet, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [matchResults, setMatchResults] = useState(null);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);
    setParsing(true);
    
    try {
      const content = await selectedFile.text();
      const parsed = parseSD3File(content);
      setParsedData(parsed);
      
      // Match swimmers to database
      await matchSwimmers(parsed.swimmerList);
    } catch (err) {
      setError('Failed to parse SD3 file: ' + err.message);
    } finally {
      setParsing(false);
    }
  };

  const matchSwimmers = async (swimmerList) => {
    try {
      const { data: dbSwimmers } = await supabase
        .from('swimmers')
        .select('id, name, usa_swimming_id');
      
      const normalizeSD3Name = (name) => {
        if (!name) return { full: '', first: '', last: '' };
        const parts = name.split(',').map(p => p.trim());
        if (parts.length >= 2) {
          const lastName = parts[0].toLowerCase().replace(/[^a-z]/g, '');
          const firstPart = parts[1].split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
          return { full: firstPart + lastName, first: firstPart, last: lastName };
        }
        return { full: name.toLowerCase().replace(/[^a-z]/g, ''), first: '', last: '' };
      };
      
      const normalizeDBName = (name) => {
        if (!name) return { full: '', first: '', last: '' };
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
          const firstName = parts[0].toLowerCase().replace(/[^a-z]/g, '');
          const lastName = parts[parts.length - 1].toLowerCase().replace(/[^a-z]/g, '');
          return { full: name.toLowerCase().replace(/[^a-z]/g, ''), first: firstName, last: lastName };
        }
        return { full: name.toLowerCase().replace(/[^a-z]/g, ''), first: '', last: '' };
      };
      
      const matches = swimmerList.map(swimmer => {
        let match = null;
        
        if (swimmer.usaSwimmingId) {
          const sd3Id = swimmer.usaSwimmingId.substring(0, 12).toUpperCase();
          match = dbSwimmers?.find(db => {
            if (!db.usa_swimming_id) return false;
            return db.usa_swimming_id.substring(0, 12).toUpperCase() === sd3Id;
          });
        }
        
        if (!match) {
          const sd3Name = normalizeSD3Name(swimmer.name);
          match = dbSwimmers?.find(db => {
            const dbName = normalizeDBName(db.name);
            if (sd3Name.first && sd3Name.last && dbName.first && dbName.last) {
              if (sd3Name.first === dbName.first && sd3Name.last === dbName.last) return true;
            }
            if (dbName.full === sd3Name.full) return true;
            if (sd3Name.first && sd3Name.last) {
              if (dbName.full.includes(sd3Name.first) && dbName.full.includes(sd3Name.last)) return true;
            }
            return false;
          });
        }
        
        return {
          ...swimmer,
          matchedSwimmerId: match?.id || null,
          matchedSwimmerName: match?.name || null,
          matchStatus: match ? 'matched' : 'unmatched'
        };
      });
      
      setMatchResults(matches);
    } catch (err) {
      console.error('Error matching swimmers:', err);
    }
  };

  const handleSave = async () => {
    if (!parsedData) return;
    
    setSaving(true);
    setError(null);
    
    try {
      // Create entry records
      const entries = parsedData.entries.map(entry => {
        const matchedSwimmer = matchResults?.find(m => m.usaSwimmingId === entry.usaSwimmingId);
        
        return {
          meet_id: meet.id,
          swimmer_id: matchedSwimmer?.matchedSwimmerId || null,
          swimmer_name: entry.swimmerName,
          usa_swimming_id: entry.usaSwimmingId,
          event_code: entry.eventCode,
          event_number: entry.eventNumber,
          event_name: entry.eventName,
          seed_time_seconds: entry.seedTimeSeconds,
          seed_time_display: entry.seedTimeDisplay,
          age_group: entry.ageGroup,
          is_bonus: entry.isBonus
        };
      });
      
      const { error: entriesError } = await supabase
        .from('meet_entries')
        .insert(entries);
      
      if (entriesError) throw entriesError;
      
      onSuccess(entries.length);
    } catch (err) {
      setError('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="font-bold text-lg text-slate-800">Upload SD3 Entries</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl">
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {!parsedData && (
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
              <input type="file" accept=".sd3" onChange={handleFileChange} className="hidden" id="sd3-upload" />
              <label htmlFor="sd3-upload" className="cursor-pointer">
                {parsing ? (
                  <Loader2 size={48} className="mx-auto text-blue-500 animate-spin mb-3" />
                ) : (
                  <Upload size={48} className="mx-auto text-slate-300 mb-3" />
                )}
                <p className="font-semibold text-slate-700">{parsing ? 'Parsing file...' : 'Click to upload SD3 file'}</p>
                <p className="text-sm text-slate-500 mt-1">Export from TeamUnify or SwimTopia</p>
              </label>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="text-red-500 shrink-0" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}
          
          {parsedData && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Parse Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-600">Swimmers</p>
                    <p className="text-2xl font-bold text-blue-800">{parsedData.swimmerList.length}</p>
                  </div>
                  <div>
                    <p className="text-blue-600">Entries</p>
                    <p className="text-2xl font-bold text-blue-800">{parsedData.entries.length}</p>
                  </div>
                  <div>
                    <p className="text-blue-600">Matched</p>
                    <p className="text-2xl font-bold text-blue-800">
                      {matchResults?.filter(m => m.matchStatus === 'matched').length || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              {matchResults && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">
                    Swimmer Matching ({matchResults.filter(m => m.matchStatus === 'unmatched').length} unmatched)
                  </h3>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl">
                    {matchResults.map((swimmer, idx) => (
                      <div key={idx} className={`flex items-center justify-between px-4 py-2 ${idx !== matchResults.length - 1 ? 'border-b border-slate-100' : ''}`}>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${swimmer.matchStatus === 'matched' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-sm text-slate-700">{swimmer.name}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {swimmer.matchStatus === 'matched' ? `→ ${swimmer.matchedSwimmerName}` : 'No match'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        {parsedData && (
          <div className="p-4 border-t border-slate-200 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-medium">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Import {parsedData.entries.length} Entries
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// CONFIRMATION DETAIL VIEW
// ============================================

const ConfirmationDetailView = ({ confirmation, entries, onBack, onProcessScratch }) => {
  const scratchedEntries = entries.filter(e => 
    confirmation.scratch_requests?.includes(e.id)
  );
  
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
        <ChevronLeft size={18} />
        Back to Confirmations
      </button>
      
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-800">{confirmation.swimmers?.name}</h3>
            <p className="text-slate-500">Confirmation from {confirmation.parents?.account_name}</p>
          </div>
          <ConfirmationBadge status={confirmation.status} />
        </div>
        
        {/* Parent Notes */}
        {confirmation.parent_notes && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
              <MessageSquare size={16} />
              Parent Notes
            </div>
            <p className="text-blue-800">{confirmation.parent_notes}</p>
          </div>
        )}
        
        {/* Scratch Requests */}
        {scratchedEntries.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-700 font-semibold mb-3">
              <X size={16} />
              Scratch Requests ({scratchedEntries.length})
            </div>
            <div className="space-y-2">
              {scratchedEntries.map(entry => (
                <div key={entry.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center text-sm font-bold">
                      {entry.event_number || '#'}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 line-through">{entry.event_name}</p>
                      <p className="text-xs text-slate-500">{entry.seed_time_display || 'NT'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onProcessScratch(entry.id)}
                    className="text-xs px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Process Scratch
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Confirmed Events */}
        <div>
          <h4 className="font-semibold text-slate-700 mb-2">
            {confirmation.status === 'confirmed' ? 'Confirmed Events' : 'All Entries'}
          </h4>
          <div className="space-y-2">
            {entries.filter(e => !confirmation.scratch_requests?.includes(e.id)).map(entry => (
              <div key={entry.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm font-bold">
                    {entry.event_number || '#'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">{entry.event_name}</p>
                  </div>
                </div>
                <span className="font-mono text-slate-600">{entry.seed_time_display || 'NT'}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="text-xs text-slate-400 pt-4 border-t">
          Confirmed at: {new Date(confirmation.confirmed_at).toLocaleString()}
        </div>
      </div>
    </div>
  );
};

// ============================================
// ENTRIES TAB (ENHANCED WITH CONFIRMATIONS)
// ============================================

const EntriesTab = ({ meet, onRefresh }) => {
  const [entries, setEntries] = useState([]);
  const [swimmers, setSwimmers] = useState([]);
  const [meetEvents, setMeetEvents] = useState([]);
  const [confirmations, setConfirmations] = useState([]);
  const [confirmationStats, setConfirmationStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showSD3Upload, setShowSD3Upload] = useState(false);
  const [selectedSwimmer, setSelectedSwimmer] = useState(null);
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [selectedConfirmation, setSelectedConfirmation] = useState(null);

  useEffect(() => {
    loadData();
  }, [meet.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load entries
      const { data: entriesData } = await supabase
        .from('meet_entries')
        .select(`
          *,
          swimmers(id, name, age, gender, group_name)
        `)
        .eq('meet_id', meet.id);
      
      // Load committed swimmers
      const { data: committedData } = await supabase.rpc('get_committed_swimmers', { meet_uuid: meet.id });
      
      // Load meet events
      const { data: eventsData } = await supabase
        .from('meet_events')
        .select('*')
        .eq('meet_id', meet.id)
        .order('event_number');
      
      // Load confirmations
      const { data: confirmData } = await supabase
        .from('entry_confirmations')
        .select(`
          *,
          swimmers (id, name),
          parents (id, account_name)
        `)
        .eq('meet_id', meet.id);
      
      // Load confirmation stats
      const { data: statsData } = await supabase
        .rpc('get_meet_confirmation_stats', { meet_uuid: meet.id });
      
      setEntries(entriesData || []);
      setSwimmers(committedData || []);
      setMeetEvents(eventsData || []);
      setConfirmations(confirmData || []);
      if (statsData && statsData.length > 0) {
        setConfirmationStats(statsData[0]);
      }
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group entries by swimmer
  const groupedEntries = useMemo(() => {
    const groups = {};
    entries.forEach(entry => {
      const name = entry.swimmers?.name || entry.swimmer_name || 'Unknown';
      if (!groups[name]) {
        groups[name] = {
          swimmer: entry.swimmers,
          swimmerName: name,
          swimmerId: entry.swimmer_id,
          entries: []
        };
      }
      groups[name].entries.push(entry);
    });
    return Object.values(groups).sort((a, b) => a.swimmerName.localeCompare(b.swimmerName));
  }, [entries]);

  // Filter entries by confirmation status
  const filteredGroups = useMemo(() => {
    if (!statusFilter) return groupedEntries;
    
    return groupedEntries.filter(group => {
      const conf = confirmations.find(c => c.swimmer_id === group.swimmerId);
      if (statusFilter === 'pending') {
        return !conf || conf.status === 'pending';
      }
      return conf?.status === statusFilter;
    });
  }, [groupedEntries, confirmations, statusFilter]);

  // Filter confirmations by status for detail view
  const filteredConfirmations = useMemo(() => {
    if (!statusFilter) return confirmations;
    return confirmations.filter(c => c.status === statusFilter);
  }, [confirmations, statusFilter]);

  const handlePublishEntries = async () => {
    if (!confirm('Publish entries to parents? They will receive a notification to confirm their swimmer\'s events.')) return;
    
    try {
      const { error } = await supabase
        .from('meets')
        .update({ status: 'open' })
        .eq('id', meet.id);
      
      if (error) throw error;
      
      // Create announcement
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('id', user.id)
        .single();
      
      await supabase
        .from('announcements')
        .insert({
          title: `ACTION REQUIRED: ${meet.name} Entries`,
          content: `Meet entries are now available for review. Please confirm your swimmer's events${meet.entry_deadline ? ` by ${formatDateSafe(meet.entry_deadline)}` : ''}.`,
          type: 'meet',
          is_urgent: true,
          author_id: user.id,
          author_name: profile?.display_name || 'Coach'
        });
      
      alert('Entries published! Parents will be notified.');
      onRefresh();
    } catch (error) {
      alert('Error publishing: ' + error.message);
    }
  };

  const handleProcessScratch = async (entryId) => {
    if (!confirm('Remove this entry from the meet?')) return;
    
    try {
      const { error } = await supabase
        .from('meet_entries')
        .delete()
        .eq('id', entryId);
      
      if (error) throw error;
      
      alert('Entry scratched successfully');
      loadData();
    } catch (error) {
      alert('Error scratching entry: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // Show confirmation detail view
  if (selectedConfirmation) {
    const swimmerEntries = entries.filter(e => e.swimmer_id === selectedConfirmation.swimmer_id);
    return (
      <ConfirmationDetailView
        confirmation={selectedConfirmation}
        entries={swimmerEntries}
        onBack={() => setSelectedConfirmation(null)}
        onProcessScratch={handleProcessScratch}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Confirmation Status Cards (Clickable) */}
      {meet.status === 'open' && confirmationStats && (
        <div className="grid grid-cols-4 gap-3">
          <button
            onClick={() => setStatusFilter(statusFilter === 'confirmed' ? null : 'confirmed')}
            className={`rounded-xl p-4 text-center border-2 transition-all ${
              statusFilter === 'confirmed' 
                ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-400' 
                : 'bg-emerald-50 border-emerald-200 hover:border-emerald-400'
            }`}
          >
            <p className="text-2xl font-bold text-emerald-600">{confirmationStats.confirmed_count || 0}</p>
            <p className="text-sm text-emerald-700 font-medium">Confirmed</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'pending' ? null : 'pending')}
            className={`rounded-xl p-4 text-center border-2 transition-all ${
              statusFilter === 'pending' 
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400' 
                : 'bg-amber-50 border-amber-200 hover:border-amber-400'
            }`}
          >
            <p className="text-2xl font-bold text-amber-600">{confirmationStats.pending_count || 0}</p>
            <p className="text-sm text-amber-700 font-medium">Pending</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'change_requested' ? null : 'change_requested')}
            className={`rounded-xl p-4 text-center border-2 transition-all ${
              statusFilter === 'change_requested' 
                ? 'bg-blue-100 border-blue-400 ring-2 ring-blue-400' 
                : 'bg-blue-50 border-blue-200 hover:border-blue-400'
            }`}
          >
            <p className="text-2xl font-bold text-blue-600">{confirmationStats.change_requested_count || 0}</p>
            <p className="text-sm text-blue-700 font-medium">Changes Requested</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'declined' ? null : 'declined')}
            className={`rounded-xl p-4 text-center border-2 transition-all ${
              statusFilter === 'declined' 
                ? 'bg-red-100 border-red-400 ring-2 ring-red-400' 
                : 'bg-red-50 border-red-200 hover:border-red-400'
            }`}
          >
            <p className="text-2xl font-bold text-red-600">{confirmationStats.declined_count || 0}</p>
            <p className="text-sm text-red-700 font-medium">Scratched</p>
          </button>
        </div>
      )}

      {/* Active Filter Indicator */}
      {statusFilter && (
        <div className="flex items-center justify-between bg-slate-100 rounded-lg px-4 py-2">
          <span className="text-sm text-slate-600">
            Showing: <strong className="capitalize">{statusFilter.replace('_', ' ')}</strong>
          </span>
          <button 
            onClick={() => setStatusFilter(null)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Header with buttons */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <span className="text-lg font-semibold text-slate-800">{entries.length} Entries</span>
          <span className="text-slate-500 ml-2">from {groupedEntries.length} swimmers</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {meet.status === 'draft' && entries.length > 0 && (
            <button
              onClick={handlePublishEntries}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              <Send size={16} />
              Publish to Parents
            </button>
          )}
          <button
            onClick={() => setShowSD3Upload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Upload size={16} />
            Upload SD3
          </button>
          <button
            onClick={() => setShowAutoGenerate(true)}
            disabled={swimmers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title={swimmers.length === 0 ? "No committed swimmers yet" : "Auto-generate event entries using AI"}
          >
            <Award size={16} />
            Auto-Generate
          </button>
          <button
            onClick={() => setShowAddEntry(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Entries
          </button>
        </div>
      </div>

      {/* Show Confirmations List when filtering by status */}
      {statusFilter && filteredConfirmations.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-semibold text-slate-700">
            {statusFilter === 'change_requested' ? 'Change Requests' : 
             statusFilter === 'confirmed' ? 'Confirmed Swimmers' :
             statusFilter === 'pending' ? 'Pending Confirmations' :
             'Declined/Scratched'}
          </h4>
          {filteredConfirmations.map(conf => (
            <button
              key={conf.id}
              onClick={() => setSelectedConfirmation(conf)}
              className="w-full bg-white rounded-xl border p-4 text-left hover:shadow-md hover:border-blue-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                    {conf.swimmers?.name?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{conf.swimmers?.name}</p>
                    <p className="text-sm text-slate-500">by {conf.parents?.account_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {conf.scratch_requests?.length > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
                      {conf.scratch_requests.length} scratch{conf.scratch_requests.length > 1 ? 'es' : ''}
                    </span>
                  )}
                  {conf.parent_notes && (
                    <MessageSquare size={16} className="text-blue-500" />
                  )}
                  <ConfirmationBadge status={conf.status} />
                  <ChevronRight size={18} className="text-slate-400" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Entries by Swimmer (when not filtering or showing all) */}
      {!statusFilter && (
        <>
          {filteredGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <FileText size={48} className="mx-auto mb-4 opacity-50" />
              <p>No entries yet</p>
              <p className="text-sm">Upload an SD3 file or add entries manually</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredGroups.map(group => {
                const conf = confirmations.find(c => c.swimmer_id === group.swimmerId);
                return (
                  <div key={group.swimmerName} className="bg-white rounded-xl border overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold">
                          {group.swimmerName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{group.swimmerName}</div>
                          <div className="text-sm text-slate-500">
                            {group.swimmer?.group_name} • {group.entries.length} events
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {conf && <ConfirmationBadge status={conf.status} />}
                        {conf?.status === 'change_requested' && (
                          <button
                            onClick={() => setSelectedConfirmation(conf)}
                            className="text-sm px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            View Details
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedSwimmer(group.swimmer)}
                          className="text-sm text-blue-600 hover:underline"
                        >
                          Edit Events
                        </button>
                      </div>
                    </div>
                    <div className="divide-y">
                      {group.entries.map(entry => {
                        const isScratched = conf?.scratch_requests?.includes(entry.id);
                        return (
                          <div key={entry.id} className={`p-3 flex items-center justify-between ${isScratched ? 'bg-red-50' : ''}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                isScratched ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                              }`}>
                                {entry.event_number || '#'}
                              </div>
                              <div>
                                <div className={`font-medium ${isScratched ? 'text-red-600 line-through' : 'text-slate-700'}`}>
                                  {entry.event_name}
                                </div>
                                {entry.heat_number && (
                                  <div className="text-xs text-slate-500">
                                    Heat {entry.heat_number}, Lane {entry.lane_number}
                                  </div>
                                )}
                              </div>
                              {isScratched && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">
                                  Scratch Requested
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-slate-800">{entry.seed_time_display || 'NT'}</div>
                              {entry.estimated_start_time && (
                                <div className="text-xs text-slate-500">
                                  ~{formatTime(entry.estimated_start_time)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* SD3 Upload Modal */}
      {showSD3Upload && (
        <SD3UploadModal
          meet={meet}
          onClose={() => setShowSD3Upload(false)}
          onSuccess={(count) => {
            alert(`Successfully imported ${count} entries!`);
            setShowSD3Upload(false);
            loadData();
            onRefresh();
          }}
        />
      )}

      {/* Add Entry Modal - Select swimmer */}
      {showAddEntry && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Add Entries</h3>
              <button onClick={() => setShowAddEntry(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            
            {swimmers.length === 0 ? (
              <p className="text-slate-500 py-4">No committed swimmers yet. Swimmers must commit to the meet first.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-600">Select a swimmer to add events:</p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {swimmers.map(s => (
                    <button
                      key={s.swimmer_id}
                      onClick={() => {
                        setSelectedSwimmer({ 
                          id: s.swimmer_id, 
                          name: s.swimmer_name, 
                          group_name: s.group_name,
                          age: s.swimmer_age,
                          gender: s.swimmer_gender,
                          usa_swimming_id: s.swimmer_usa_id
                        });
                        setShowAddEntry(false);
                      }}
                      className="w-full p-3 text-left bg-slate-50 rounded-lg hover:bg-slate-100 flex justify-between items-center"
                    >
                      <span className="font-medium">{s.swimmer_name}</span>
                      <span className="text-sm text-slate-500">{s.group_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-4 pt-4 border-t">
              <button onClick={() => setShowAddEntry(false)} className="w-full py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Swimmer Event Selection Modal */}
      {selectedSwimmer && (
        <SwimmerEntryModal 
          meet={meet}
          swimmer={selectedSwimmer}
          meetEvents={meetEvents}
          existingEntries={entries.filter(e => e.swimmer_id === selectedSwimmer.id)}
          onClose={() => setSelectedSwimmer(null)}
          onSave={() => {
            setSelectedSwimmer(null);
            loadData();
            onRefresh();
          }}
        />
      )}

      {/* Auto-Generate Events Modal */}
      {showAutoGenerate && (
        <AutoGenerateEventsModal
          meet={meet}
          committedSwimmers={swimmers.map(s => ({
            id: s.swimmer_id,
            name: s.swimmer_name,
            age: s.swimmer_age,
            gender: s.swimmer_gender,
            group_name: s.group_name,
            usa_swimming_id: s.swimmer_usa_id
          }))}
          onClose={() => setShowAutoGenerate(false)}
          onSuccess={(message) => {
            alert(message);
            setShowAutoGenerate(false);
            loadData();
            onRefresh();
          }}
        />
      )}
    </div>
  );
};

// ============================================
// SWIMMER ENTRY MODAL - Select events for a swimmer
// ============================================

const SwimmerEntryModal = ({ meet, swimmer, meetEvents, existingEntries, onClose, onSave }) => {
  const [selectedEvents, setSelectedEvents] = useState(new Set(existingEntries.map(e => e.meet_event_id)));
  const [eventHistory, setEventHistory] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadEventHistory();
  }, [swimmer.id]);

  const loadEventHistory = async () => {
    setLoading(true);
    try {
      // Load historical times for events this swimmer might enter
      const history = {};
      
      // Map stroke names to what appears in results
      const strokeSearchTerms = {
        'Freestyle': 'Free',
        'Backstroke': 'Back',
        'Breaststroke': 'Breast',
        'Butterfly': 'Fly',
        'IM': 'IM',
        'Individual Medley': 'IM',
        'Free Relay': 'Free Relay',
        'Medley Relay': 'Medley Relay'
      };
      
      for (const evt of meetEvents) {
        const strokeTerm = strokeSearchTerms[evt.stroke] || evt.stroke;
        
        // Results event format: "Female (10 & Under) 100 Free (Prelim)"
        // Search for distance and stroke term
        const { data, error } = await supabase
          .from('results')
          .select('time, date, video_url')
          .eq('swimmer_id', swimmer.id)
          .ilike('event', `%${evt.distance}%${strokeTerm}%`)
          .order('date', { ascending: false })
          .limit(10);  // Get more results so we can find the best
        
        if (error) {
          console.error('Error fetching results for event:', evt.event_name, error);
          continue;
        }
        
        if (data?.length > 0) {
          // Map 'time' field and calculate seconds
          const mappedResults = data.map(r => ({
            time_display: r.time,
            time_seconds: parseTimeToSeconds(r.time),
            date: r.date,
            video_url: r.video_url
          })).filter(r => r.time_seconds !== null);
          
          // Sort by time_seconds (fastest first) to get best time
          mappedResults.sort((a, b) => a.time_seconds - b.time_seconds);
          
          // Take top 3 fastest times
          history[evt.id] = mappedResults.slice(0, 3);
          
          console.log(`Found ${data.length} results for ${evt.distance} ${evt.stroke}, best: ${mappedResults[0]?.time_display}`);
        }
      }
      setEventHistory(history);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to parse time string like "1:37.87Y" to seconds
  const parseTimeToSeconds = (timeStr) => {
    if (!timeStr) return null;
    // Remove course indicator (Y, L, S)
    const cleaned = timeStr.replace(/[YLS]$/i, '').trim();
    const parts = cleaned.split(':');
    if (parts.length === 2) {
      // MM:SS.ss format
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    } else if (parts.length === 1) {
      // SS.ss format
      return parseFloat(parts[0]);
    }
    return null;
  };

  const toggleEvent = (eventId) => {
    setSelectedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get existing entry IDs for this swimmer
      const existingIds = new Set(existingEntries.map(e => e.meet_event_id));
      
      // Events to add
      const toAdd = [...selectedEvents].filter(id => !existingIds.has(id));
      // Events to remove  
      const toRemove = [...existingIds].filter(id => !selectedEvents.has(id));

      console.log('Saving entries:', { toAdd, toRemove, selectedEvents: [...selectedEvents] });

      // Add new entries
      for (const eventId of toAdd) {
        const evt = meetEvents.find(e => e.id === eventId);
        if (!evt) {
          console.log('Event not found:', eventId);
          continue;
        }

        // Get best time from history if available
        const history = eventHistory[eventId];
        const seedTimeDisplay = history?.[0]?.time_display || null;
        const seedTimeSeconds = history?.[0]?.time_seconds || null;

        // Generate event code like "50FR", "100BK", "200IM"
        const strokeCodes = {
          'Freestyle': 'FR', 'Free': 'FR',
          'Backstroke': 'BK', 'Back': 'BK',
          'Breaststroke': 'BR', 'Breast': 'BR',
          'Butterfly': 'FL', 'Fly': 'FL',
          'IM': 'IM', 'Individual Medley': 'IM',
          'Medley Relay': 'MR', 'Free Relay': 'FR-R'
        };
        const strokeCode = strokeCodes[evt.stroke] || evt.stroke?.substring(0, 2).toUpperCase() || 'UN';
        const eventCode = `${evt.distance}${strokeCode}`;

        const entryData = {
          meet_id: meet.id,
          swimmer_id: swimmer.id,
          swimmer_name: swimmer.name,
          usa_swimming_id: swimmer.usa_swimming_id || null,
          meet_event_id: eventId,
          event_number: evt.event_number,
          event_name: evt.event_name || `${evt.gender || ''} ${evt.age_group || ''} ${evt.distance} ${evt.stroke}`.trim(),
          event_code: eventCode,
          seed_time_display: seedTimeDisplay,
          seed_time_seconds: seedTimeSeconds,
          session_number: evt.session_number || null
        };
        
        console.log('Inserting entry:', entryData);
        
        const { error } = await supabase.from('meet_entries').insert(entryData);
        if (error) {
          console.error('Error inserting entry:', error);
          throw error;
        }
      }

      // Remove deselected entries
      for (const eventId of toRemove) {
        const { error } = await supabase
          .from('meet_entries')
          .delete()
          .eq('meet_id', meet.id)
          .eq('swimmer_id', swimmer.id)
          .eq('meet_event_id', eventId);
        
        if (error) {
          console.error('Error deleting entry:', error);
        }
      }

      onSave();
    } catch (error) {
      console.error('Error saving entries:', error);
      alert('Error saving: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Helper to determine swimmer's age group based on age
  const getSwimmerAgeGroups = (age) => {
    if (!age) return null;
    const ageGroups = [];
    
    // Determine which age groups this swimmer can compete in
    if (age <= 6) ageGroups.push('6 & Under');
    if (age <= 8) ageGroups.push('8 & Under');
    if (age <= 9) ageGroups.push('9 & Under');
    if (age <= 10) ageGroups.push('10 & Under');
    if (age >= 9 && age <= 10) ageGroups.push('9-10');
    if (age >= 11 && age <= 12) ageGroups.push('11-12');
    if (age >= 13 && age <= 14) ageGroups.push('13-14');
    if (age >= 15 && age <= 18) ageGroups.push('15-18');
    if (age >= 13) ageGroups.push('13 & Over');
    if (age >= 15) ageGroups.push('15 & Over');
    if (age <= 12) ageGroups.push('12 & Under');
    ageGroups.push('Open'); // Open is always eligible
    
    return ageGroups;
  };

  // Map swimmer gender to event gender
  const getEventGender = (swimmerGender) => {
    if (!swimmerGender) return null;
    const g = swimmerGender.toLowerCase();
    if (g === 'male' || g === 'm' || g === 'boy' || g === 'boys') return 'Boys';
    if (g === 'female' || g === 'f' || g === 'girl' || g === 'girls') return 'Girls';
    return null;
  };

  // Filter events by swimmer's gender/age
  const eligibleEvents = useMemo(() => {
    const swimmerAgeGroups = getSwimmerAgeGroups(swimmer.age);
    const swimmerEventGender = getEventGender(swimmer.gender);
    
    console.log('Filtering events for:', { 
      swimmerAge: swimmer.age, 
      swimmerGender: swimmer.gender,
      swimmerAgeGroups, 
      swimmerEventGender 
    });
    
    return meetEvents.filter(evt => {
      // Skip relays for individual entry
      if (evt.is_relay) return false;
      
      // Filter by gender if swimmer has gender set
      if (swimmerEventGender && evt.gender) {
        if (evt.gender !== swimmerEventGender && evt.gender !== 'Mixed') {
          return false;
        }
      }
      
      // Filter by age group if swimmer has age set
      if (swimmerAgeGroups && evt.age_group) {
        if (!swimmerAgeGroups.includes(evt.age_group)) {
          return false;
        }
      }
      
      return true;
    });
  }, [meetEvents, swimmer]);

  // Group events by session/day
  const eventsByDay = useMemo(() => {
    // Calculate meet duration in days
    const startDate = meet.start_date ? new Date(meet.start_date) : null;
    const endDate = meet.end_date ? new Date(meet.end_date) : startDate;
    
    let numDays = 1;
    if (startDate && endDate) {
      numDays = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1);
    }
    
    // Get all event numbers sorted
    const sortedEvents = [...eligibleEvents].sort((a, b) => a.event_number - b.event_number);
    const maxEventNum = sortedEvents.length > 0 ? Math.max(...sortedEvents.map(e => e.event_number)) : 0;
    
    // Create day boundaries based on event number ranges
    // Typically events are distributed roughly evenly across days
    const eventsPerDay = Math.ceil(maxEventNum / numDays);
    
    const groups = {};
    
    eligibleEvents.forEach(evt => {
      let dayKey, dayName;
      
      // First check if event has explicit session info
      if (evt.session_date) {
        dayKey = evt.session_date;
        const [year, month, day] = evt.session_date.split('T')[0].split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      } else if (evt.session_name && evt.session_name !== 'Session 0' && evt.session_name !== 'Session TBD') {
        dayKey = evt.session_name;
        dayName = evt.session_name;
      } else {
        // Infer day from event number
        const dayIndex = Math.min(Math.floor((evt.event_number - 1) / eventsPerDay), numDays - 1);
        
        if (startDate) {
          const dayDate = new Date(startDate);
          dayDate.setDate(dayDate.getDate() + dayIndex);
          dayKey = dayDate.toISOString().split('T')[0];
          dayName = dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
        } else {
          dayKey = `day-${dayIndex + 1}`;
          dayName = `Day ${dayIndex + 1}`;
        }
      }
      
      if (!groups[dayKey]) {
        groups[dayKey] = {
          key: dayKey,
          name: dayName,
          events: []
        };
      }
      groups[dayKey].events.push(evt);
    });
    
    // Sort events within each day by event number
    Object.values(groups).forEach(g => {
      g.events.sort((a, b) => a.event_number - b.event_number);
    });
    
    // Sort days by key (date or day number)
    return Object.values(groups).sort((a, b) => a.key.localeCompare(b.key));
  }, [eligibleEvents, meet.start_date, meet.end_date]);

  // Calculate per-day selection counts
  const perDaySelections = useMemo(() => {
    const counts = {};
    eventsByDay.forEach(day => {
      counts[day.key] = day.events.filter(evt => selectedEvents.has(evt.id)).length;
    });
    return counts;
  }, [eventsByDay, selectedEvents]);

  const totalSelected = selectedEvents.size;
  const eventsPerDay = meet.events_per_day_limit || 3;
  
  // Check if any day exceeds limit
  const daysOverLimit = Object.entries(perDaySelections).filter(([_, count]) => count > eventsPerDay);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold">{swimmer.name}</h3>
            <p className="text-sm text-slate-500">
              {swimmer.age ? `${swimmer.age} year old` : ''} 
              {swimmer.gender ? ` ${swimmer.gender}` : ''} 
              {swimmer.group_name ? ` • ${swimmer.group_name}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Per-day warning */}
        {daysOverLimit.length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700 flex items-center gap-2">
            <AlertCircle size={16} />
            <div>
              <strong>Event limit exceeded:</strong>
              {daysOverLimit.map(([day, count]) => (
                <span key={day} className="ml-2">{day}: {count}/{eventsPerDay}</span>
              ))}
            </div>
          </div>
        )}

        {/* Events List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
          ) : eligibleEvents.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
              <p>No eligible events found</p>
              <p className="text-sm">No events match this swimmer's age ({swimmer.age}) and gender ({swimmer.gender})</p>
            </div>
          ) : (
            <div className="space-y-6">
              {eventsByDay.map((day) => {
                const dayCount = perDaySelections[day.key] || 0;
                const isOverLimit = dayCount > eventsPerDay;
                
                return (
                  <div key={day.key}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-sm font-medium text-slate-700">{day.name}</div>
                      <div className={`text-sm ${isOverLimit ? 'text-amber-600 font-medium' : 'text-slate-500'}`}>
                        {dayCount}/{eventsPerDay} events
                      </div>
                    </div>
                    <div className="space-y-2">
                      {day.events.map(evt => {
                        const isSelected = selectedEvents.has(evt.id);
                        const history = eventHistory[evt.id] || [];
                        const bestTime = history[0]?.time_display;
                        
                        return (
                          <div
                            key={evt.id}
                            onClick={() => toggleEvent(evt.id)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-blue-50 border-blue-300' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                  isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300'
                                }`}>
                                  {isSelected && <Check size={14} className="text-white" />}
                                </div>
                                <div>
                                  <div className="font-medium text-slate-800">
                                    #{evt.event_number} {evt.distance} {evt.stroke}
                                  </div>
                                  <div className="text-xs text-slate-500">{evt.age_group}</div>
                                </div>
                              </div>
                              {bestTime && (
                                <div className="text-right">
                                  <div className="font-mono text-sm text-slate-700">{bestTime}</div>
                                  <div className="text-xs text-slate-400">best</div>
                                </div>
                              )}
                            </div>
                            
                            {/* Show history when selected */}
                            {isSelected && history.length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <div className="text-xs text-slate-500 mb-1">Recent times:</div>
                                <div className="flex flex-wrap gap-2">
                                  {history.map((h, i) => (
                                    <div key={i} className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded">
                                      <span className="font-mono">{h.time_display}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex justify-between items-center">
          <div className="text-sm text-slate-600">
            {totalSelected} event{totalSelected !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              Save Entries
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// TIMELINE TAB
// ============================================

const TimelineTab = ({ meet, onRefresh }) => {
  const [sessions, setSessions] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadTimeline();
  }, [meet.id]);

  const loadTimeline = async () => {
    setLoading(true);
    try {
      const { data: sessionsData } = await supabase
        .from('meet_sessions')
        .select('*')
        .eq('meet_id', meet.id)
        .order('session_number');
      
      const { data: eventsData } = await supabase
        .from('meet_events')
        .select('*')
        .eq('meet_id', meet.id)
        .order('session_number, event_number');
      
      // Debug: Log a sample event to see the timestamp format
      if (eventsData && eventsData.length > 0 && eventsData[0].estimated_start_time) {
        console.log('Sample event timestamp:', eventsData[0].estimated_start_time, typeof eventsData[0].estimated_start_time);
      }
      
      setSessions(sessionsData || []);
      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert 12-hour time to 24-hour format for PostgreSQL
  const convertTo24Hour = (time12h) => {
    if (!time12h) return null;
    
    const match = time12h.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return time12h; // Return as-is if format doesn't match
    
    let [, hours, minutes, period] = match;
    hours = parseInt(hours);
    
    if (period.toUpperCase() === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period.toUpperCase() === 'AM' && hours === 12) {
      hours = 0;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
  };

  const handleTimelineUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const parsed = await parseTimelinePDF(file);
      
      console.log('Parsed timeline:', parsed);
      
      // Calculate actual session dates based on meet start date and day of meet
      const meetStartDate = meet.start_date ? new Date(meet.start_date) : null;
      
      // Insert/update sessions
      if (parsed.sessions?.length > 0) {
        for (const session of parsed.sessions) {
          // Calculate session date from day of meet
          let sessionDate = meet.start_date;
          if (meetStartDate && session.dayOfMeet) {
            const date = new Date(meetStartDate);
            date.setDate(date.getDate() + session.dayOfMeet - 1);
            sessionDate = date.toISOString().split('T')[0];
          }
          
          const sessionData = {
            meet_id: meet.id,
            session_number: session.sessionNumber,
            session_name: session.name,
            session_date: sessionDate,
            start_time: convertTo24Hour(session.startTime),
            heat_interval_seconds: session.heatInterval || 30,
            session_type: session.name?.toLowerCase().includes('final') ? 'finals' : 'prelims'
          };
          
          console.log('Upserting session:', sessionData);
          
          const { error } = await supabase.from('meet_sessions').upsert(sessionData, { 
            onConflict: 'meet_id,session_number' 
          });
          
          if (error) {
            console.error('Error upserting session:', error);
          }
        }
      }
      
      // Get all sessions to map session numbers to dates (needed for both events and entries)
      // Also identify which sessions are prelims
      const { data: sessionsData } = await supabase
        .from('meet_sessions')
        .select('session_number, session_date, session_name')
        .eq('meet_id', meet.id);
      
      const sessionDateMap = {};
      const prelimsSessionNumbers = new Set();
      (sessionsData || []).forEach(s => {
        sessionDateMap[s.session_number] = s.session_date;
        // Track prelims sessions
        if (s.session_name?.toLowerCase().includes('prelim')) {
          prelimsSessionNumbers.add(s.session_number);
        }
      });
      
      // Filter to only prelims events (skip finals)
      const prelimsEvents = parsed.events?.filter(evt => 
        prelimsSessionNumbers.has(evt.sessionNumber)
      ) || [];
      
      console.log(`Processing ${prelimsEvents.length} prelims events (skipping ${(parsed.events?.length || 0) - prelimsEvents.length} finals events)`);
      
      // Update meet_events with timeline data
      let eventsUpdated = 0;
      if (prelimsEvents.length > 0) {
        for (const evt of prelimsEvents) {
          const time24h = convertTo24Hour(evt.estimatedStartTime);
          const sessionDate = sessionDateMap[evt.sessionNumber] || meet.start_date;
          
          // Create full timestamp by combining session date with time
          const timestamp = sessionDate && time24h ? `${sessionDate} ${time24h}` : null;
          
          console.log(`Updating event ${evt.eventNumber}: ${evt.eventName} at ${evt.estimatedStartTime} (${timestamp})`);
          const { error, data } = await supabase.from('meet_events')
            .update({
              entry_count: evt.entryCount,
              heat_count: evt.heatCount,
              estimated_start_time: timestamp,
              session_number: evt.sessionNumber
            })
            .eq('meet_id', meet.id)
            .eq('event_number', evt.eventNumber)
            .select();
          
          if (error) {
            console.error(`Error updating event ${evt.eventNumber}:`, error);
          } else if (data?.length > 0) {
            eventsUpdated++;
            console.log(`✓ Updated event ${evt.eventNumber}`);
          } else {
            console.warn(`⚠ No matching event found for event number ${evt.eventNumber}`);
          }
        }
      }
      
      // Update meet_entries with estimated start times and session numbers from events
      // Only process prelims events
      let entriesUpdated = 0;
      for (const evt of prelimsEvents) {
        if (evt.estimatedStartTime) {
          const time24h = convertTo24Hour(evt.estimatedStartTime);
          const sessionDate = sessionDateMap[evt.sessionNumber] || meet.start_date;
          const timestamp = sessionDate && time24h ? `${sessionDate} ${time24h}` : null;
          
          const { data } = await supabase.from('meet_entries')
            .update({ 
              estimated_start_time: timestamp,
              session_number: evt.sessionNumber
            })
            .eq('meet_id', meet.id)
            .eq('event_number', evt.eventNumber)
            .select();
          
          if (data?.length > 0) {
            entriesUpdated += data.length;
          }
        }
      }
      
      // Update meet with timeline PDF URL
      await supabase.from('meets').update({ 
        timeline_pdf_url: 'uploaded'
      }).eq('id', meet.id);
      
      const prelimsSessions = parsed.sessions?.filter(s => s.name?.toLowerCase().includes('prelim')) || [];
      const totalEvents = parsed.events?.length || 0;
      alert(`Timeline uploaded!\n• ${prelimsSessions.length} prelims sessions\n• ${eventsUpdated} events updated with start times\n• ${entriesUpdated} entries updated\n• Skipped ${totalEvents - prelimsEvents.length} finals events`);
      loadTimeline();
      onRefresh();
    } catch (error) {
      console.error('Timeline parsing error:', error);
      alert('Error parsing timeline: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Group events by session
  const eventsBySession = useMemo(() => {
    const grouped = {};
    events.forEach(evt => {
      const key = evt.session_number || 0;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(evt);
    });
    return grouped;
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-amber-800 font-medium">
              <Clock size={20} />
              Timeline / Session Report
            </div>
            <p className="text-sm text-amber-600 mt-1">
              Upload the Hy-Tek timeline PDF to add estimated start times
            </p>
          </div>
          <label className={`flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg cursor-pointer hover:bg-amber-700 ${uploading ? 'opacity-50' : ''}`}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Processing...' : 'Upload Timeline'}
            <input type="file" accept=".pdf" onChange={handleTimelineUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
        {meet.timeline_pdf_url && (
          <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
            <Check size={14} />
            Timeline uploaded
          </div>
        )}
      </div>

      {/* Sessions & Events */}
      {sessions.length === 0 && events.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Clock size={48} className="mx-auto mb-4 opacity-50" />
          <p>No timeline data yet</p>
          <p className="text-sm">Upload a timeline PDF or events will be added from meet info</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sessions.map(session => (
            <div key={session.id} className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 bg-slate-800 text-white">
                <div className="font-semibold">{session.session_name}</div>
                <div className="text-sm text-slate-300 flex gap-4 mt-1">
                  {session.warmup_time && <span>Warmup: {formatTime(session.warmup_time)}</span>}
                  {session.start_time && <span>Start: {formatTime(session.start_time)}</span>}
                </div>
              </div>
              <div className="divide-y">
                {(eventsBySession[session.session_number] || []).map(evt => (
                  <div key={evt.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                        {evt.event_number}
                      </div>
                      <div>
                        <div className="font-medium text-slate-700">{evt.event_name}</div>
                        <div className="text-sm text-slate-500">
                          {evt.entry_count && `${evt.entry_count} entries`}
                          {evt.heat_count && ` • ${evt.heat_count} heats`}
                        </div>
                      </div>
                    </div>
                    {evt.estimated_start_time && (
                      <div className="text-right">
                        <div className="font-mono text-slate-800">{formatTime(evt.estimated_start_time)}</div>
                        <div className="text-xs text-slate-500">Est. Start</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Events without session */}
          {eventsBySession[0]?.length > 0 && (
            <div className="bg-white rounded-xl border overflow-hidden">
              <div className="p-4 bg-slate-100 font-semibold text-slate-700">Other Events</div>
              <div className="divide-y">
                {eventsBySession[0].map(evt => (
                  <div key={evt.id} className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-lg flex items-center justify-center font-bold">
                      {evt.event_number}
                    </div>
                    <div className="font-medium text-slate-700">{evt.event_name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// HEAT SHEET TAB
// ============================================

const HeatSheetTab = ({ meet, onRefresh }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState(null);

  useEffect(() => {
    loadEntries();
  }, [meet.id]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('meet_entries')
        .select(`*, swimmers(name)`)
        .eq('meet_id', meet.id)
        .not('heat_number', 'is', null)
        .order('event_name, heat_number, lane_number');
      
      setEntries(data || []);
    } catch (error) {
      console.error('Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHeatSheetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const parsed = await parseHeatSheetPDF(file);
      
      console.log('Parsed heat sheet:', parsed);
      console.log(`Found ${parsed.entries.length} total entries in heat sheet`);
      
      // Get team code from meet or default to HNVR (could be made configurable)
      const teamCode = meet.team_code || 'HNVR';
      
      // Get existing meet entries to match against
      const { data: existingEntries } = await supabase
        .from('meet_entries')
        .select('id, swimmer_id, swimmer_name, event_number, event_name')
        .eq('meet_id', meet.id);
      
      console.log(`Found ${existingEntries?.length || 0} existing entries in database for this meet`);
      
      // Debug: Log what swimmers and events we're looking to match
      if (existingEntries && existingEntries.length > 0) {
        const swimmerEventPairs = existingEntries.map(e => 
          `${e.swimmer_name} - Event ${e.event_number}: ${e.event_name}`
        );
        console.log('=== ENTRIES TO MATCH ===');
        swimmerEventPairs.forEach(pair => console.log(`  ${pair}`));
        console.log('========================');
      }
      
      // Filter to our team's entries
      const ourTeamHeatEntries = parsed.entries.filter(e => 
        !teamCode || e.teamCode.toUpperCase().startsWith(teamCode.toUpperCase())
      );
      
      console.log(`=== HEAT SHEET ENTRIES FOR ${teamCode} ===`);
      ourTeamHeatEntries.forEach(e => 
        console.log(`  ${e.swimmerName} - Event ${e.eventNumber}, Heat ${e.heat}, Lane ${e.lane}`)
      );
      console.log('========================================');
      
      // Match heat sheet entries to existing database entries
      let updatedCount = 0;
      let matchedCount = 0;
      let notFound = [];
      
      for (const heatEntry of ourTeamHeatEntries) {
        // This is one of our team's entries
        matchedCount++;
        
        // Try to find matching entry in database by event number and swimmer name
        const dbEntry = existingEntries?.find(e => {
          if (e.event_number !== heatEntry.eventNumber) return false;
          
          // Parse heat sheet name: "Goodwillie, James G" -> last="goodwillie", first="james"
          const heatName = heatEntry.swimmerName.toLowerCase();
          const heatParts = heatName.split(',').map(p => p.trim());
          const heatLast = heatParts[0] || '';
          const heatFirst = heatParts[1]?.split(/\s+/)[0] || '';
          
          // Parse database name: "James G Goodwillie"
          const dbName = e.swimmer_name.toLowerCase();
          
          // Check if both first and last names are in the database name
          return dbName.includes(heatLast) && dbName.includes(heatFirst);
        });
        
        if (dbEntry) {
          console.log(`✓ Match found: ${heatEntry.swimmerName} (Event ${heatEntry.eventNumber}, Heat ${heatEntry.heat}, Lane ${heatEntry.lane})`);
          
          const { error, data } = await supabase
            .from('meet_entries')
            .update({
              heat_number: heatEntry.heat,
              lane_number: heatEntry.lane,
              heat_seed_time: heatEntry.seedTime
            })
            .eq('id', dbEntry.id)
            .select();
          
          if (error) {
            console.error('Error updating entry:', error);
          } else if (data?.length > 0) {
            updatedCount++;
            console.log(`  ✓ Updated: ${dbEntry.swimmer_name} - ${dbEntry.event_name}`);
          }
        } else {
          // Debug: Show what we were looking for
          const heatParts = heatEntry.swimmerName.toLowerCase().split(',').map(p => p.trim());
          const heatLast = heatParts[0] || '';
          const heatFirst = heatParts[1]?.split(/\s+/)[0] || '';
          console.log(`⚠ No match: ${heatEntry.swimmerName} (Event ${heatEntry.eventNumber}) - looking for "${heatFirst}" and "${heatLast}" in event ${heatEntry.eventNumber}`);
          notFound.push(`${heatEntry.swimmerName} - Event ${heatEntry.eventNumber}`);
        }
      }
      
      // Update meet record
      await supabase.from('meets').update({
        heat_sheet_pdf_url: 'uploaded'
      }).eq('id', meet.id);
      
      if (notFound.length > 0 && notFound.length <= 10) {
        console.log(`Entries in heat sheet but not matched:`, notFound);
      }
      
      alert(`Heat sheet processed!\n• ${parsed.entries.length} total entries in PDF\n• ${matchedCount} entries for ${teamCode}\n• ${updatedCount} entries updated with heat/lane\n• ${notFound.length} entries not matched`);
      loadEntries();
      onRefresh();
    } catch (error) {
      console.error('Heat sheet parsing error:', error);
      alert('Error parsing heat sheet: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Group entries by event
  const entriesByEvent = useMemo(() => {
    const grouped = {};
    entries.forEach(entry => {
      const key = entry.event_name;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(entry);
    });
    return grouped;
  }, [entries]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-violet-800 font-medium">
              <FileText size={20} />
              Heat Sheet / Meet Program
            </div>
            <p className="text-sm text-violet-600 mt-1">
              Upload the psych sheet or heat sheet to add heat/lane assignments
            </p>
          </div>
          <label className={`flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg cursor-pointer hover:bg-violet-700 ${uploading ? 'opacity-50' : ''}`}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? 'Processing...' : 'Upload Heat Sheet'}
            <input type="file" accept=".pdf" onChange={handleHeatSheetUpload} className="hidden" disabled={uploading} />
          </label>
        </div>
        {meet.heat_sheet_pdf_url && (
          <div className="mt-2 text-sm text-green-600 flex items-center gap-1">
            <Check size={14} />
            Heat sheet uploaded
          </div>
        )}
      </div>

      {/* Parse Result */}
      {parseResult && (
        <div className="bg-white border rounded-xl p-4">
          <h4 className="font-medium mb-2">Parse Results</h4>
          <div className="text-sm text-slate-600">
            Found {parseResult.totalEntries} entries, matched {parseResult.matchedEntries} to our swimmers
          </div>
        </div>
      )}

      {/* Entries with Heat/Lane */}
      {Object.keys(entriesByEvent).length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>No heat/lane assignments yet</p>
          <p className="text-sm">Upload a heat sheet to add heat and lane information</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(entriesByEvent).map(([eventName, eventEntries]) => (
            <div key={eventName} className="bg-white rounded-xl border overflow-hidden">
              <div className="p-3 bg-slate-50 border-b font-medium text-slate-700">
                {eventName}
              </div>
              <div className="divide-y">
                {eventEntries.map(entry => (
                  <div key={entry.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-center w-16">
                        <div className="text-xs text-slate-500">Heat {entry.heat_number}</div>
                        <div className="font-bold text-lg text-blue-600">Lane {entry.lane_number}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">
                          {entry.swimmers?.name || entry.swimmer_name}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono text-slate-600">
                      {entry.heat_seed_time || entry.seed_time_display || 'NT'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// MEET DETAIL VIEW
// ============================================

const MeetDetailView = ({ meet, onBack, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [meetData, setMeetData] = useState(meet);
  const [stats, setStats] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadStats();
  }, [meet.id]);

  const loadStats = async () => {
    try {
      const { data } = await supabase.rpc('get_meet_commitment_stats', { meet_uuid: meet.id });
      if (data?.[0]) setStats(data[0]);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleRefresh = async () => {
    // Reload meet data
    const { data } = await supabase
      .from('meets')
      .select('*')
      .eq('id', meet.id)
      .single();
    if (data) {
      setMeetData(data);
      onUpdate(data);
    }
    loadStats();
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('meets')
        .update({ status: newStatus })
        .eq('id', meet.id);
      if (error) throw error;
      handleRefresh();
    } catch (error) {
      alert('Error updating status: ' + error.message);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'events', label: 'Events', icon: List },
    { id: 'commitments', label: 'Commitments', icon: Users },
    { id: 'entries', label: 'Entries', icon: FileText },
    { id: 'timeline', label: 'Timeline', icon: Clock },
    { id: 'heatsheet', label: 'Heat Sheet', icon: Award }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl">
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{meetData.name}</h1>
            <StatusBadge status={meetData.status} />
          </div>
          <div className="flex items-center gap-4 text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatDate(meetData.start_date)}
              {meetData.end_date && meetData.end_date !== meetData.start_date && ` - ${formatDate(meetData.end_date)}`}
            </span>
            {meetData.location_name && (
              <span className="flex items-center gap-1">
                <MapPin size={14} />
                {meetData.location_name}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowEditModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
        >
          <Edit2 size={16} />
          Edit
        </button>
      </div>

      {/* Status Actions */}
      {meetData.status === 'draft' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-medium text-blue-800">Ready to open for commitments?</div>
            <p className="text-sm text-blue-600">Parents will be able to commit or decline their swimmers</p>
          </div>
          <button
            onClick={() => handleStatusChange('open')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Open for Commitments
          </button>
        </div>
      )}

      {meetData.status === 'open' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="font-medium text-amber-800">Accepting commitments</div>
            <p className="text-sm text-amber-600">
              {stats ? `${stats.committed_count} committed, ${stats.pending_count} pending` : 'Loading...'}
            </p>
          </div>
          <button
            onClick={() => handleStatusChange('closed')}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
          >
            Close Commitments
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-blue-600 text-blue-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 gap-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl border p-4 space-y-4">
              <h3 className="font-semibold text-slate-700">Quick Stats</h3>
              {stats ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{stats.committed_count}</div>
                    <div className="text-sm text-green-600">Committed</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600">{stats.pending_count}</div>
                    <div className="text-sm text-amber-600">Pending</div>
                  </div>
                </div>
              ) : (
                <div className="text-slate-400">Loading stats...</div>
              )}
            </div>

            {/* Meet Details */}
            <div className="bg-white rounded-xl border p-4 space-y-3">
              <h3 className="font-semibold text-slate-700">Meet Details</h3>
              <div className="space-y-2 text-sm">
                {meetData.sanction_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Sanction</span>
                    <span className="font-medium">{meetData.sanction_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Course</span>
                  <span className="font-medium">{meetData.course || 'SCY'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Format</span>
                  <span className="font-medium">{meetData.meet_type === 'prelims_finals' ? 'Prelims/Finals' : 'Timed Finals'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Events/Day Limit</span>
                  <span className="font-medium">{meetData.events_per_day_limit || 3}</span>
                </div>
                {meetData.entry_deadline && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Entry Deadline</span>
                    <span className="font-medium">{formatDate(meetData.entry_deadline)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Fees */}
            {(meetData.entry_fee_individual || meetData.entry_fee_relay) && (
              <div className="bg-white rounded-xl border p-4 space-y-3">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <DollarSign size={16} />
                  Entry Fees
                </h3>
                <div className="space-y-2 text-sm">
                  {meetData.entry_fee_individual && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Individual Event</span>
                      <span className="font-medium">${meetData.entry_fee_individual}</span>
                    </div>
                  )}
                  {meetData.entry_fee_relay && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Relay</span>
                      <span className="font-medium">${meetData.entry_fee_relay}</span>
                    </div>
                  )}
                  {meetData.entry_fee_surcharge && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Surcharge</span>
                      <span className="font-medium">${meetData.entry_fee_surcharge}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Location */}
            {meetData.location_name && (
              <div className="bg-white rounded-xl border p-4 space-y-3">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <MapPin size={16} />
                  Location
                </h3>
                <div>
                  <div className="font-medium">{meetData.location_name}</div>
                  {meetData.location_address && (
                    <div className="text-sm text-slate-500">{meetData.location_address}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'events' && (
          <EventsTab meet={meetData} onRefresh={handleRefresh} />
        )}

        {activeTab === 'commitments' && (
          <CommitmentsTab meet={meetData} onRefresh={handleRefresh} />
        )}

        {activeTab === 'entries' && (
          <EntriesTab meet={meetData} onRefresh={handleRefresh} />
        )}

        {activeTab === 'timeline' && (
          <TimelineTab meet={meetData} onRefresh={handleRefresh} />
        )}

        {activeTab === 'heatsheet' && (
          <HeatSheetTab meet={meetData} onRefresh={handleRefresh} />
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <MeetFormModal
          meet={meetData}
          onSave={() => {
            setShowEditModal(false);
            handleRefresh();
          }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

// ============================================
// MAIN MEETS MANAGER COMPONENT
// ============================================

export default function MeetsManager() {
  const [meets, setMeets] = useState([]);
  const [meetStats, setMeetStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [selectedMeet, setSelectedMeet] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadMeets();
  }, []);

  const loadMeets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meets')
        .select('*')
        .order('start_date', { ascending: false });
      
      if (error) throw error;
      setMeets(data || []);
      
      // Load stats for each meet
      const stats = {};
      for (const meet of (data || [])) {
        const { data: statsData } = await supabase.rpc('get_meet_commitment_stats', { meet_uuid: meet.id });
        if (statsData?.[0]) stats[meet.id] = statsData[0];
      }
      setMeetStats(stats);
    } catch (error) {
      console.error('Error loading meets:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredMeets = useMemo(() => {
    const now = new Date();
    switch (filter) {
      case 'upcoming':
        return meets.filter(m => new Date(m.end_date || m.start_date) >= now);
      case 'past':
        return meets.filter(m => new Date(m.end_date || m.start_date) < now);
      default:
        return meets;
    }
  }, [meets, filter]);

  // Detail view
  if (selectedMeet) {
    return (
      <MeetDetailView
        meet={selectedMeet}
        onBack={() => {
          setSelectedMeet(null);
          loadMeets();
        }}
        onUpdate={(updated) => {
          setSelectedMeet(updated);
          setMeets(meets.map(m => m.id === updated.id ? updated : m));
        }}
      />
    );
  }

  // List view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meets</h1>
          <p className="text-slate-500">Manage swim meets, entries, and commitments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
        >
          <Plus size={20} />
          Create Meet
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['upcoming', 'past', 'all'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f 
                ? 'bg-slate-800 text-white' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Meets Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-blue-600" size={32} />
        </div>
      ) : filteredMeets.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto mb-4 text-slate-300" />
          <p className="text-slate-500">No meets found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-blue-600 hover:underline"
          >
            Create your first meet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMeets.map(meet => (
            <MeetCard
              key={meet.id}
              meet={meet}
              stats={meetStats[meet.id]}
              onClick={() => setSelectedMeet(meet)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <MeetFormModal
          onSave={() => {
            setShowCreateModal(false);
            loadMeets();
          }}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
