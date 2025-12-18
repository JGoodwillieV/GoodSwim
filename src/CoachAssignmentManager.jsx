// src/CoachAssignmentManager.jsx
// Allows head coaches to assign staff to practice groups
// Layer 3 of Practice Schedule feature

import React, { useState, useEffect, useMemo } from 'react';

// Helper function to format role for display
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
  Calendar, Edit2, Trash2, Save, AlertCircle, User
} from 'lucide-react';

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

// Staff Avatar Component
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

// Add/Edit Staff Modal
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

// Assignment Modal
function AssignmentModal({ isOpen, onClose, onSave, staff, groups, existingAssignments }) {
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (isOpen && staff) {
      // Pre-select groups this coach is already assigned to
      const assigned = existingAssignments
        .filter(a => a.coach_id === staff.id || a.staff_id === staff.id)
        .map(a => a.group_name);
      setSelectedGroups(assigned);
    }
  }, [isOpen, staff, existingAssignments]);
  
  if (!isOpen || !staff) return null;
  
  const toggleGroup = (groupName) => {
    setSelectedGroups(prev => 
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };
  
  const handleSave = async () => {
    setSaving(true);
    await onSave(staff, selectedGroups);
    setSaving(false);
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <StaffAvatar staff={staff} size="lg" />
              <div>
                <h3 className="font-bold text-slate-800">Assign Groups</h3>
                <p className="text-sm text-slate-600">{staff.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-emerald-100 rounded-lg transition">
              <X size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Select which practice groups {staff.name} will coach:
          </p>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="text-slate-400 text-center py-4">
                No practice groups set up yet
              </p>
            ) : (
              groups.map(group => (
                <button
                  key={group}
                  onClick={() => toggleGroup(group)}
                  className={`w-full p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                    selectedGroups.includes(group)
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="font-medium text-slate-700">{group}</span>
                  {selectedGroups.includes(group) && (
                    <Check size={18} className="text-emerald-600" />
                  )}
                </button>
              ))
            )}
          </div>
          
          <div className="flex gap-3 pt-4 mt-4 border-t border-slate-100">
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
              Save Assignments
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main Component
export default function CoachAssignmentManager({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [staffMembers, setStaffMembers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [assigningStaff, setAssigningStaff] = useState(null);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    try {
      // Load staff members
      const { data: staffData, error: staffError } = await supabase
        .from('staff_members')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (staffError && staffError.code !== 'PGRST116') {
        console.error('Error loading staff:', staffError);
      }
      
      // Load assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('coach_group_assignments')
        .select('*')
        .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`);
      
      if (assignmentsError && assignmentsError.code !== 'PGRST116') {
        console.error('Error loading assignments:', assignmentsError);
      }
      
      // Load practice groups from schedules
      const { data: schedulesData, error: schedulesError } = await supabase
        .from('practice_schedules')
        .select('group_name')
        .order('group_name');
      
      if (schedulesError) {
        console.error('Error loading schedules:', schedulesError);
      }
      
      setStaffMembers(staffData || []);
      setAssignments(assignmentsData || []);
      
      // Extract unique groups
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
      if (editingStaff) {
        // Update existing
        const { error } = await supabase
          .from('staff_members')
          .update({
            ...staffData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingStaff.id);
        
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('staff_members')
          .insert([staffData]);
        
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
  
  // Save assignments
  const handleSaveAssignments = async (staff, selectedGroups) => {
    try {
      // Delete existing assignments for this staff member
      await supabase
        .from('coach_group_assignments')
        .delete()
        .eq('coach_id', staff.id);
      
      // Insert new assignments
      if (selectedGroups.length > 0) {
        const newAssignments = selectedGroups.map(groupName => ({
          coach_id: staff.id,
          coach_name: staff.name,
          group_name: groupName,
          effective_date: new Date().toISOString().split('T')[0]
        }));
        
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
      alert('Failed to save assignments');
    }
  };
  
  // Delete staff member
  const handleDeleteStaff = async (staff) => {
    if (!confirm(`Remove ${staff.name} from staff list?`)) return;
    
    try {
      // Delete assignments first
      await supabase
        .from('coach_group_assignments')
        .delete()
        .eq('coach_id', staff.id);
      
      // Deactivate staff member (soft delete)
      const { error } = await supabase
        .from('staff_members')
        .update({ is_active: false })
        .eq('id', staff.id);
      
      if (error) throw error;
      
      await loadData();
    } catch (error) {
      console.error('Error removing staff:', error);
      alert('Failed to remove staff member');
    }
  };
  
  // Get assignments for a staff member
  const getStaffAssignments = (staffId) => {
    return assignments
      .filter(a => a.coach_id === staffId)
      .map(a => a.group_name);
  };
  
  // Get coaches assigned to a group
  const getGroupCoaches = (groupName) => {
    return assignments
      .filter(a => a.group_name === groupName)
      .map(a => staffMembers.find(s => s.id === a.coach_id))
      .filter(Boolean);
  };
  
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                <Users size={28} className="text-blue-600" />
                Coach Assignments
              </h1>
              <p className="text-slate-500 text-sm">
                Assign staff to practice groups
              </p>
            </div>
          </div>
          
          <button
            onClick={() => {
              setEditingStaff(null);
              setShowStaffModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
          >
            <UserPlus size={18} />
            Add Staff
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
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
                          <div className="text-sm text-slate-500 mt-1">
                            {staffAssignments.length > 0 
                              ? staffAssignments.join(', ')
                              : 'No groups assigned'
                            }
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setAssigningStaff(staff);
                              setShowAssignmentModal(true);
                            }}
                            className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 transition"
                            title="Assign groups"
                          >
                            <Calendar size={18} />
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
                  
                  return (
                    <div key={groupName} className="p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-slate-800">{groupName}</h3>
                        <div className="flex items-center gap-1">
                          {coaches.length > 0 ? (
                            <>
                              {coaches.slice(0, 3).map((coach, idx) => (
                                <div 
                                  key={coach.id}
                                  className={idx > 0 ? '-ml-2' : ''}
                                  style={{ zIndex: 3 - idx }}
                                >
                                  <StaffAvatar staff={coach} size="sm" />
                                </div>
                              ))}
                              {coaches.length > 3 && (
                                <span className="text-xs text-slate-500 ml-1">
                                  +{coaches.length - 3}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-xs text-slate-400 italic">
                              No coach assigned
                            </span>
                          )}
                        </div>
                      </div>
                      {coaches.length > 0 && (
                        <div className="text-sm text-slate-500 mt-1">
                          {coaches.map(c => c.name).join(', ')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        {/* Info Banner */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How Coach Assignments Work</p>
            <p>
              Once you assign coaches to groups, they'll only see practices for their assigned groups 
              when they log in. Head coaches always see everything. This feature works with the 
              Workout Planner to show each coach their responsibilities.
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
      />
    </div>
  );
}

