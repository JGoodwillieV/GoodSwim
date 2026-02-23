// src/components/RecordBoard.jsx
// Team Records Board - organized by age group, event, and gender

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Trophy, Loader2, Medal, Pencil, Check, X, Trash2 } from 'lucide-react';
import { useTeamRole } from '../hooks/useTeamRole';
import { timeToSeconds, secondsToTimeDisplay } from '../utils/teamRecordsManager';

const AGE_GROUPS = [
  '8 & Under',
  '9/10',
  '11/12',
  '13/14',
  '15 & Over'
];

const SCY_EVENTS_ORDER = [
  '25 Free', '25 Back', '25 Breast', '25 Fly',
  '50 Free', '50 Back', '50 Breast', '50 Fly',
  '100 Free', '100 Back', '100 Breast', '100 Fly', '100 IM',
  '200 Free', '200 Back', '200 Breast', '200 Fly', '200 IM',
  '400 IM',
  '500 Free',
  '1000 Free',
  '1650 Free'
];

const LCM_EVENTS_ORDER = [
  '50 Free', '50 Back', '50 Breast', '50 Fly',
  '100 Free', '100 Back', '100 Breast', '100 Fly',
  '200 Free', '200 Back', '200 Breast', '200 Fly', '200 IM',
  '400 Free', '400 IM',
  '800 Free',
  '1500 Free'
];

const EVENTS_BY_COURSE = {
  SCY: SCY_EVENTS_ORDER,
  LCM: LCM_EVENTS_ORDER,
  SCM: LCM_EVENTS_ORDER
};

export default function RecordBoard() {
  const { teamId } = useTeamRole();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAgeGroup, setSelectedAgeGroup] = useState('8 & Under');
  const [selectedCourse, setSelectedCourse] = useState('SCY');
  const [editingCell, setEditingCell] = useState(null);
  const [editForm, setEditForm] = useState({ swimmer_name: '', time_display: '', date: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (teamId) fetchRecords();
  }, [selectedCourse, teamId]);

  useEffect(() => {
    setEditingCell(null);
  }, [selectedAgeGroup, selectedCourse]);

  const fetchRecords = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_records')
        .select('*')
        .eq('team_id', teamId)
        .eq('course', selectedCourse)
        .order('event');

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error fetching records:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRecord = (event, ageGroup, gender) => {
    return records.find(
      r => r.event === event && r.age_group === ageGroup && r.gender === gender
    );
  };

  const startEdit = (event, gender) => {
    const record = getRecord(event, selectedAgeGroup, gender);
    setEditingCell({ event, gender });
    setEditForm({
      swimmer_name: record?.swimmer_name || '',
      time_display: record?.time_display || '',
      date: record?.date ? record.date.split('T')[0] : ''
    });
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditForm({ swimmer_name: '', time_display: '', date: '' });
  };

  const handleSave = async () => {
    if (!editingCell || !teamId) return;
    const { swimmer_name, time_display, date } = editForm;
    if (!swimmer_name.trim() || !time_display.trim() || !date) {
      alert('Please fill in all fields.');
      return;
    }

    const timeSeconds = timeToSeconds(time_display);
    if (timeSeconds >= 999999) {
      alert('Invalid time format. Use SS.ss or M:SS.ss');
      return;
    }

    setSaving(true);
    try {
      const recordData = {
        team_id: teamId,
        event: editingCell.event,
        age_group: selectedAgeGroup,
        gender: editingCell.gender,
        swimmer_name: swimmer_name.trim(),
        time_seconds: timeSeconds,
        time_display: secondsToTimeDisplay(timeSeconds),
        date,
        course: selectedCourse,
        updated_at: new Date().toISOString()
      };

      const existing = getRecord(editingCell.event, selectedAgeGroup, editingCell.gender);
      if (existing) {
        const { error } = await supabase.from('team_records').update(recordData).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('team_records').insert([recordData]);
        if (error) throw error;
      }

      cancelEdit();
      await fetchRecords();
    } catch (err) {
      console.error('Error saving record:', err);
      alert('Error saving record: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (event, gender) => {
    const existing = getRecord(event, selectedAgeGroup, gender);
    if (!existing) return;
    if (!confirm('Remove this record?')) return;

    try {
      const { error } = await supabase.from('team_records').delete().eq('id', existing.id);
      if (error) throw error;
      cancelEdit();
      await fetchRecords();
    } catch (err) {
      console.error('Error removing record:', err);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') cancelEdit();
  };

  const renderRecordCell = (event, gender, colorClass) => {
    const record = getRecord(event, selectedAgeGroup, gender);
    const isEditing = editingCell?.event === event && editingCell?.gender === gender;
    const medalColor = colorClass === 'pink' ? 'text-pink-500' : 'text-blue-500';
    const timeColor = colorClass === 'pink' ? 'text-pink-600' : 'text-blue-600';

    if (isEditing) {
      return (
        <div className="space-y-1.5 max-w-[180px] mx-auto" onClick={e => e.stopPropagation()}>
          <input
            type="text"
            placeholder="Swimmer name"
            value={editForm.swimmer_name}
            onChange={e => setEditForm(f => ({ ...f, swimmer_name: e.target.value }))}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            autoFocus
          />
          <input
            type="text"
            placeholder="Time (e.g. 1:05.23)"
            value={editForm.time_display}
            onChange={e => setEditForm(f => ({ ...f, time_display: e.target.value }))}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
          />
          <input
            type="date"
            value={editForm.date}
            onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-xs border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <div className="flex items-center justify-center gap-1 pt-0.5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
              title="Save"
            >
              <Check size={14} />
            </button>
            <button
              onClick={cancelEdit}
              className="p-1 text-slate-400 hover:bg-slate-100 rounded transition-colors"
              title="Cancel"
            >
              <X size={14} />
            </button>
            {record && (
              <button
                onClick={() => handleDelete(event, gender)}
                className="p-1 text-red-400 hover:bg-red-50 rounded transition-colors"
                title="Remove record"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      );
    }

    if (record) {
      return (
        <div
          className="space-y-1 relative group cursor-pointer"
          onClick={() => startEdit(event, gender)}
          title="Click to edit"
        >
          <div className="font-semibold text-slate-800 text-sm">
            {record.swimmer_name}
          </div>
          <div className="flex items-center justify-center gap-2">
            <Medal size={14} className={medalColor} />
            <span className={`font-bold ${timeColor}`}>
              {record.time_display}
            </span>
          </div>
          <div className="text-xs text-slate-500">
            {new Date(record.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </div>
          <Pencil
            size={10}
            className="absolute top-0 right-0 text-slate-300 group-hover:text-slate-500 transition-colors"
          />
        </div>
      );
    }

    return (
      <button
        onClick={() => startEdit(event, gender)}
        className="w-full text-slate-300 text-sm hover:text-blue-500 transition-colors flex items-center justify-center gap-1"
        title="Add record"
      >
        <span>—</span>
        <Pencil size={10} />
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  const eventsToShow = EVENTS_BY_COURSE[selectedCourse] || SCY_EVENTS_ORDER;

  return (
    <div className="p-4 md:p-8 overflow-y-auto h-full pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Trophy size={32} className="text-amber-500" />
              <h2 className="text-2xl font-bold text-slate-800">Team Record Board</h2>
            </div>
            <p className="text-slate-500">Current team records by age group and event</p>
          </div>
          {/* Course Selector */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            {['SCY', 'LCM'].map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCourse(c)}
                className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${
                  selectedCourse === c
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Age Group Selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {AGE_GROUPS.map(ageGroup => (
          <button
            key={ageGroup}
            onClick={() => setSelectedAgeGroup(ageGroup)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
              selectedAgeGroup === ageGroup
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {ageGroup}
          </button>
        ))}
      </div>

      {/* Record Board */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-pink-50 via-slate-50 to-blue-50 border-b border-slate-200">
          <div className="text-center font-bold text-pink-600">
            <div className="text-lg">♀ GIRLS</div>
            <div className="text-xs text-slate-500 mt-1">Name • Time • Date</div>
          </div>
          <div className="text-center font-bold text-slate-700">
            <div className="text-lg">EVENT</div>
            <div className="text-xs text-slate-500 mt-1">Distance & Stroke</div>
          </div>
          <div className="text-center font-bold text-blue-600">
            <div className="text-lg">BOYS ♂</div>
            <div className="text-xs text-slate-500 mt-1">Name • Time • Date</div>
          </div>
        </div>

        {/* Records */}
        <div className="divide-y divide-slate-100">
          {eventsToShow.map(event => (
            <div key={event} className="grid grid-cols-3 gap-4 p-4 hover:bg-slate-50 transition-colors">
              {/* Female Record */}
              <div className="text-center">
                {renderRecordCell(event, 'Female', 'pink')}
              </div>

              {/* Event Name */}
              <div className="flex items-center justify-center">
                <div className="px-4 py-2 bg-slate-100 rounded-lg">
                  <div className="font-bold text-slate-800">{event}</div>
                </div>
              </div>

              {/* Male Record */}
              <div className="text-center">
                {renderRecordCell(event, 'Male', 'blue')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center justify-center gap-8 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            <span>
              {selectedCourse === 'SCY' ? 'Short Course Yards (SCY)' : 
               selectedCourse === 'LCM' ? 'Long Course Meters (LCM)' : 
               'Short Course Meters (SCM)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Medal size={16} className="text-slate-400" />
            <span>{records.length} total records</span>
          </div>
        </div>
      </div>
    </div>
  );
}

