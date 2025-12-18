// src/components/CoachAssignmentPicker.jsx
// Quick coach assignment picker for workout planner cells

import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { User, X, Check, Plus, Loader2 } from 'lucide-react';

export default function CoachAssignmentPicker({ 
  practiceId, 
  currentCoaches = [],
  onClose,
  onUpdate 
}) {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(new Set(currentCoaches.map(c => c.staff_id)));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_members')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStaff = (staffId) => {
    const newSelected = new Set(selectedStaff);
    if (newSelected.has(staffId)) {
      newSelected.delete(staffId);
    } else {
      newSelected.add(staffId);
    }
    setSelectedStaff(newSelected);
  };

  const handleSave = async () => {
    if (!practiceId) return;
    
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Remove all existing assignments
      await supabase
        .from('practice_coaches')
        .delete()
        .eq('practice_id', practiceId);

      // Add new assignments
      if (selectedStaff.size > 0) {
        const assignments = Array.from(selectedStaff).map(staffId => ({
          practice_id: practiceId,
          staff_id: staffId,
          assigned_by: user.id
        }));

        await supabase
          .from('practice_coaches')
          .insert(assignments);
      }

      // Notify parent of update
      if (onUpdate) {
        const assignedStaff = staff.filter(s => selectedStaff.has(s.id));
        onUpdate(assignedStaff);
      }

      onClose();
    } catch (err) {
      console.error('Error saving coach assignments:', err);
      alert('Failed to save coach assignments');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User size={20} className="text-blue-600" />
            <h3 className="font-bold text-slate-800">Assign Coaches</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : staff.length > 0 ? (
            <div className="space-y-2">
              {staff.map(member => {
                const isSelected = selectedStaff.has(member.id);
                return (
                  <button
                    key={member.id}
                    onClick={() => toggleStaff(member.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500'
                        : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                  >
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {member.initials || member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-slate-800">{member.name}</div>
                      <div className="text-xs text-slate-500">{member.role || 'Coach'}</div>
                    </div>

                    {/* Check */}
                    {isSelected && (
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check size={14} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <User size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-600 font-medium">No staff members found</p>
              <p className="text-slate-500 text-sm mt-1">Add staff members in settings</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={16} />
                Saving...
              </>
            ) : (
              'Save'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

