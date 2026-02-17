// src/CoachAssignmentManager.jsx
// Allows head coaches to assign staff to practice groups with recurring schedules
// Supports recurring weekly assignments + per-date overrides (sick, substitute, etc.)

import React, { useState, useEffect, useMemo } from 'react';

const formatRole = (role) => {
  const roleMap = {
    'head_coach': 'Head Coach',
    'age_group_coach': 'Age Group Coach',
    'assistant': 'Assistant Coach',
    'volunteer': 'Volunteer',
    'admin': 'Admin'
  };
  return roleMap[role] || role;
};

import { supabase } from './supabase';
import {
  ChevronLeft, Users, Plus, X, Check, Loader2, UserPlus,
  Calendar, Edit2, Trash2, Save, AlertCircle, User,
  Repeat, CalendarOff, RefreshCw, ChevronRight, Clock
} from 'lucide-react';
import { formatTimeOfDay } from './utils/dateUtils';
import ScheduleSubNav from './components/navigation/ScheduleSubNav';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const AVATAR_COLORS = [
  { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  { name: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200' },
  { name: 'purple', bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
  { name: 'rose', bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
  { name: 'amber', bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' },
  { name: 'cyan', bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200' },
  { name: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
  { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', border: 'border-pink-200' },
];

function StaffAvatar({ staff, size = 'md' }) {
  const colorConfig = AVATAR_COLORS.find(c => c.name === staff.avatar_color) || AVATAR_COLORS[0];
  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  return (
    <div className={`${sizeClasses[size]} ${colorConfig.bg} ${colorConfig.text} rounded-full flex items-center justify-center font-bold`}>
      {staff.initials || staff.name?.charAt(0) || '?'}
    </div>
  );
}

// ============================================
// Add/Edit Staff Modal
// ============================================
function StaffModal({ isOpen, onClose, onSave, staff, existingNames }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'assistant',
    avatar_color: 'blue'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (staff) {
      setFormData({
        name: staff.name || '',
        email: staff.email || '',
        role: staff.role || 'assistant',
        avatar_color: staff.avatar_color || 'blue'
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'assistant',
        avatar_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)].name
      });
    }
  }, [staff, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    await onSave({
      ...formData,
      initials: formData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlus size={20} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">
                  {staff ? 'Edit Staff Member' : 'Add Staff Member'}
                </h3>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-blue-100 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Coach name"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="coach@example.com"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500"
            >
              <option value="head_coach">Head Coach</option>
              <option value="age_group_coach">Age Group Coach</option>
              <option value="assistant">Assistant Coach</option>
              <option value="volunteer">Volunteer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setFormData({ ...formData, avatar_color: color.name })}
                  className={`w-8 h-8 rounded-full ${color.bg} ${color.border} border-2 transition ${
                    formData.avatar_color === color.name ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                  }`}
                />
              ))}
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
              disabled={saving || !formData.name.trim()}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {staff ? 'Update' : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Enhanced Assignment Modal with Recurring Day Selection
// ============================================
function AssignmentModal({ isOpen, onClose, onSave, staff, groups, existingAssignments, practiceSchedules }) {
  const [assignments, setAssignments] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && staff) {
      const existing = existingAssignments
        .filter(a => a.coach_id === staff.id)
        .map(a => ({
          group_name: a.group_name,
          day_of_week: a.day_of_week,
        }));

      // Build a structured map: group -> set of days
      const groupDayMap = {};
      existing.forEach(a => {
        if (!groupDayMap[a.group_name]) {
          groupDayMap[a.group_name] = { days: new Set(), allDays: false };
        }
        if (a.day_of_week === null || a.day_of_week === undefined) {
          groupDayMap[a.group_name].allDays = true;
        } else {
          groupDayMap[a.group_name].days.add(a.day_of_week);
        }
      });

      const structured = Object.entries(groupDayMap).map(([group, info]) => {
        if (info.allDays) {
          // Find all days this group has practices
          const practiceDays = getPracticeDaysForGroup(group);
          return { group_name: group, selectedDays: new Set(practiceDays), allDays: true };
        }
        return { group_name: group, selectedDays: info.days, allDays: false };
      });

      setAssignments(structured);
    } else {
      setAssignments([]);
    }
  }, [isOpen, staff, existingAssignments, practiceSchedules]);

  // Get practice days for a group from practice_schedules
  const getPracticeDaysForGroup = (groupName) => {
    return [...new Set(
      practiceSchedules
        .filter(s => s.group_name === groupName)
        .map(s => s.day_of_week)
    )];
  };

  // Check if a group is in the assignments
  const isGroupSelected = (groupName) => {
    return assignments.some(a => a.group_name === groupName);
  };

  // Toggle a group on/off
  const toggleGroup = (groupName) => {
    if (isGroupSelected(groupName)) {
      setAssignments(prev => prev.filter(a => a.group_name !== groupName));
    } else {
      const practiceDays = getPracticeDaysForGroup(groupName);
      setAssignments(prev => [
        ...prev,
        { group_name: groupName, selectedDays: new Set(practiceDays), allDays: true }
      ]);
    }
  };

  // Toggle a specific day for a group
  const toggleDay = (groupName, dayOfWeek) => {
    setAssignments(prev => prev.map(a => {
      if (a.group_name !== groupName) return a;
      const newDays = new Set(a.selectedDays);
      if (newDays.has(dayOfWeek)) {
        newDays.delete(dayOfWeek);
      } else {
        newDays.add(dayOfWeek);
      }
      const practiceDays = getPracticeDaysForGroup(groupName);
      const allSelected = practiceDays.every(d => newDays.has(d));
      return { ...a, selectedDays: newDays, allDays: allSelected };
    }));
  };

  // Quick select: all practice days for a group
  const selectAllDays = (groupName) => {
    const practiceDays = getPracticeDaysForGroup(groupName);
    setAssignments(prev => prev.map(a => {
      if (a.group_name !== groupName) return a;
      return { ...a, selectedDays: new Set(practiceDays), allDays: true };
    }));
  };

  // Quick select: weekdays only
  const selectWeekdays = (groupName) => {
    const practiceDays = getPracticeDaysForGroup(groupName);
    const weekdayPracticeDays = practiceDays.filter(d => d >= 1 && d <= 5);
    setAssignments(prev => prev.map(a => {
      if (a.group_name !== groupName) return a;
      return { ...a, selectedDays: new Set(weekdayPracticeDays), allDays: false };
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(staff, assignments);
    setSaving(false);
  };

  if (!isOpen || !staff) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StaffAvatar staff={staff} size="lg" />
              <div>
                <h3 className="font-bold text-slate-800">Recurring Assignments</h3>
                <p className="text-sm text-slate-600">{staff.name} - {formatRole(staff.role)}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <Repeat size={16} className="text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800">
              Select groups and which days {staff.name} coaches them. These repeat every week automatically.
            </p>
          </div>

          <div className="space-y-3">
            {groups.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No practice groups set up yet</p>
            ) : (
              groups.map(group => {
                const selected = isGroupSelected(group);
                const groupAssignment = assignments.find(a => a.group_name === group);
                const practiceDays = getPracticeDaysForGroup(group);
                const practiceTimesForGroup = practiceSchedules.filter(s => s.group_name === group);

                return (
                  <div
                    key={group}
                    className={`rounded-xl border-2 transition-all overflow-hidden ${
                      selected ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-200'
                    }`}
                  >
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroup(group)}
                      className="w-full p-3 flex items-center justify-between hover:bg-slate-50/50 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                          selected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'
                        }`}>
                          {selected && <Check size={14} className="text-white" />}
                        </div>
                        <span className="font-semibold text-slate-700">{group}</span>
                      </div>
                      {selected && groupAssignment && (
                        <span className="text-xs text-emerald-600 font-medium">
                          {groupAssignment.selectedDays.size} day{groupAssignment.selectedDays.size !== 1 ? 's' : ''}/week
                        </span>
                      )}
                    </button>

                    {/* Day Selection (visible when group is selected) */}
                    {selected && (
                      <div className="px-3 pb-3 border-t border-emerald-100">
                        {/* Quick Select Buttons */}
                        <div className="flex items-center justify-between mt-2 mb-2">
                          <span className="text-xs text-slate-500 font-medium">Which days?</span>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => selectAllDays(group)}
                              className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200 transition"
                            >
                              All Practice Days
                            </button>
                            <button
                              type="button"
                              onClick={() => selectWeekdays(group)}
                              className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200 transition"
                            >
                              Weekdays Only
                            </button>
                          </div>
                        </div>

                        {/* Day Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {DAYS.map((day, idx) => {
                            const hasPractice = practiceDays.includes(idx);
                            const isSelected = groupAssignment?.selectedDays.has(idx);
                            const scheduleForDay = practiceTimesForGroup.filter(s => s.day_of_week === idx);

                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => hasPractice && toggleDay(group, idx)}
                                disabled={!hasPractice}
                                className={`p-2 rounded-lg text-center transition-all ${
                                  !hasPractice
                                    ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                                    : isSelected
                                      ? 'bg-emerald-500 text-white shadow-sm'
                                      : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
                                }`}
                                title={
                                  hasPractice
                                    ? scheduleForDay.map(s => `${formatTimeOfDay(s.start_time)}-${formatTimeOfDay(s.end_time)}`).join(', ')
                                    : 'No practice'
                                }
                              >
                                <div className="text-xs font-bold">{day}</div>
                                {hasPractice && scheduleForDay.length > 0 && (
                                  <div className="text-[9px] mt-0.5 opacity-80">
                                    {formatTimeOfDay(scheduleForDay[0].start_time)}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 shrink-0">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              Save Recurring Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Override Modal - For per-date coach changes
// ============================================
function OverrideModal({ isOpen, onClose, onSave, groups, staffMembers, existingOverrides }) {
  const [formData, setFormData] = useState({
    override_date: '',
    group_name: '',
    override_type: 'absent',
    original_coach_id: '',
    replacement_coach_id: '',
    reason: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        override_date: new Date().toISOString().split('T')[0],
        group_name: '',
        override_type: 'absent',
        original_coach_id: '',
        replacement_coach_id: '',
        reason: ''
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.override_date || !formData.group_name) return;
    if (formData.override_type === 'absent' && !formData.original_coach_id) return;
    if (formData.override_type === 'substitute' && (!formData.original_coach_id || !formData.replacement_coach_id)) return;
    if (formData.override_type === 'added' && !formData.replacement_coach_id) return;

    setSaving(true);
    await onSave(formData);
    setSaving(false);
  };

  const presetReasons = [
    'Sick', 'Vacation', 'Personal Day', 'Training', 'Meet', 'Scheduling Conflict'
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
                <h3 className="font-bold text-slate-800">Schedule Override</h3>
                <p className="text-sm text-slate-600">Change a coach's assignment for a specific date</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-amber-100 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Override Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">What happened?</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'absent', label: 'Coach Absent', icon: CalendarOff, color: 'red' },
                { value: 'substitute', label: 'Substitute', icon: RefreshCw, color: 'amber' },
                { value: 'added', label: 'Extra Coach', icon: UserPlus, color: 'green' }
              ].map(type => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, override_type: type.value })}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      formData.override_type === type.value
                        ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700`
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon size={20} className="mx-auto mb-1" />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
            <input
              type="date"
              value={formData.override_date}
              onChange={(e) => setFormData({ ...formData, override_date: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>

          {/* Group */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Practice Group *</label>
            <select
              value={formData.group_name}
              onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              required
            >
              <option value="">Select group...</option>
              {groups.map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          {/* Original Coach (for absent/substitute) */}
          {(formData.override_type === 'absent' || formData.override_type === 'substitute') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {formData.override_type === 'absent' ? 'Who is absent?' : 'Who is being replaced?'} *
              </label>
              <select
                value={formData.original_coach_id}
                onChange={(e) => setFormData({ ...formData, original_coach_id: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                required
              >
                <option value="">Select coach...</option>
                {staffMembers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({formatRole(s.role)})</option>
                ))}
              </select>
            </div>
          )}

          {/* Replacement Coach (for substitute/added) */}
          {(formData.override_type === 'substitute' || formData.override_type === 'added') && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {formData.override_type === 'substitute' ? 'Who is covering?' : 'Who is being added?'} *
              </label>
              <select
                value={formData.replacement_coach_id}
                onChange={(e) => setFormData({ ...formData, replacement_coach_id: e.target.value })}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                required
              >
                <option value="">Select coach...</option>
                {staffMembers.filter(s => s.id !== formData.original_coach_id).map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({formatRole(s.role)})</option>
                ))}
              </select>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="e.g., Sick, vacation"
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500"
              list="override-reasons"
            />
            <datalist id="override-reasons">
              {presetReasons.map(r => <option key={r} value={r} />)}
            </datalist>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {presetReasons.map(reason => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setFormData({ ...formData, reason })}
                  className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs hover:bg-slate-200 transition"
                >
                  {reason}
                </button>
              ))}
            </div>
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
              disabled={saving}
              className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              Save Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Weekly Overview Grid
// ============================================
function WeeklyOverviewGrid({ groups, staffMembers, assignments, practiceSchedules, overrides, weekStart, onEditOverride }) {
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [weekStart]);

  const today = new Date().toISOString().split('T')[0];

  // Get coaches assigned to a group on a specific date
  const getCoachesForGroupDate = (groupName, date) => {
    const dayOfWeek = new Date(date + 'T00:00:00').getDay();

    // Get recurring assignments for this group + day
    const recurringCoaches = assignments
      .filter(a =>
        a.group_name === groupName &&
        (a.day_of_week === null || a.day_of_week === undefined || a.day_of_week === dayOfWeek) &&
        a.effective_date <= date &&
        (a.end_date === null || a.end_date === undefined || a.end_date >= date)
      )
      .map(a => {
        const staff = staffMembers.find(s => s.id === a.coach_id);
        return staff ? { ...staff, is_lead: a.is_lead, is_override: false } : null;
      })
      .filter(Boolean);

    // Apply overrides for this date
    const dateOverrides = overrides.filter(o =>
      o.group_name === groupName && o.override_date === date
    );

    // Remove absent/substituted coaches
    const absentIds = new Set(
      dateOverrides
        .filter(o => o.override_type === 'absent' || o.override_type === 'substitute' || o.override_type === 'removed')
        .map(o => o.original_coach_id)
    );

    let effectiveCoaches = recurringCoaches.filter(c => !absentIds.has(c.id));

    // Add substitutes and extras
    dateOverrides
      .filter(o => (o.override_type === 'substitute' || o.override_type === 'added') && o.replacement_coach_id)
      .forEach(o => {
        const staff = staffMembers.find(s => s.id === o.replacement_coach_id);
        if (staff && !effectiveCoaches.some(c => c.id === staff.id)) {
          effectiveCoaches.push({
            ...staff,
            is_lead: false,
            is_override: true,
            override_reason: o.reason
          });
        }
      });

    return effectiveCoaches;
  };

  // Check if a group has practice on a given day
  const hasPracticeOnDay = (groupName, dayOfWeek) => {
    return practiceSchedules.some(s => s.group_name === groupName && s.day_of_week === dayOfWeek);
  };

  // Check if there's an override on a specific date for this group
  const hasOverride = (groupName, date) => {
    return overrides.some(o => o.group_name === groupName && o.override_date === date);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 bg-slate-50 z-10 p-3 text-left font-semibold text-slate-600 border-r border-slate-200 min-w-[140px]">
                Group
              </th>
              {weekDates.map((date, idx) => {
                const dayDate = new Date(date + 'T00:00:00');
                const isToday = date === today;
                const isWeekend = idx === 0 || idx === 6;

                return (
                  <th key={date} className={`p-3 text-center min-w-[120px] ${isWeekend ? 'bg-slate-100/50' : ''}`}>
                    <div className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-blue-600' : 'text-slate-500'}`}>
                      {DAYS[idx]}
                    </div>
                    <div className={`text-sm font-bold ${
                      isToday
                        ? 'w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto'
                        : 'text-slate-800'
                    }`}>
                      {dayDate.getDate()}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map(groupName => (
              <tr key={groupName}>
                <td className="sticky left-0 bg-white z-10 p-3 border-r border-slate-200">
                  <div className="font-semibold text-slate-800 text-sm">{groupName}</div>
                </td>
                {weekDates.map((date, idx) => {
                  const dayOfWeek = new Date(date + 'T00:00:00').getDay();
                  const hasPractice = hasPracticeOnDay(groupName, dayOfWeek);
                  const coaches = hasPractice ? getCoachesForGroupDate(groupName, date) : [];
                  const isToday = date === today;
                  const hasDateOverride = hasOverride(groupName, date);

                  if (!hasPractice) {
                    return (
                      <td key={date} className={`p-2 ${idx === 0 || idx === 6 ? 'bg-slate-50/50' : ''}`}>
                        <div className="text-center text-slate-200 text-sm">—</div>
                      </td>
                    );
                  }

                  return (
                    <td key={date} className={`p-2 ${idx === 0 || idx === 6 ? 'bg-slate-50/50' : ''}`}>
                      <div
                        onClick={() => onEditOverride && onEditOverride(groupName, date)}
                        className={`p-2 rounded-lg cursor-pointer transition-all min-h-[50px] ${
                          isToday ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                        } ${
                          hasDateOverride
                            ? 'bg-amber-50 border border-amber-200 hover:bg-amber-100'
                            : coaches.length > 0
                              ? 'bg-emerald-50 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-50 border border-dashed border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {coaches.length > 0 ? (
                          <div className="space-y-1">
                            {coaches.map(coach => (
                              <div key={coach.id} className="flex items-center gap-1.5">
                                <StaffAvatar staff={coach} size="sm" />
                                <span className="text-xs text-slate-700 font-medium truncate">
                                  {coach.name.split(' ')[0]}
                                </span>
                                {coach.is_override && (
                                  <span className="text-[9px] px-1 py-0.5 bg-amber-200 text-amber-700 rounded">sub</span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-slate-300 text-xs py-1">
                            No coach
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================
export default function CoachAssignmentManager({ onBack, onScheduleNavigate }) {
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [practiceSchedules, setPracticeSchedules] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [teamId, setTeamId] = useState(null);

  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assigningStaff, setAssigningStaff] = useState(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  // Weekly view navigation
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // View mode: 'staff' or 'weekly'
  const [viewMode, setViewMode] = useState('staff');

  useEffect(() => {
    loadData();
  }, []);

  const ensureTeamId = async () => {
    if (teamId) return teamId;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error('Not signed in');

    const { data: teamMember, error } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)
      .single();

    if (error) throw error;
    if (!teamMember?.team_id) throw new Error('No team association found');
    setTeamId(teamMember.team_id);
    return teamMember.team_id;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const currentTeamId = await ensureTeamId();

      const { data: staffData } = await supabase
        .from('staff_members')
        .select('*')
        .eq('team_id', currentTeamId)
        .eq('is_active', true)
        .order('name');

      const { data: assignmentsData } = await supabase
        .from('coach_group_assignments')
        .select('*')
        .eq('team_id', currentTeamId)
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`);

      const { data: schedulesData } = await supabase
        .from('practice_schedules')
        .select('*')
        .eq('team_id', currentTeamId)
        .order('group_name')
        .order('day_of_week');

      const { data: overridesData } = await supabase
        .from('coach_assignment_overrides')
        .select('*')
        .eq('team_id', currentTeamId)
        .gte('override_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('override_date');

      setStaffMembers(staffData || []);
      setAssignments(assignmentsData || []);
      setPracticeSchedules(schedulesData || []);
      setOverrides(overridesData || []);

      const uniqueGroups = [...new Set((schedulesData || []).map(s => s.group_name))];
      setGroups(uniqueGroups);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Save staff member
  const handleSaveStaff = async (staffData) => {
    try {
      const currentTeamId = await ensureTeamId();
      if (editingStaff) {
        const { error } = await supabase
          .from('staff_members')
          .update({ ...staffData, updated_at: new Date().toISOString() })
          .eq('id', editingStaff.id)
          .eq('team_id', currentTeamId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('staff_members')
          .insert([{ ...staffData, team_id: currentTeamId }]);
        if (error) throw error;
      }

      await loadData();
      setShowStaffModal(false);
      setEditingStaff(null);
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Failed to save staff member');
    }
  };

  // Save recurring assignments (enhanced with day_of_week)
  const handleSaveAssignments = async (staff, assignmentData) => {
    try {
      const currentTeamId = await ensureTeamId();
      const { data: { user } } = await supabase.auth.getUser();

      // Delete all existing assignments for this staff member
      const { error: deleteError } = await supabase
        .from('coach_group_assignments')
        .delete()
        .eq('coach_id', staff.id)
        .eq('team_id', currentTeamId);
      if (deleteError) throw deleteError;

      // Build new assignment rows
      const newAssignments = [];
      assignmentData.forEach(({ group_name, selectedDays, allDays }) => {
        if (allDays || selectedDays.size === 0) {
          // "All days" = single row with day_of_week = null
          newAssignments.push({
            team_id: currentTeamId,
            coach_id: staff.id,
            coach_name: staff.name,
            group_name,
            day_of_week: null,
            effective_date: new Date().toISOString().split('T')[0],
            created_by: user?.id || null,
            updated_at: new Date().toISOString()
          });
        } else {
          // Specific days = one row per day
          selectedDays.forEach(day => {
            newAssignments.push({
              team_id: currentTeamId,
              coach_id: staff.id,
              coach_name: staff.name,
              group_name,
              day_of_week: day,
              effective_date: new Date().toISOString().split('T')[0],
              created_by: user?.id || null,
              updated_at: new Date().toISOString()
            });
          });
        }
      });

      if (newAssignments.length > 0) {
        const { error } = await supabase
          .from('coach_group_assignments')
          .insert(newAssignments);
        if (error) throw error;
      }

      await loadData();
      setShowAssignmentModal(false);
      setAssigningStaff(null);
    } catch (error) {
      console.error('Error saving assignments:', error);
      alert(`Failed to save assignments: ${error?.message || 'Unknown error'}`);
    }
  };

  // Save override
  const handleSaveOverride = async (formData) => {
    try {
      const currentTeamId = await ensureTeamId();
      const { data: { user } } = await supabase.auth.getUser();

      const overrideData = {
        team_id: currentTeamId,
        override_date: formData.override_date,
        group_name: formData.group_name,
        override_type: formData.override_type,
        original_coach_id: formData.original_coach_id || null,
        replacement_coach_id: formData.replacement_coach_id || null,
        reason: formData.reason || null,
        created_by: user?.id || null
      };

      const { error } = await supabase
        .from('coach_assignment_overrides')
        .insert([overrideData]);

      if (error) throw error;

      await loadData();
      setShowOverrideModal(false);
    } catch (error) {
      console.error('Error saving override:', error);
      alert('Failed to save override');
    }
  };

  // Delete staff member
  const handleDeleteStaff = async (staff) => {
    if (!confirm(`Remove ${staff.name} from staff list?`)) return;

    try {
      const currentTeamId = await ensureTeamId();
      await supabase
        .from('coach_group_assignments')
        .delete()
        .eq('coach_id', staff.id)
        .eq('team_id', currentTeamId);

      const { error } = await supabase
        .from('staff_members')
        .update({ is_active: false })
        .eq('id', staff.id)
        .eq('team_id', currentTeamId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error removing staff:', error);
      alert('Failed to remove staff member');
    }
  };

  // Get assignments for a staff member
  const getStaffAssignments = (staffId) => {
    const staffAssigns = assignments.filter(a => a.coach_id === staffId);
    const groupMap = {};
    staffAssigns.forEach(a => {
      if (!groupMap[a.group_name]) {
        groupMap[a.group_name] = { days: [], allDays: false };
      }
      if (a.day_of_week === null || a.day_of_week === undefined) {
        groupMap[a.group_name].allDays = true;
      } else {
        groupMap[a.group_name].days.push(a.day_of_week);
      }
    });
    return groupMap;
  };

  // Get coaches assigned to a group
  const getGroupCoaches = (groupName) => {
    return assignments
      .filter(a => a.group_name === groupName)
      .map(a => staffMembers.find(s => s.id === a.coach_id))
      .filter(Boolean)
      .filter((coach, idx, arr) => arr.findIndex(c => c.id === coach.id) === idx);
  };

  // Navigation
  const goToPrevWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() - 7);
    setWeekStart(newStart);
  };

  const goToNextWeek = () => {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + 7);
    setWeekStart(newStart);
  };

  const goToThisWeek = () => {
    const d = new Date();
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    setWeekStart(d);
  };

  const weekLabel = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
    if (startMonth === endMonth) {
      return `${startMonth} ${weekStart.getDate()} - ${end.getDate()}, ${weekStart.getFullYear()}`;
    }
    return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${end.getDate()}, ${weekStart.getFullYear()}`;
  }, [weekStart]);

  // Count upcoming overrides
  const upcomingOverrides = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return overrides.filter(o => o.override_date >= today).length;
  }, [overrides]);

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
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Schedule</h1>
            <p className="text-slate-500 text-sm">
              Set recurring coaching schedules and manage per-day changes
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowOverrideModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl hover:bg-amber-100 transition text-sm font-medium"
            >
              <CalendarOff size={16} />
              <span className="hidden md:inline">Override</span>
              {upcomingOverrides > 0 && (
                <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {upcomingOverrides}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setEditingStaff(null);
                setShowStaffModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition text-sm"
            >
              <UserPlus size={16} />
              <span className="hidden md:inline">Add Staff</span>
            </button>
          </div>
        </div>

        {/* Schedule Section Navigation */}
        {onScheduleNavigate && (
          <div className="mb-4">
            <ScheduleSubNav activeSection="coaches" onNavigate={onScheduleNavigate} />
          </div>
        )}

        {/* View Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('staff')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'staff' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Users size={14} className="inline mr-2" />
              Staff & Groups
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                viewMode === 'weekly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar size={14} className="inline mr-2" />
              Weekly View
            </button>
          </div>

          {/* Week navigation (only in weekly view) */}
          {viewMode === 'weekly' && (
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={goToPrevWeek} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                <ChevronLeft size={18} className="text-slate-600" />
              </button>
              <span className="text-sm font-semibold text-slate-700 min-w-[180px] text-center">{weekLabel}</span>
              <button onClick={goToNextWeek} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
                <ChevronRight size={18} className="text-slate-600" />
              </button>
              <button
                onClick={goToThisWeek}
                className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition border border-blue-200"
              >
                This Week
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        {viewMode === 'staff' ? (
          /* ============================================ */
          /* STAFF & GROUPS VIEW                          */
          /* ============================================ */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Staff List */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h2 className="font-bold text-slate-800">Staff Members</h2>
                <p className="text-sm text-slate-500">{staffMembers.length} active</p>
              </div>

              {staffMembers.length === 0 ? (
                <div className="p-8 text-center">
                  <User size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Staff Added</h3>
                  <p className="text-slate-500 mb-4">Add coaches and staff to assign them to groups</p>
                  <button
                    onClick={() => {
                      setEditingStaff(null);
                      setShowStaffModal(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                  >
                    <UserPlus size={18} />
                    Add First Staff Member
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {staffMembers.map(staff => {
                    const staffAssignments = getStaffAssignments(staff.id);
                    const groupNames = Object.keys(staffAssignments);

                    return (
                      <div key={staff.id} className="p-4 hover:bg-slate-50 transition">
                        <div className="flex items-center gap-3">
                          <StaffAvatar staff={staff} size="lg" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-slate-800">{staff.name}</h3>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                staff.role === 'head_coach'
                                  ? 'bg-blue-100 text-blue-700'
                                  : staff.role === 'age_group_coach'
                                    ? 'bg-purple-100 text-purple-700'
                                    : staff.role === 'assistant'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-100 text-slate-600'
                              }`}>
                                {formatRole(staff.role)}
                              </span>
                            </div>
                            {/* Show group assignments with day info */}
                            <div className="text-sm text-slate-500 mt-1">
                              {groupNames.length > 0 ? (
                                groupNames.map((group, idx) => {
                                  const info = staffAssignments[group];
                                  const dayLabel = info.allDays
                                    ? 'all days'
                                    : info.days.map(d => DAYS[d]).join(', ');
                                  return (
                                    <span key={group}>
                                      {idx > 0 && ' · '}
                                      <span className="font-medium text-slate-600">{group}</span>
                                      <span className="text-slate-400 text-xs ml-1">({dayLabel})</span>
                                    </span>
                                  );
                                })
                              ) : (
                                'No groups assigned'
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setAssigningStaff(staff);
                                setShowAssignmentModal(true);
                              }}
                              className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition"
                              title="Set recurring assignments"
                            >
                              <Repeat size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setEditingStaff(staff);
                                setShowStaffModal(true);
                              }}
                              className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 transition"
                              title="Edit"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staff)}
                              className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition"
                              title="Remove"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Groups Overview */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h2 className="font-bold text-slate-800">Practice Groups</h2>
                <p className="text-sm text-slate-500">{groups.length} groups</p>
              </div>

              {groups.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No Groups Set Up</h3>
                  <p className="text-slate-500">
                    Set up practice schedules first to see groups here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {groups.map(groupName => {
                    const coaches = getGroupCoaches(groupName);
                    const groupSchedules = practiceSchedules.filter(s => s.group_name === groupName);
                    const practiceDays = [...new Set(groupSchedules.map(s => s.day_of_week))].sort();

                    return (
                      <div key={groupName} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold text-slate-800">{groupName}</h3>
                          <div className="flex items-center gap-1">
                            {coaches.length > 0 ? (
                              <>
                                {coaches.slice(0, 3).map((coach, idx) => (
                                  <div key={coach.id} className={idx > 0 ? '-ml-2' : ''} style={{ zIndex: 3 - idx }}>
                                    <StaffAvatar staff={coach} size="sm" />
                                  </div>
                                ))}
                                {coaches.length > 3 && (
                                  <span className="text-xs text-slate-500 ml-1">+{coaches.length - 3}</span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No coach assigned</span>
                            )}
                          </div>
                        </div>

                        {/* Practice days with times */}
                        <div className="flex flex-wrap gap-1.5">
                          {practiceDays.map(day => {
                            const slotsForDay = groupSchedules.filter(s => s.day_of_week === day);
                            return (
                              <div
                                key={day}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs"
                              >
                                <span className="font-semibold">{DAYS[day]}</span>
                                <span className="text-blue-500">
                                  {slotsForDay.map(s => formatTimeOfDay(s.start_time)).join(', ')}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Coaches with their days */}
                        {coaches.length > 0 && (
                          <div className="text-sm text-slate-500 mt-2">
                            {coaches.map(c => {
                              const coachAssigns = assignments.filter(
                                a => a.coach_id === c.id && a.group_name === groupName
                              );
                              const hasDaySpecific = coachAssigns.some(a => a.day_of_week !== null && a.day_of_week !== undefined);
                              const daysList = hasDaySpecific
                                ? coachAssigns.filter(a => a.day_of_week !== null).map(a => DAYS[a.day_of_week]).join(', ')
                                : 'all days';
                              return (
                                <div key={c.id} className="flex items-center gap-1.5">
                                  <span className="font-medium text-slate-600">{c.name}</span>
                                  <span className="text-slate-400 text-xs">({daysList})</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* ============================================ */
          /* WEEKLY VIEW                                  */
          /* ============================================ */
          <div className="space-y-6">
            <WeeklyOverviewGrid
              groups={groups}
              staffMembers={staffMembers}
              assignments={assignments}
              practiceSchedules={practiceSchedules}
              overrides={overrides}
              weekStart={weekStart}
              onEditOverride={(groupName, date) => {
                setShowOverrideModal(true);
              }}
            />

            {/* Upcoming Overrides */}
            {overrides.filter(o => o.override_date >= new Date().toISOString().split('T')[0]).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <CalendarOff size={20} className="text-amber-500" />
                  Upcoming Overrides
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {overrides
                    .filter(o => o.override_date >= new Date().toISOString().split('T')[0])
                    .slice(0, 9)
                    .map(override => {
                      const originalCoach = staffMembers.find(s => s.id === override.original_coach_id);
                      const replacementCoach = staffMembers.find(s => s.id === override.replacement_coach_id);

                      return (
                        <div
                          key={override.id}
                          className={`p-3 rounded-lg border ${
                            override.override_type === 'absent'
                              ? 'bg-red-50 border-red-200'
                              : override.override_type === 'substitute'
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-green-50 border-green-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-sm">
                              {new Date(override.override_date + 'T00:00:00').toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric'
                              })}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              override.override_type === 'absent'
                                ? 'bg-red-100 text-red-700'
                                : override.override_type === 'substitute'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-green-100 text-green-700'
                            }`}>
                              {override.override_type}
                            </span>
                          </div>
                          <div className="text-sm text-slate-700 font-medium">{override.group_name}</div>
                          {originalCoach && (
                            <div className="text-xs text-slate-500 mt-1">
                              {override.override_type === 'absent' ? 'Absent: ' : 'Replaced: '}
                              {originalCoach.name}
                            </div>
                          )}
                          {replacementCoach && (
                            <div className="text-xs text-emerald-600 mt-0.5">
                              Covering: {replacementCoach.name}
                            </div>
                          )}
                          {override.reason && (
                            <div className="text-xs text-slate-400 mt-1 italic">{override.reason}</div>
                          )}
                          <button
                            onClick={async () => {
                              if (confirm('Remove this override?')) {
                                await supabase.from('coach_assignment_overrides').delete().eq('id', override.id);
                                loadData();
                              }
                            }}
                            className="mt-2 text-xs text-red-500 hover:text-red-700 transition"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Repeat size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How Recurring Assignments Work</p>
            <p>
              Set which coaches teach which groups on which days. These repeat every week automatically.
              Use the <span className="font-semibold">Override</span> button to make one-time changes
              (coach sick, vacation, substitute). Overrides only affect a single date without changing
              the recurring schedule. Switch to <span className="font-semibold">Weekly View</span> to
              see the full picture including any overrides.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StaffModal
        isOpen={showStaffModal}
        onClose={() => {
          setShowStaffModal(false);
          setEditingStaff(null);
        }}
        onSave={handleSaveStaff}
        staff={editingStaff}
        existingNames={staffMembers.map(s => s.name)}
      />

      <AssignmentModal
        isOpen={showAssignmentModal}
        onClose={() => {
          setShowAssignmentModal(false);
          setAssigningStaff(null);
        }}
        onSave={handleSaveAssignments}
        staff={assigningStaff}
        groups={groups}
        existingAssignments={assignments}
        practiceSchedules={practiceSchedules}
      />

      <OverrideModal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        onSave={handleSaveOverride}
        groups={groups}
        staffMembers={staffMembers}
        existingOverrides={overrides}
      />
    </div>
  );
}
