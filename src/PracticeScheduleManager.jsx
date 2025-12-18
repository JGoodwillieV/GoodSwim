// src/PracticeScheduleManager.jsx
// Grid-based practice schedule manager for coaches
// Allows setting recurring practice times for each training group

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import {
  Calendar, ChevronLeft, Plus, Edit2, Trash2, Save, X, Check,
  Loader2, Clock, MapPin, Users, AlertCircle, Copy, Settings,
  CalendarOff, CalendarPlus, Waves, Dumbbell, Sun, Moon,
  ChevronDown, ChevronUp, FileText, Download, Upload
} from 'lucide-react';
import { formatTimeOfDay } from './utils/dateUtils';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ACTIVITY_TYPES = [
  { value: 'swim', label: 'Swim', icon: Waves, color: 'blue' },
  { value: 'dryland', label: 'Dryland', icon: Dumbbell, color: 'amber' },
  { value: 'doubles_am', label: 'AM Swim', icon: Sun, color: 'orange' },
  { value: 'doubles_pm', label: 'PM Swim', icon: Moon, color: 'indigo' }
];

const GROUP_COLORS = [
  'blue', 'emerald', 'purple', 'amber', 'rose', 'cyan', 'orange', 'pink'
];

// Time Slot Editor Modal
function TimeSlotModal({ isOpen, onClose, onSave, slot, groupName, dayOfWeek }) {
  const [formData, setFormData] = useState({
    activity_type: 'swim',
    start_time: '',
    end_time: '',
    location_name: '',
    notes: ''
  });

  useEffect(() => {
    if (slot) {
      setFormData({
        activity_type: slot.activity_type || 'swim',
        start_time: slot.start_time || '',
        end_time: slot.end_time || '',
        location_name: slot.location_name || '',
        notes: slot.notes || ''
      });
    } else {
      setFormData({
        activity_type: 'swim',
        start_time: '',
        end_time: '',
        location_name: '',
        notes: ''
      });
    }
  }, [slot, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.start_time || !formData.end_time) return;
    onSave(formData);
  };

  const activityInfo = ACTIVITY_TYPES.find(a => a.value === formData.activity_type);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className={`bg-${activityInfo?.color || 'blue'}-50 px-6 py-4 border-b`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800">
                {slot ? 'Edit Time Slot' : 'Add Time Slot'}
              </h3>
              <p className="text-sm text-slate-600">
                {groupName} • {DAYS[dayOfWeek]}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Activity Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Activity Type</label>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_TYPES.map(type => {
                const Icon = type.icon;
                const isSelected = formData.activity_type === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, activity_type: type.value })}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={18} />
                    <span className="font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Time *</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Time *</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location (optional)</label>
            <input
              type="text"
              value={formData.location_name}
              onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
              placeholder="e.g., Main Pool, Gym"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g., Dryland built into practice"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Check size={18} />
              {slot ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Exception Modal (for holidays, schedule changes)
function ExceptionModal({ isOpen, onClose, onSave, groups }) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    groupName: '', // Empty = all groups
    exceptionType: 'canceled',
    reason: '',
    newStartTime: '',
    newEndTime: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        startDate: '',
        endDate: '',
        groupName: '',
        exceptionType: 'canceled',
        reason: '',
        newStartTime: '',
        newEndTime: ''
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.startDate || !formData.reason) return;
    
    setLoading(true);
    await onSave(formData);
    setLoading(false);
  };

  const presetReasons = [
    'Holiday Break',
    'Winter Break',
    'Spring Break',
    'Thanksgiving',
    'Christmas',
    'New Year',
    'Meet Weekend',
    'Pool Maintenance',
    'School Holiday',
    'Weather Closure'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CalendarOff size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Schedule Exception</h3>
                <p className="text-sm text-slate-600">Mark holidays, closures, or changes</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-amber-100 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Exception Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Exception Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, exceptionType: 'canceled' })}
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  formData.exceptionType === 'canceled'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CalendarOff size={20} className="mx-auto mb-1" />
                <span className="text-sm font-medium">Canceled</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, exceptionType: 'modified' })}
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  formData.exceptionType === 'modified'
                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Edit2 size={20} className="mx-auto mb-1" />
                <span className="text-sm font-medium">Modified</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, exceptionType: 'added' })}
                className={`p-3 rounded-xl border-2 transition-all text-center ${
                  formData.exceptionType === 'added'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CalendarPlus size={20} className="mx-auto mb-1" />
                <span className="text-sm font-medium">Added</span>
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                placeholder="Same as start"
              />
            </div>
          </div>

          {/* Group Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Applies To</label>
            <select
              value={formData.groupName}
              onChange={(e) => setFormData({ ...formData, groupName: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Groups</option>
              {groups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          {/* Modified Time (only if type is modified or added) */}
          {(formData.exceptionType === 'modified' || formData.exceptionType === 'added') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Start Time</label>
                <input
                  type="time"
                  value={formData.newStartTime}
                  onChange={(e) => setFormData({ ...formData, newStartTime: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New End Time</label>
                <input
                  type="time"
                  value={formData.newEndTime}
                  onChange={(e) => setFormData({ ...formData, newEndTime: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g., Winter Break"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              required
              list="preset-reasons"
            />
            <datalist id="preset-reasons">
              {presetReasons.map(reason => (
                <option key={reason} value={reason} />
              ))}
            </datalist>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            {presetReasons.slice(0, 5).map(reason => (
              <button
                key={reason}
                type="button"
                onClick={() => setFormData({ ...formData, reason })}
                className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm hover:bg-slate-200 transition"
              >
                {reason}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Save Exception
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Group Management Modal
function GroupModal({ isOpen, onClose, onSave, existingGroups }) {
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);

  // Preset groups based on the PDF
  const presetGroups = [
    'Tropical Storms',
    'CAT 1 Early',
    'CAT 1 Late',
    'CAT 2 Early',
    'CAT 2 Late',
    'CAT 3',
    'CAT 4 Orange',
    'CAT 4 Silver',
    'CAT 5 Orange',
    'CAT 5 Silver'
  ];

  const availablePresets = presetGroups.filter(g => !existingGroups.includes(g));

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setLoading(true);
    await onSave(groupName.trim());
    setLoading(false);
    setGroupName('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="bg-purple-50 px-6 py-4 border-b border-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Add Training Group</h3>
                <p className="text-sm text-slate-600">Create a new group for scheduling</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-purple-100 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Group Name *</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g., CAT 2 Early"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500"
              autoFocus
              required
            />
          </div>

          {availablePresets.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quick Add</label>
              <div className="flex flex-wrap gap-2">
                {availablePresets.slice(0, 6).map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setGroupName(preset)}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm hover:bg-purple-100 transition border border-purple-200"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !groupName.trim()}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
              Add Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Copy Day Modal - For copying a day's schedule to other days
function CopyDayModal({ isOpen, onClose, onCopy, sourceGroup, sourceDay, existingSlots }) {
  const [targetDays, setTargetDays] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTargetDays([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleDay = (dayIdx) => {
    if (dayIdx === sourceDay) return; // Can't copy to same day
    setTargetDays(prev => 
      prev.includes(dayIdx) 
        ? prev.filter(d => d !== dayIdx)
        : [...prev, dayIdx]
    );
  };

  const handleCopy = async () => {
    if (targetDays.length === 0) return;
    setLoading(true);
    await onCopy(sourceGroup, sourceDay, targetDays);
    setLoading(false);
  };

  // Quick select presets
  const selectWeekdays = () => {
    setTargetDays([1, 2, 3, 4, 5].filter(d => d !== sourceDay));
  };

  const selectAll = () => {
    setTargetDays([0, 1, 2, 3, 4, 5, 6].filter(d => d !== sourceDay));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-purple-50 px-6 py-4 border-b border-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Copy size={20} className="text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Copy Day Schedule</h3>
                <p className="text-sm text-slate-600">
                  Copy {DAYS[sourceDay]}'s schedule to other days
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-purple-100 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Source Info */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-sm text-slate-500 mb-1">Copying from:</div>
            <div className="font-bold text-slate-800">{sourceGroup} - {DAYS[sourceDay]}</div>
            <div className="text-sm text-slate-600 mt-1">
              {existingSlots?.length || 0} time slot{existingSlots?.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Preview of slots being copied */}
          {existingSlots && existingSlots.length > 0 && (
            <div className="bg-blue-50 rounded-xl p-3 space-y-2">
              <div className="text-xs font-medium text-blue-700">Slots to copy:</div>
              {existingSlots.map((slot, idx) => {
                const activityInfo = ACTIVITY_TYPES.find(a => a.value === slot.activity_type);
                return (
                  <div key={idx} className="text-sm text-blue-800 flex items-center gap-2">
                    <span className="font-medium">{activityInfo?.label || 'Swim'}:</span>
                    <span>{formatTimeOfDay(slot.start_time)} - {formatTimeOfDay(slot.end_time)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Target Day Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">Copy to these days:</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={selectWeekdays}
                  className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition"
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 transition"
                >
                  All Days
                </button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_SHORT.map((day, idx) => {
                const isSource = idx === sourceDay;
                const isSelected = targetDays.includes(idx);
                
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    disabled={isSource}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      isSource
                        ? 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                        : isSelected
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <span className="text-sm font-medium">{day}</span>
                    {isSource && (
                      <div className="text-[10px] text-slate-400 mt-0.5">Source</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Warning about overwriting */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
            <AlertCircle size={16} className="inline mr-2" />
            Existing time slots on target days will be replaced.
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCopy}
              disabled={loading || targetDays.length === 0}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Copy size={18} />}
              Copy to {targetDays.length} Day{targetDays.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Season Settings Modal
function SeasonModal({ isOpen, onClose, onSave, currentSeason }) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    seasonName: ''
  });

  useEffect(() => {
    if (currentSeason) {
      setFormData({
        startDate: currentSeason.startDate || '',
        endDate: currentSeason.endDate || '',
        seasonName: currentSeason.name || ''
      });
    } else {
      // Default to current school year
      const now = new Date();
      const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
      setFormData({
        startDate: `${year}-09-01`,
        endDate: `${year + 1}-05-31`,
        seasonName: `${year}-${year + 1} Season`
      });
    }
  }, [currentSeason, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Calendar size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Season Settings</h3>
                <p className="text-sm text-slate-600">Set the active season dates</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Season Name</label>
            <input
              type="text"
              value={formData.seasonName}
              onChange={(e) => setFormData({ ...formData, seasonName: e.target.value })}
              placeholder="e.g., 2025-2026 Season"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2"
            >
              <Check size={18} />
              Save Season
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Time Slot Display Component
function TimeSlotCell({ slots, groupName, dayOfWeek, onEdit, onAdd, onDelete, onCopy }) {
  const [expanded, setExpanded] = useState(false);

  if (!slots || slots.length === 0) {
    return (
      <button
        onClick={() => onAdd(groupName, dayOfWeek)}
        className="w-full h-full min-h-[60px] border-2 border-dashed border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-center text-slate-300 hover:text-blue-500"
      >
        <Plus size={16} />
      </button>
    );
  }

  return (
    <div className="space-y-1 group/cell">
      {/* Copy Day Button - shows on hover */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onCopy(groupName, dayOfWeek);
        }}
        className="w-full py-1 mb-1 border border-dashed border-purple-200 rounded text-purple-400 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all flex items-center justify-center gap-1 text-[10px] opacity-0 group-hover/cell:opacity-100"
        title="Copy this day's schedule to other days"
      >
        <Copy size={10} />
        Copy Day
      </button>
      
      {slots.map((slot, idx) => {
        const activityInfo = ACTIVITY_TYPES.find(a => a.value === slot.activity_type);
        const Icon = activityInfo?.icon || Waves;
        const color = activityInfo?.color || 'blue';

        return (
          <div
            key={slot.id || idx}
            onClick={() => onEdit(slot, groupName, dayOfWeek)}
            className={`group relative bg-${color}-50 border border-${color}-200 rounded-lg p-2 cursor-pointer hover:bg-${color}-100 transition-all`}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon size={12} className={`text-${color}-600`} />
              <span className={`text-xs font-semibold text-${color}-700`}>
                {activityInfo?.label || 'Swim'}
              </span>
            </div>
            <div className="text-xs font-bold text-slate-800">
              {formatTimeOfDay(slot.start_time)} - {formatTimeOfDay(slot.end_time)}
            </div>
            {slot.notes && (
              <div className="text-[10px] text-slate-500 truncate mt-0.5">
                {slot.notes}
              </div>
            )}
            
            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(slot);
              }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
      
      {/* Add another slot button */}
      <button
        onClick={() => onAdd(groupName, dayOfWeek)}
        className="w-full p-1.5 border border-dashed border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50/50 transition-all flex items-center justify-center text-slate-300 hover:text-blue-500 text-xs"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

// Main Component
export default function PracticeScheduleManager({ onBack, onOpenPracticeBuilder, onManageCoachAssignments }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  const [groups, setGroups] = useState([]);
  
  // Season settings - default to current school year
  const [season, setSeason] = useState(() => {
    const now = new Date();
    const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
    return {
      startDate: `${year}-09-01`,
      endDate: `${year + 1}-05-31`,
      name: `${year}-${year + 1} Season`
    };
  });

  // Modal states
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showSeasonModal, setShowSeasonModal] = useState(false);
  const [showCopyDayModal, setShowCopyDayModal] = useState(false);
  const [copySource, setCopySource] = useState({ group: '', day: 0 });

  // View state
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('practice_schedules')
        .select('*')
        .order('display_order', { ascending: true })
        .order('group_name', { ascending: true })
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (schedulesError) {
        console.error('Error loading schedules:', schedulesError);
        // Table might not exist yet
      } else {
        setSchedules(schedulesData || []);
        
        // Extract unique groups
        const uniqueGroups = [...new Set((schedulesData || []).map(s => s.group_name))];
        setGroups(uniqueGroups);
        
        // Get season from existing schedules
        if (schedulesData && schedulesData.length > 0) {
          const firstSchedule = schedulesData[0];
          setSeason({
            startDate: firstSchedule.season_start_date,
            endDate: firstSchedule.season_end_date,
            name: `${new Date(firstSchedule.season_start_date).getFullYear()}-${new Date(firstSchedule.season_end_date).getFullYear()} Season`
          });
        } else {
          // Default season
          const now = new Date();
          const year = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
          setSeason({
            startDate: `${year}-09-01`,
            endDate: `${year + 1}-05-31`,
            name: `${year}-${year + 1} Season`
          });
        }
      }

      // Load exceptions
      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from('practice_schedule_exceptions')
        .select('*')
        .order('exception_date', { ascending: true });

      if (exceptionsError) {
        console.error('Error loading exceptions:', exceptionsError);
      } else {
        setExceptions(exceptionsData || []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get schedule slots for a specific group and day
  const getSlotsForGroupDay = (groupName, dayOfWeek) => {
    return schedules.filter(s => 
      s.group_name === groupName && 
      s.day_of_week === dayOfWeek
    );
  };

  // Handle adding a new time slot
  const handleAddSlot = (groupName, dayOfWeek) => {
    setSelectedGroup(groupName);
    setSelectedDay(dayOfWeek);
    setEditingSlot(null);
    setShowTimeSlotModal(true);
  };

  // Handle editing a time slot
  const handleEditSlot = (slot, groupName, dayOfWeek) => {
    setSelectedGroup(groupName);
    setSelectedDay(dayOfWeek);
    setEditingSlot(slot);
    setShowTimeSlotModal(true);
  };

  // Handle saving a time slot
  const handleSaveSlot = async (formData) => {
    // Validate season dates are set
    if (!season.startDate || !season.endDate) {
      alert('Please set the season dates first (click "Season Settings" button)');
      setShowSeasonModal(true);
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const slotData = {
        group_name: selectedGroup,
        day_of_week: selectedDay,
        activity_type: formData.activity_type,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location_name: formData.location_name || null,
        notes: formData.notes || null,
        season_start_date: season.startDate,
        season_end_date: season.endDate,
        updated_at: new Date().toISOString()
        // Note: created_by omitted to avoid auth.users permission issues
      };

      console.log('Saving slot data:', slotData);

      if (editingSlot) {
        // Update existing
        const { data, error } = await supabase
          .from('practice_schedules')
          .update(slotData)
          .eq('id', editingSlot.id)
          .select();

        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        console.log('Updated:', data);
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('practice_schedules')
          .insert([slotData])
          .select();

        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        console.log('Inserted:', data);
      }

      await loadData();
      setShowTimeSlotModal(false);
    } catch (error) {
      console.error('Error saving slot:', error);
      alert(`Failed to save time slot: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  // Handle deleting a time slot
  const handleDeleteSlot = async (slot) => {
    if (!confirm('Delete this time slot?')) return;

    try {
      const { error } = await supabase
        .from('practice_schedules')
        .delete()
        .eq('id', slot.id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting slot:', error);
      alert('Failed to delete time slot');
    }
  };

  // Handle adding a new group
  const handleAddGroup = async (groupName) => {
    // Just add to local state - actual schedules will be created when times are added
    if (!groups.includes(groupName)) {
      setGroups([...groups, groupName]);
    }
    setShowGroupModal(false);
  };

  // Handle opening copy day modal
  const handleOpenCopyDay = (groupName, dayOfWeek) => {
    setCopySource({ group: groupName, day: dayOfWeek });
    setShowCopyDayModal(true);
  };

  // Handle copying day schedule to other days
  const handleCopyDay = async (sourceGroup, sourceDay, targetDays) => {
    try {
      const sourceSlotsData = getSlotsForGroupDay(sourceGroup, sourceDay);
      
      if (sourceSlotsData.length === 0) {
        alert('No time slots to copy from this day.');
        return;
      }

      // For each target day, delete existing slots and copy source slots
      for (const targetDay of targetDays) {
        // First, delete existing slots for target day
        const existingTargetSlots = getSlotsForGroupDay(sourceGroup, targetDay);
        if (existingTargetSlots.length > 0) {
          const idsToDelete = existingTargetSlots.map(s => s.id);
          const { error: deleteError } = await supabase
            .from('practice_schedules')
            .delete()
            .in('id', idsToDelete);

          if (deleteError) {
            console.error('Error deleting existing slots:', deleteError);
          }
        }

        // Now insert copies of source slots for target day
        const newSlots = sourceSlotsData.map(slot => ({
          group_name: sourceGroup,
          day_of_week: targetDay,
          activity_type: slot.activity_type,
          start_time: slot.start_time,
          end_time: slot.end_time,
          location_name: slot.location_name,
          notes: slot.notes,
          season_start_date: season.startDate,
          season_end_date: season.endDate,
          display_order: slot.display_order || 0,
          updated_at: new Date().toISOString()
        }));

        const { error: insertError } = await supabase
          .from('practice_schedules')
          .insert(newSlots);

        if (insertError) {
          console.error('Error copying slots to day', targetDay, ':', insertError);
          throw insertError;
        }
      }

      await loadData();
      setShowCopyDayModal(false);
    } catch (error) {
      console.error('Error copying day schedule:', error);
      alert('Failed to copy schedule. Please try again.');
    }
  };

  // Handle saving an exception
  const handleSaveException = async (formData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Generate dates between start and end
      const startDate = new Date(formData.startDate);
      const endDate = formData.endDate ? new Date(formData.endDate) : startDate;
      
      const exceptionsToInsert = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        exceptionsToInsert.push({
          exception_date: currentDate.toISOString().split('T')[0],
          group_name: formData.groupName || null,
          exception_type: formData.exceptionType,
          new_start_time: formData.newStartTime || null,
          new_end_time: formData.newEndTime || null,
          reason: formData.reason
          // Note: created_by omitted to avoid auth.users permission issues
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      const { error } = await supabase
        .from('practice_schedule_exceptions')
        .insert(exceptionsToInsert);

      if (error) throw error;

      await loadData();
      setShowExceptionModal(false);
    } catch (error) {
      console.error('Error saving exception:', error);
      alert('Failed to save exception. Make sure the database tables are created.');
    }
  };

  // Handle season update
  const handleSaveSeason = async (seasonData) => {
    setSeason(seasonData);
    
    // Update all existing schedules with new season dates
    if (schedules.length > 0) {
      try {
        const { error } = await supabase
          .from('practice_schedules')
          .update({
            season_start_date: seasonData.startDate,
            season_end_date: seasonData.endDate
          })
          .gte('created_at', '1900-01-01'); // Update all

        if (error) throw error;
        await loadData();
      } catch (error) {
        console.error('Error updating season:', error);
      }
    }
    
    setShowSeasonModal(false);
  };

  // Toggle group expansion
  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Count upcoming exceptions
  const upcomingExceptions = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return exceptions.filter(e => e.exception_date >= today).length;
  }, [exceptions]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 md:p-6 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <Calendar size={28} className="text-blue-600" />
                Practice Schedule
              </h1>
              <p className="text-slate-500 text-sm">
                Set recurring practice times for each training group
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSeasonModal(true)}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition text-sm font-medium"
            >
              <Settings size={16} />
              <span className="hidden md:inline">Season: {season.name || 'Set Season'}</span>
            </button>
            {onManageCoachAssignments && (
              <button
                onClick={onManageCoachAssignments}
                className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-100 transition text-sm font-medium"
              >
                <Users size={16} />
                <span className="hidden md:inline">Coach Assignments</span>
              </button>
            )}
            <button
              onClick={() => setShowExceptionModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-100 transition text-sm font-medium"
            >
              <CalendarOff size={16} />
              <span className="hidden md:inline">Add Exception</span>
              {upcomingExceptions > 0 && (
                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {upcomingExceptions}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowGroupModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition text-sm font-medium"
            >
              <Plus size={16} />
              <span className="hidden md:inline">Add Group</span>
            </button>
          </div>
        </div>

        {/* Season Info Bar */}
        {season.startDate && (
          <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-2">
            <span className="font-medium">Active Season:</span>
            <span>{new Date(season.startDate).toLocaleDateString()} - {new Date(season.endDate).toLocaleDateString()}</span>
            <span className="text-slate-400">•</span>
            <span>{groups.length} groups</span>
            <span className="text-slate-400">•</span>
            <span>{schedules.length} time slots</span>
          </div>
        )}
      </div>

      {/* Main Content - Schedule Grid */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {groups.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">No Groups Yet</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Start by adding your training groups. You can then set up practice times for each group.
            </p>
            <button
              onClick={() => setShowGroupModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
            >
              <Plus size={20} />
              Add Your First Group
            </button>
          </div>
        ) : (
          /* Schedule Grid */
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {/* Grid Header - Days */}
            <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50">
              <div className="p-4 font-bold text-slate-700 border-r border-slate-200">
                Group
              </div>
              {DAYS_SHORT.map((day, idx) => (
                <div 
                  key={day} 
                  className={`p-4 text-center font-bold ${
                    idx === 0 || idx === 6 ? 'text-slate-400 bg-slate-100/50' : 'text-slate-700'
                  }`}
                >
                  <span className="hidden md:inline">{DAYS[idx]}</span>
                  <span className="md:hidden">{day}</span>
                </div>
              ))}
            </div>

            {/* Grid Body - Groups */}
            {groups.map((groupName, groupIdx) => (
              <div 
                key={groupName}
                className={`grid grid-cols-8 border-b border-slate-100 ${
                  groupIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                }`}
              >
                {/* Group Name */}
                <div className="p-3 border-r border-slate-200 flex items-start">
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 text-sm">{groupName}</div>
                    <div className="text-xs text-slate-500">
                      {schedules.filter(s => s.group_name === groupName).length} slots
                    </div>
                  </div>
                </div>

                {/* Day Columns */}
                {DAYS.map((day, dayIdx) => (
                  <div 
                    key={dayIdx} 
                    className={`p-2 min-h-[80px] ${
                      dayIdx === 0 || dayIdx === 6 ? 'bg-slate-50/50' : ''
                    }`}
                  >
                    <TimeSlotCell
                      slots={getSlotsForGroupDay(groupName, dayIdx)}
                      groupName={groupName}
                      dayOfWeek={dayIdx}
                      onEdit={handleEditSlot}
                      onAdd={handleAddSlot}
                      onDelete={handleDeleteSlot}
                      onCopy={handleOpenCopyDay}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Upcoming Exceptions Section */}
        {exceptions.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <CalendarOff size={20} className="text-amber-500" />
              Schedule Exceptions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {exceptions.slice(0, 9).map(exception => (
                <div
                  key={exception.id}
                  className={`p-3 rounded-lg border ${
                    exception.exception_type === 'canceled' 
                      ? 'bg-red-50 border-red-200' 
                      : exception.exception_type === 'modified'
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">
                      {new Date(exception.exception_date + 'T00:00:00').toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      exception.exception_type === 'canceled' 
                        ? 'bg-red-100 text-red-700' 
                        : exception.exception_type === 'modified'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                    }`}>
                      {exception.exception_type}
                    </span>
                  </div>
                  <div className="text-sm text-slate-600">{exception.reason}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {exception.group_name || 'All Groups'}
                  </div>
                </div>
              ))}
            </div>
            {exceptions.length > 9 && (
              <p className="text-sm text-slate-500 mt-3 text-center">
                +{exceptions.length - 9} more exceptions
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <TimeSlotModal
        isOpen={showTimeSlotModal}
        onClose={() => setShowTimeSlotModal(false)}
        onSave={handleSaveSlot}
        slot={editingSlot}
        groupName={selectedGroup}
        dayOfWeek={selectedDay}
      />

      <ExceptionModal
        isOpen={showExceptionModal}
        onClose={() => setShowExceptionModal(false)}
        onSave={handleSaveException}
        groups={groups}
      />

      <GroupModal
        isOpen={showGroupModal}
        onClose={() => setShowGroupModal(false)}
        onSave={handleAddGroup}
        existingGroups={groups}
      />

      <SeasonModal
        isOpen={showSeasonModal}
        onClose={() => setShowSeasonModal(false)}
        onSave={handleSaveSeason}
        currentSeason={season}
      />

      <CopyDayModal
        isOpen={showCopyDayModal}
        onClose={() => setShowCopyDayModal(false)}
        onCopy={handleCopyDay}
        sourceGroup={copySource.group}
        sourceDay={copySource.day}
        existingSlots={getSlotsForGroupDay(copySource.group, copySource.day)}
      />
    </div>
  );
}

