import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabase';
import {
  ChevronLeft,
  Plus,
  GripVertical,
  Edit2,
  Trash2,
  Save,
  Printer,
  X,
  AlertCircle,
  Timer,
  BookOpen,
  Play,
  Repeat,
  Zap
} from 'lucide-react';

const STROKE_OPTIONS = ['free', 'back', 'breast', 'fly', 'IM', 'choice', 'drill', 'kick'];
const INTENSITY_OPTIONS = ['easy', 'moderate', 'fast', 'sprint', 'race_pace'];
const EQUIPMENT_OPTIONS = ['fins', 'paddles', 'snorkel', 'kickboard', 'pull_buoy', 'band'];
const SET_TYPES = ['warmup', 'pre_set', 'main_set', 'test_set', 'cooldown', 'dryland'];
const FOCUS_TAGS = ['aerobic', 'threshold', 'speed', 'technique', 'IM', 'sprint', 'distance', 'race_prep'];

import PracticeQuickEntry from './PracticeQuickEntry';

export default function PracticeBuilder({ practiceId, preFillData, onBack, onSave, onRunPractice, swimmers }) {
  const [practice, setPractice] = useState(null);
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddSet, setShowAddSet] = useState(false);
  const [showAddItem, setShowAddItem] = useState(null); // setId
  const [showPrint, setShowPrint] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showRecurringSchedule, setShowRecurringSchedule] = useState(false);
  const [viewMode, setViewMode] = useState('builder'); // 'builder' or 'quick-entry'

  useEffect(() => {
    if (practiceId) {
      loadPractice();
    } else {
      createNewPractice();
    }
  }, [practiceId]);

  // Generate title from schedule data
  const generateTitleFromSchedule = (scheduleData) => {
    if (!scheduleData) return 'Untitled Practice';
    
    const activityLabels = {
      'swim': 'Swim',
      'dryland': 'Dryland',
      'doubles_am': 'AM Swim',
      'doubles_pm': 'PM Swim',
      'am_swim': 'AM Swim',
      'pm_swim': 'PM Swim'
    };
    
    const dateObj = new Date(scheduleData.date + 'T00:00:00');
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const activityLabel = activityLabels[scheduleData.activityType] || 'Practice';
    
    return `${scheduleData.groupName} ${activityLabel} - ${dateStr}`;
  };

  const createNewPractice = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Use preFillData if provided
      const title = preFillData 
        ? generateTitleFromSchedule(preFillData)
        : 'Untitled Practice';
      
      const newPractice = {
        coach_id: user.id,
        created_by: user.id,
        title: title,
        description: preFillData?.groupName ? `Practice for ${preFillData.groupName}` : '',
        status: 'draft',
        focus_tags: [],
        total_yards: 0,
        // Add schedule-related fields if preFillData provided
        ...(preFillData && {
          scheduled_date: preFillData.date,
          scheduled_time: preFillData.startTime,
          training_group_id: preFillData.groupName
        })
      };

      const { data, error } = await supabase
        .from('practices')
        .insert([newPractice])
        .select()
        .single();

      if (error) throw error;
      
      setPractice(data);
      setSets([]);
      setLoading(false);
    } catch (error) {
      console.error('Error creating practice:', error);
      alert('Failed to create practice');
      onBack();
    }
  };

  const loadPractice = async () => {
    try {
      setLoading(true);

      // Load practice
      const { data: practiceData, error: practiceError } = await supabase
        .from('practices')
        .select('*')
        .eq('id', practiceId)
        .single();

      if (practiceError) throw practiceError;

      // Load sets and items
      const { data: setsData, error: setsError } = await supabase
        .from('practice_sets')
        .select(`
          *,
          practice_set_items(*)
        `)
        .eq('practice_id', practiceId)
        .order('order_index', { ascending: true });

      if (setsError) throw setsError;

      // Sort items within each set
      const setsWithSortedItems = setsData.map(set => ({
        ...set,
        practice_set_items: set.practice_set_items?.sort((a, b) => a.order_index - b.order_index) || []
      }));

      setPractice(practiceData);
      setSets(setsWithSortedItems);
    } catch (error) {
      console.error('Error loading practice:', error);
      alert('Failed to load practice');
      onBack();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePractice = async (updates) => {
    try {
      const { error } = await supabase
        .from('practices')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', practice.id);

      if (error) {
        console.error('Error updating practice:', error);
        // Show user-friendly error for common issues
        if (error.message.includes('invalid input syntax for type bigint')) {
          alert('⚠️ Database Update Needed!\n\nThe Training Group field needs to be updated in your database.\n\nPlease run this in Supabase SQL Editor:\n\nALTER TABLE practices ALTER COLUMN training_group_id TYPE VARCHAR(100) USING training_group_id::VARCHAR;\n\nSee PRACTICE_SCHEMA_UPDATE.md for details.');
        } else {
          alert('Error saving practice: ' + error.message);
        }
        throw error;
      }

      setPractice(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error updating practice:', error);
    }
  };

  const handleAddSet = async (setType) => {
    try {
      const newSet = {
        practice_id: practice.id,
        name: setType.charAt(0).toUpperCase() + setType.slice(1).replace('_', ' '),
        set_type: setType,
        order_index: sets.length,
        is_test_set: setType === 'test_set',
        total_yards: 0
      };

      const { data, error } = await supabase
        .from('practice_sets')
        .insert([newSet])
        .select()
        .single();

      if (error) throw error;

      setSets(prev => [...prev, { ...data, practice_set_items: [] }]);
      setShowAddSet(false);
    } catch (error) {
      console.error('Error adding set:', error);
      alert('Failed to add set');
    }
  };

  const handleDeleteSet = async (setId) => {
    if (!confirm('Delete this set and all its items?')) return;

    try {
      const { error } = await supabase
        .from('practice_sets')
        .delete()
        .eq('id', setId);

      if (error) throw error;

      setSets(prev => prev.filter(s => s.id !== setId));
      
      // Reload practice to update total yards
      loadPractice();
    } catch (error) {
      console.error('Error deleting set:', error);
      alert('Failed to delete set');
    }
  };

  const handleAddItem = async (setId, itemData) => {
    try {
      const set = sets.find(s => s.id === setId);
      const newItem = {
        set_id: setId,
        order_index: set.practice_set_items?.length || 0,
        ...itemData
      };

      const { data, error } = await supabase
        .from('practice_set_items')
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setSets(prev => prev.map(s => {
        if (s.id === setId) {
          return {
            ...s,
            practice_set_items: [...(s.practice_set_items || []), data]
          };
        }
        return s;
      }));

      setShowAddItem(null);
      
      // Reload to get updated totals
      setTimeout(() => loadPractice(), 500);
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    }
  };

  const handleUpdateItem = async (itemId, updates) => {
    try {
      const { error } = await supabase
        .from('practice_set_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      // Update local state
      setSets(prev => prev.map(set => ({
        ...set,
        practice_set_items: set.practice_set_items?.map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        )
      })));

      setEditingItem(null);
      
      // Reload to get updated totals
      setTimeout(() => loadPractice(), 500);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Failed to update item');
    }
  };

  const handleDeleteItem = async (setId, itemId) => {
    if (!confirm('Delete this set item?')) return;

    try {
      const { error } = await supabase
        .from('practice_set_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setSets(prev => prev.map(s => {
        if (s.id === setId) {
          return {
            ...s,
            practice_set_items: s.practice_set_items.filter(item => item.id !== itemId)
          };
        }
        return s;
      }));

      // Reload to get updated totals
      setTimeout(() => loadPractice(), 500);
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const handleSaveAndClose = async () => {
    setSaving(true);
    // Wait a moment for any pending updates
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    onBack();
  };

  const handleSaveAsTemplate = async () => {
    const name = prompt('Enter template name:');
    if (!name) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const template = {
        coach_id: user.id,
        created_by: user.id,
        name: name,
        description: practice.description,
        is_shared: false,
        category: practice.focus_tags || [],
        template_data: {
          practice: practice,
          sets: sets
        }
      };

      const { error } = await supabase
        .from('practice_templates')
        .insert([template]);

      if (error) throw error;

      alert('Template saved successfully!');
    } catch (error) {
      console.error('Error saving template:', error);
      alert('Failed to save template');
    }
  };

  // Calculate total time estimate (rough estimate: 1 yard = 1.5 seconds)
  const estimatedMinutes = useMemo(() => {
    if (!practice) return 0;
    return Math.round((practice.total_yards * 1.5) / 60);
  }, [practice?.total_yards]);

  // Calculate stroke breakdown
  const strokeBreakdown = useMemo(() => {
    const breakdown = {};
    sets.forEach(set => {
      set.practice_set_items?.forEach(item => {
        const yards = item.reps * item.distance;
        breakdown[item.stroke] = (breakdown[item.stroke] || 0) + yards;
      });
    });
    return breakdown;
  }, [sets]);

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  if (!practice) {
    return <div className="flex items-center justify-center h-full">Practice not found</div>;
  }

  // Quick Entry Mode View
  if (viewMode === 'quick-entry') {
    return (
      <PracticeQuickEntry
        practiceId={practice.id}
        practice={practice}
        onBack={onBack}
        onSwitchToBuilder={() => {
          setViewMode('builder');
          // Reload practice to see updates
          setTimeout(() => loadPractice(), 500);
        }}
      />
    );
  }

  // Builder Mode View
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-4 md:p-6 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 flex-1">
            <button onClick={handleSaveAndClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <ChevronLeft size={24} />
            </button>
            <input
              type="text"
              value={practice.title}
              onChange={(e) => handleUpdatePractice({ title: e.target.value })}
              className="text-2xl font-bold text-slate-900 border-0 focus:ring-0 p-0 bg-transparent flex-1"
              placeholder="Practice Title"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('quick-entry')}
              className="flex items-center gap-2 px-4 py-2 text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg text-sm font-bold hover:bg-yellow-100 transition-colors"
            >
              <Zap size={16} />
              <span className="hidden md:inline">Quick Entry</span>
            </button>
            {sets.length > 0 && (
              <button
                onClick={() => onRunPractice?.(practice.id)}
                className="flex items-center gap-2 px-4 py-2 text-white bg-emerald-600 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <Play size={16} />
                <span className="hidden md:inline">Run Practice</span>
              </button>
            )}
            <button
              onClick={handleSaveAsTemplate}
              className="flex items-center gap-2 px-4 py-2 text-purple-600 border border-purple-200 rounded-lg text-sm font-medium hover:bg-purple-50 transition-colors"
            >
              <BookOpen size={16} />
              <span className="hidden md:inline">Save as Template</span>
            </button>
            <button
              onClick={() => setShowPrint(true)}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              <Printer size={16} />
              <span className="hidden md:inline">Print</span>
            </button>
            <button
              onClick={handleSaveAndClose}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Save size={16} />
              {saving ? 'Saving...' : 'Save & Close'}
            </button>
          </div>
        </div>

        {/* Practice Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Training Group</label>
            <select
              value={practice.training_group_id || ''}
              onChange={(e) => handleUpdatePractice({ training_group_id: e.target.value || null })}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Groups</option>
              {[...new Set(swimmers?.map(s => s.group_name).filter(Boolean))].map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Date</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={practice.scheduled_date || ''}
                onChange={(e) => handleUpdatePractice({ scheduled_date: e.target.value })}
                className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={() => setShowRecurringSchedule(true)}
                className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="Set up recurring schedule"
              >
                <Repeat size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Time</label>
            <input
              type="time"
              value={practice.scheduled_time || ''}
              onChange={(e) => handleUpdatePractice({ scheduled_time: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-500 font-medium mb-1 block">Status</label>
            <select
              value={practice.status}
              onChange={(e) => handleUpdatePractice({ status: e.target.value })}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
        </div>

        {/* Focus Tags */}
        <div className="mt-4">
          <label className="text-xs text-slate-500 font-medium mb-2 block">Focus Tags</label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_TAGS.map(tag => {
              const isSelected = practice.focus_tags?.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => {
                    const newTags = isSelected
                      ? practice.focus_tags.filter(t => t !== tag)
                      : [...(practice.focus_tags || []), tag];
                    handleUpdatePractice({ focus_tags: newTags });
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sets Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-32">
        <div className="max-w-5xl mx-auto space-y-6">
          {sets.map((set, setIndex) => (
            <SetCard
              key={set.id}
              set={set}
              onDelete={() => handleDeleteSet(set.id)}
              onAddItem={() => setShowAddItem(set.id)}
              onEditItem={(item) => setEditingItem(item)}
              onDeleteItem={(itemId) => handleDeleteItem(set.id, itemId)}
            />
          ))}

          {/* Add Set Button */}
          <button
            onClick={() => setShowAddSet(true)}
            className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 font-bold"
          >
            <Plus size={20} />
            Add Set
          </button>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="bg-white border-t border-slate-200 p-4 md:p-6 shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-slate-500 font-medium">Total Yardage</div>
                <div className="text-2xl font-bold text-slate-900">{practice.total_yards}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Est. Time</div>
                <div className="text-2xl font-bold text-slate-900">{estimatedMinutes} min</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">Sets</div>
                <div className="text-2xl font-bold text-slate-900">{sets.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {Object.entries(strokeBreakdown).map(([stroke, yards]) => (
                <div key={stroke} className="bg-slate-100 px-3 py-1 rounded-full">
                  <span className="font-bold text-slate-900">{stroke}</span>
                  <span className="text-slate-500 ml-1">{yards}y</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Set Modal */}
      {showAddSet && (
        <AddSetModal
          onAdd={handleAddSet}
          onClose={() => setShowAddSet(false)}
        />
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <AddItemModal
          onAdd={(itemData) => handleAddItem(showAddItem, itemData)}
          onClose={() => setShowAddItem(null)}
        />
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onSave={(updates) => handleUpdateItem(editingItem.id, updates)}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Print View */}
      {showPrint && (
        <PrintView
          practice={practice}
          sets={sets}
          onClose={() => setShowPrint(false)}
        />
      )}

      {/* Recurring Schedule Modal */}
      {showRecurringSchedule && (
        <RecurringScheduleModal
          practice={practice}
          sets={sets}
          onClose={() => setShowRecurringSchedule(false)}
          onSchedule={(count) => {
            alert(`Successfully scheduled ${count} recurring practices!`);
            setShowRecurringSchedule(false);
          }}
        />
      )}
    </div>
  );
}

// Set Card Component
function SetCard({ set, onDelete, onAddItem, onEditItem, onDeleteItem }) {
  const setTypeColors = {
    warmup: 'bg-blue-50 border-blue-200',
    pre_set: 'bg-purple-50 border-purple-200',
    main_set: 'bg-emerald-50 border-emerald-200',
    test_set: 'bg-orange-50 border-orange-200',
    cooldown: 'bg-slate-50 border-slate-200',
    dryland: 'bg-yellow-50 border-yellow-200'
  };

  return (
    <div className={`border-2 rounded-xl p-6 ${setTypeColors[set.set_type] || 'bg-white border-slate-200'}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <GripVertical size={20} className="text-slate-400 cursor-move" />
          <div>
            <h3 className="text-lg font-bold text-slate-900">{set.name}</h3>
            <div className="text-sm text-slate-500">
              {set.total_yards} yards
              {set.is_test_set && (
                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                  <Timer size={12} />
                  TEST SET
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={onDelete}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {set.is_test_set && (
        <div className="mb-4 p-3 bg-orange-100 border border-orange-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="text-orange-600 mt-0.5" />
            <div className="text-xs text-orange-800">
              <p className="font-bold">Test Set Integration</p>
              <p>When you reach this set, you can launch the Test Set Tracker with pre-configured settings.</p>
            </div>
          </div>
        </div>
      )}

      {/* Items */}
      {set.practice_set_items && set.practice_set_items.length > 0 ? (
        <div className="space-y-2 mb-4">
          {set.practice_set_items.map((item) => (
            <SetItemRow
              key={item.id}
              item={item}
              onEdit={() => onEditItem(item)}
              onDelete={() => onDeleteItem(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400 text-sm">
          No items yet. Add your first set item.
        </div>
      )}

      <button
        onClick={onAddItem}
        className="w-full border-2 border-dashed border-slate-300 rounded-lg p-3 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-white transition-colors flex items-center justify-center gap-2 text-sm font-bold"
      >
        <Plus size={16} />
        Add Item
      </button>
    </div>
  );
}

// Set Item Row Component
function SetItemRow({ item, onEdit, onDelete }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between hover:border-blue-300 transition-colors group">
      <div className="flex items-center gap-3 flex-1">
        <div className="font-mono font-bold text-slate-900">
          {item.reps} x {item.distance}
        </div>
        <div className="text-sm text-slate-600">
          {item.stroke.charAt(0).toUpperCase() + item.stroke.slice(1)}
        </div>
        {item.interval && (
          <div className="text-sm text-blue-600 font-medium">
            @ {item.interval}
          </div>
        )}
        {item.description && (
          <div className="text-sm text-slate-500 truncate">
            {item.description}
          </div>
        )}
        {item.equipment && item.equipment.length > 0 && (
          <div className="flex gap-1">
            {item.equipment.map((eq, idx) => (
              <span key={idx} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {eq}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onEdit} className="p-1 text-slate-400 hover:text-blue-600">
          <Edit2 size={16} />
        </button>
        <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-600">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

// Add Set Modal
function AddSetModal({ onAdd, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Add Set</h3>
        <div className="grid grid-cols-2 gap-3">
          {SET_TYPES.map(type => (
            <button
              key={type}
              onClick={() => onAdd(type)}
              className="p-4 border-2 border-slate-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors text-center"
            >
              <div className="font-bold text-slate-900">
                {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// Add Item Modal
function AddItemModal({ onAdd, onClose }) {
  const [formData, setFormData] = useState({
    reps: 1,
    distance: 100,
    stroke: 'free',
    description: '',
    interval: '',
    equipment: [],
    intensity: 'moderate',
    notes: ''
  });

  const handleSubmit = () => {
    if (!formData.reps || !formData.distance) {
      alert('Please enter reps and distance');
      return;
    }
    onAdd(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Add Set Item</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Reps</label>
            <input
              type="number"
              value={formData.reps}
              onChange={(e) => setFormData({ ...formData, reps: parseInt(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
              min="1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Distance (yards)</label>
            <input
              type="number"
              value={formData.distance}
              onChange={(e) => setFormData({ ...formData, distance: parseInt(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
              min="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Stroke</label>
            <select
              value={formData.stroke}
              onChange={(e) => setFormData({ ...formData, stroke: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
            >
              {STROKE_OPTIONS.map(stroke => (
                <option key={stroke} value={stroke}>
                  {stroke.charAt(0).toUpperCase() + stroke.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Interval / Rest</label>
            <input
              type="text"
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
              placeholder="e.g., 1:30 or :15 rest"
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g., descend 1-4, build by 25"
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Equipment</label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map(eq => (
              <button
                key={eq}
                onClick={() => {
                  const newEquipment = formData.equipment.includes(eq)
                    ? formData.equipment.filter(e => e !== eq)
                    : [...formData.equipment, eq];
                  setFormData({ ...formData, equipment: newEquipment });
                }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  formData.equipment.includes(eq)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {eq}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Intensity</label>
          <div className="flex gap-2">
            {INTENSITY_OPTIONS.map(intensity => (
              <button
                key={intensity}
                onClick={() => setFormData({ ...formData, intensity })}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  formData.intensity === intensity
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {intensity.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            Add Item
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Item Modal (similar to Add but pre-filled)
function EditItemModal({ item, onSave, onClose }) {
  const [formData, setFormData] = useState({
    reps: item.reps,
    distance: item.distance,
    stroke: item.stroke,
    description: item.description || '',
    interval: item.interval || '',
    equipment: item.equipment || [],
    intensity: item.intensity || 'moderate',
    notes: item.notes || ''
  });

  const handleSubmit = () => {
    if (!formData.reps || !formData.distance) {
      alert('Please enter reps and distance');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Edit Set Item</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Reps</label>
            <input
              type="number"
              value={formData.reps}
              onChange={(e) => setFormData({ ...formData, reps: parseInt(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
              min="1"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Distance (yards)</label>
            <input
              type="number"
              value={formData.distance}
              onChange={(e) => setFormData({ ...formData, distance: parseInt(e.target.value) })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
              min="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Stroke</label>
            <select
              value={formData.stroke}
              onChange={(e) => setFormData({ ...formData, stroke: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
            >
              {STROKE_OPTIONS.map(stroke => (
                <option key={stroke} value={stroke}>
                  {stroke.charAt(0).toUpperCase() + stroke.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Interval / Rest</label>
            <input
              type="text"
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
              placeholder="e.g., 1:30 or :15 rest"
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g., descend 1-4, build by 25"
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
          />
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Equipment</label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENT_OPTIONS.map(eq => (
              <button
                key={eq}
                onClick={() => {
                  const newEquipment = formData.equipment.includes(eq)
                    ? formData.equipment.filter(e => e !== eq)
                    : [...formData.equipment, eq];
                  setFormData({ ...formData, equipment: newEquipment });
                }}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  formData.equipment.includes(eq)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {eq}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Intensity</label>
          <div className="flex gap-2">
            {INTENSITY_OPTIONS.map(intensity => (
              <button
                key={intensity}
                onClick={() => setFormData({ ...formData, intensity })}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  formData.intensity === intensity
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {intensity.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Recurring Schedule Modal Component
function RecurringScheduleModal({ practice, sets, onClose, onSchedule }) {
  const [scheduleType, setScheduleType] = useState('weekly');
  const [selectedDays, setSelectedDays] = useState([]);
  const [startDate, setStartDate] = useState(practice.scheduled_date || '');
  const [endType, setEndType] = useState('occurrences');
  const [occurrences, setOccurrences] = useState(8);
  const [endDate, setEndDate] = useState('');
  const [skipDates, setSkipDates] = useState([]);
  const [newSkipDate, setNewSkipDate] = useState('');
  const [scheduling, setScheduling] = useState(false);

  const DAYS = [
    { id: 1, label: 'Mon', name: 'Monday' },
    { id: 2, label: 'Tue', name: 'Tuesday' },
    { id: 3, label: 'Wed', name: 'Wednesday' },
    { id: 4, label: 'Thu', name: 'Thursday' },
    { id: 5, label: 'Fri', name: 'Friday' },
    { id: 6, label: 'Sat', name: 'Saturday' },
    { id: 0, label: 'Sun', name: 'Sunday' }
  ];

  const toggleDay = (dayId) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter(d => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const addSkipDate = () => {
    if (newSkipDate && !skipDates.includes(newSkipDate)) {
      setSkipDates([...skipDates, newSkipDate]);
      setNewSkipDate('');
    }
  };

  const removeSkipDate = (date) => {
    setSkipDates(skipDates.filter(d => d !== date));
  };

  const handleSchedule = async () => {
    if (selectedDays.length === 0) {
      alert('Please select at least one day');
      return;
    }

    if (!startDate) {
      alert('Please select a start date');
      return;
    }

    setScheduling(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const practicesToCreate = [];
      
      let currentDate = new Date(startDate + 'T00:00:00');
      let count = 0;
      const maxCount = endType === 'occurrences' ? occurrences : 100; // Safety limit

      while (count < maxCount) {
        const dayOfWeek = currentDate.getDay();
        
        // Check if this day is selected
        if (selectedDays.includes(dayOfWeek)) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          // Check if this date should be skipped
          if (!skipDates.includes(dateStr)) {
            // Check end date condition
            if (endType === 'date' && endDate && dateStr > endDate) {
              break;
            }

            // Create practice copy
            const newPractice = {
              coach_id: user.id,
              created_by: user.id,
              title: practice.title,
              description: practice.description,
              training_group_id: practice.training_group_id,
              scheduled_date: dateStr,
              scheduled_time: practice.scheduled_time,
              status: 'scheduled',
              focus_tags: practice.focus_tags,
              total_yards: practice.total_yards
            };

            practicesToCreate.push({ practice: newPractice, sets: sets });
            count++;
          }
        }

        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);

        // Safety check for infinite loop
        if (currentDate > new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)) {
          break; // Don't schedule more than 1 year out
        }
      }

      // Insert all practices
      for (const { practice: newPractice, sets: practiceSets } of practicesToCreate) {
        const { data: practiceData, error: practiceError } = await supabase
          .from('practices')
          .insert([newPractice])
          .select()
          .single();

        if (practiceError) throw practiceError;

        // Copy sets and items
        for (const set of practiceSets) {
          const { practice_set_items, ...setData } = set;
          const newSet = {
            ...setData,
            id: undefined,
            practice_id: practiceData.id,
            created_at: undefined
          };

          const { data: setInsertData, error: setError } = await supabase
            .from('practice_sets')
            .insert([newSet])
            .select()
            .single();

          if (setError) throw setError;

          // Copy items
          if (practice_set_items && practice_set_items.length > 0) {
            const newItems = practice_set_items.map(item => ({
              set_id: setInsertData.id,
              order_index: item.order_index,
              reps: item.reps,
              distance: item.distance,
              stroke: item.stroke,
              description: item.description,
              interval: item.interval,
              equipment: item.equipment,
              intensity: item.intensity,
              notes: item.notes
            }));

            const { error: itemsError } = await supabase
              .from('practice_set_items')
              .insert(newItems);

            if (itemsError) throw itemsError;
          }
        }
      }

      onSchedule(practicesToCreate.length);
    } catch (error) {
      console.error('Error scheduling practices:', error);
      alert('Failed to schedule practices: ' + error.message);
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Schedule Recurring Practice</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Start Date */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2"
          />
        </div>

        {/* Days of Week */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Repeat On</label>
          <div className="grid grid-cols-7 gap-2">
            {DAYS.map(day => (
              <button
                key={day.id}
                onClick={() => toggleDay(day.id)}
                className={`py-3 rounded-lg text-sm font-bold transition-colors ${
                  selectedDays.includes(day.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* End Condition */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Ends</label>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                checked={endType === 'never'}
                onChange={() => setEndType('never')}
                className="w-4 h-4"
              />
              <span className="text-sm">Never</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                checked={endType === 'occurrences'}
                onChange={() => setEndType('occurrences')}
                className="w-4 h-4"
              />
              <span className="text-sm">After</span>
              <input
                type="number"
                value={occurrences}
                onChange={(e) => setOccurrences(parseInt(e.target.value))}
                disabled={endType !== 'occurrences'}
                className="w-20 border border-slate-200 rounded px-2 py-1 text-sm disabled:bg-slate-100"
                min="1"
                max="100"
              />
              <span className="text-sm">occurrences</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                checked={endType === 'date'}
                onChange={() => setEndType('date')}
                className="w-4 h-4"
              />
              <span className="text-sm">On date</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={endType !== 'date'}
                className="border border-slate-200 rounded px-2 py-1 text-sm disabled:bg-slate-100"
              />
            </label>
          </div>
        </div>

        {/* Skip Dates */}
        <div className="mb-6">
          <label className="text-sm font-medium text-slate-700 mb-2 block">Skip Dates (Holidays, Meet Days)</label>
          <div className="flex gap-2 mb-2">
            <input
              type="date"
              value={newSkipDate}
              onChange={(e) => setNewSkipDate(e.target.value)}
              className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="Select date to skip"
            />
            <button
              onClick={addSkipDate}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              Add
            </button>
          </div>
          {skipDates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skipDates.map(date => (
                <div
                  key={date}
                  className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-lg text-sm"
                >
                  <span>{new Date(date + 'T00:00:00').toLocaleDateString()}</span>
                  <button
                    onClick={() => removeSkipDate(date)}
                    className="text-slate-500 hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSchedule}
            disabled={scheduling || selectedDays.length === 0}
            className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {scheduling ? 'Scheduling...' : 'Schedule Practices'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-3 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Print View Component
function PrintView({ practice, sets, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Print Header - only show on screen */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <h2 className="text-2xl font-bold">Print Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Content */}
        <div className="print:p-0">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{practice.title}</h1>
            {practice.scheduled_date && (
              <p className="text-slate-600">
                {new Date(practice.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                {practice.scheduled_time && ` • ${practice.scheduled_time.substring(0, 5)}`}
              </p>
            )}
            {practice.description && (
              <p className="text-slate-600 mt-2">{practice.description}</p>
            )}
          </div>

          {/* Practice Summary */}
          <div className="border-t-2 border-b-2 border-slate-300 py-4 mb-6 flex justify-center gap-8">
            <div className="text-center">
              <div className="text-sm text-slate-600">Total Yardage</div>
              <div className="text-2xl font-bold">{practice.total_yards}</div>
            </div>
            {practice.focus_tags && practice.focus_tags.length > 0 && (
              <div className="text-center">
                <div className="text-sm text-slate-600">Focus</div>
                <div className="text-lg font-bold">{practice.focus_tags.join(', ')}</div>
              </div>
            )}
          </div>

          {/* Sets */}
          {sets.map((set, setIndex) => (
            <div key={set.id} className="mb-8 page-break-inside-avoid">
              <div className="bg-slate-100 px-4 py-2 rounded-t-lg">
                <h3 className="font-bold text-lg uppercase">{set.name}</h3>
                <p className="text-sm text-slate-600">{set.total_yards} yards</p>
              </div>
              <div className="border-2 border-slate-100 rounded-b-lg p-4">
                {set.practice_set_items && set.practice_set_items.length > 0 ? (
                  <div className="space-y-2">
                    {set.practice_set_items.map((item, itemIndex) => (
                      <div key={item.id} className="flex items-start gap-3 py-1">
                        <div className="font-mono font-bold text-slate-900 min-w-[80px]">
                          {item.reps} x {item.distance}
                        </div>
                        <div className="flex-1">
                          <span className="font-medium">{item.stroke.charAt(0).toUpperCase() + item.stroke.slice(1)}</span>
                          {item.interval && <span className="text-blue-600 ml-2">@ {item.interval}</span>}
                          {item.description && <span className="text-slate-600 ml-2">- {item.description}</span>}
                          {item.equipment && item.equipment.length > 0 && (
                            <span className="text-slate-500 ml-2">({item.equipment.join(', ')})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No items in this set</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { margin: 0; padding: 20px; }
          .print\\:hidden { display: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .page-break-inside-avoid { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

