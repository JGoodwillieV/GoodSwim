// src/ActionCenter.jsx
// Parent interface for viewing and confirming meet entries
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import {
  AlertTriangle, Check, X, Clock, Calendar, ChevronRight,
  ChevronLeft, Waves, Timer, CheckCircle, Edit3, Send,
  Loader2, Bell, MessageSquare, User
} from 'lucide-react';

// Urgency indicator based on deadline
function DeadlineIndicator({ deadline }) {
  if (!deadline) return null;
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const hoursLeft = (deadlineDate - now) / (1000 * 60 * 60);
  
  if (hoursLeft < 0) {
    return (
      <div className="flex items-center gap-1 text-red-600 text-sm">
        <AlertTriangle size={14} />
        <span className="font-medium">Deadline passed</span>
      </div>
    );
  }
  
  if (hoursLeft < 24) {
    return (
      <div className="flex items-center gap-1 text-red-600 text-sm animate-pulse">
        <AlertTriangle size={14} />
        <span className="font-medium">Due in {Math.ceil(hoursLeft)} hours!</span>
      </div>
    );
  }
  
  if (hoursLeft < 48) {
    return (
      <div className="flex items-center gap-1 text-amber-600 text-sm">
        <Clock size={14} />
        <span className="font-medium">Due tomorrow</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-slate-500 text-sm">
      <Clock size={14} />
      <span>Due {deadlineDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
    </div>
  );
}

// Action Card for pending confirmations
function ActionCard({ action, onClick }) {
  const deadline = action.entry_deadline ? new Date(action.entry_deadline) : null;
  const hoursLeft = deadline ? (deadline - new Date()) / (1000 * 60 * 60) : null;
  const isUrgent = hoursLeft !== null && hoursLeft < 24 && hoursLeft > 0;
  
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-5 transition-all ${
        isUrgent 
          ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-200' 
          : 'bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            isUrgent ? 'bg-white/20' : 'bg-blue-50'
          }`}>
            <Calendar size={24} className={isUrgent ? 'text-white' : 'text-blue-600'} />
          </div>
          <div>
            <h3 className={`font-bold text-lg ${isUrgent ? 'text-white' : 'text-slate-800'}`}>
              {action.meet_name}
            </h3>
            <p className={`text-sm ${isUrgent ? 'text-red-100' : 'text-slate-500'}`}>
              {action.swimmer_name}
            </p>
          </div>
        </div>
        <ChevronRight size={20} className={isUrgent ? 'text-white/70' : 'text-slate-400'} />
      </div>
      
      <div className={`flex items-center justify-between pt-3 border-t ${
        isUrgent ? 'border-white/20' : 'border-slate-100'
      }`}>
        <div className={`flex items-center gap-2 ${isUrgent ? 'text-red-100' : 'text-slate-600'}`}>
          <Waves size={16} />
          <span className="text-sm font-medium">{action.event_count} events</span>
        </div>
        {isUrgent ? (
          <div className="flex items-center gap-1 text-white font-medium text-sm">
            <AlertTriangle size={14} />
            <span>Action Required!</span>
          </div>
        ) : (
          <DeadlineIndicator deadline={action.entry_deadline} />
        )}
      </div>
    </button>
  );
}

// Entry Confirmation Detail View
function ConfirmationDetail({ meetId, swimmerId, swimmerName, parentId, onBack, onConfirm }) {
  const [meet, setMeet] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [scratchSelections, setScratchSelections] = useState(new Set());
  const [notes, setNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);

  useEffect(() => {
    loadData();
  }, [meetId, swimmerId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load meet info
      const { data: meetData } = await supabase
        .from('meets')
        .select('*')
        .eq('id', meetId)
        .single();
      
      setMeet(meetData);
      
      // Load entries for this swimmer
      const { data: entriesData } = await supabase
        .from('meet_entries')
        .select('*')
        .eq('meet_id', meetId)
        .eq('swimmer_id', swimmerId)
        .order('event_number');
      
      setEntries(entriesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (status) => {
    setConfirming(true);
    try {
      const confirmationData = {
        meet_id: meetId,
        swimmer_id: swimmerId,
        parent_id: parentId,
        status: status,
        parent_notes: notes || null,
        scratch_requests: scratchSelections.size > 0 ? Array.from(scratchSelections) : null,
        confirmed_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from('entry_confirmations')
        .upsert(confirmationData, {
          onConflict: 'meet_id,swimmer_id,parent_id'
        });
      
      if (error) throw error;
      
      onConfirm();
    } catch (error) {
      alert('Error saving confirmation: ' + error.message);
    } finally {
      setConfirming(false);
    }
  };

  const toggleScratch = (entryId) => {
    const newSelections = new Set(scratchSelections);
    if (newSelections.has(entryId)) {
      newSelections.delete(entryId);
    } else {
      newSelections.add(entryId);
    }
    setScratchSelections(newSelections);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  const hasChanges = scratchSelections.size > 0 || notes.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ChevronLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{meet?.name}</h2>
          <p className="text-slate-500">{swimmerName}'s Entries</p>
        </div>
      </div>
      
      {/* Deadline Warning */}
      {meet?.entry_deadline && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${
          new Date(meet.entry_deadline) < new Date() 
            ? 'bg-red-50 border border-red-200'
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <Timer className={new Date(meet.entry_deadline) < new Date() ? 'text-red-500' : 'text-amber-500'} size={24} />
          <div>
            <p className={`font-semibold ${new Date(meet.entry_deadline) < new Date() ? 'text-red-700' : 'text-amber-700'}`}>
              {new Date(meet.entry_deadline) < new Date() ? 'Deadline has passed' : 'Confirmation Deadline'}
            </p>
            <p className={`text-sm ${new Date(meet.entry_deadline) < new Date() ? 'text-red-600' : 'text-amber-600'}`}>
              {(() => {
                // entry_deadline might include time, so parse as full timestamp
                const date = new Date(meet.entry_deadline);
                return date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                });
              })()}
            </p>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Review Your Entries</h3>
        <p className="text-sm text-blue-700">
          Please review the events below. If everything looks correct, click "Confirm All". 
          If you need to scratch an event or request changes, select the events and add notes below.
        </p>
      </div>
      
      {/* Entries List */}
      <div>
        <h3 className="font-semibold text-slate-700 mb-3">
          {entries.length} Event{entries.length !== 1 ? 's' : ''}
        </h3>
        <div className="space-y-2">
          {entries.map(entry => {
            const isSelected = scratchSelections.has(entry.id);
            return (
              <div
                key={entry.id}
                onClick={() => toggleScratch(entry.id)}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center ${
                    isSelected 
                      ? 'border-red-500 bg-red-500' 
                      : 'border-slate-300'
                  }`}>
                    {isSelected && <X size={14} className="text-white" />}
                  </div>
                  <div>
                    <p className={`font-semibold ${isSelected ? 'text-red-700 line-through' : 'text-slate-800'}`}>
                      {entry.event_name}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      {entry.event_number && <span>Event #{entry.event_number}</span>}
                      {entry.age_group && <span>• {entry.age_group}</span>}
                      {entry.is_bonus && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          Bonus
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-mono font-semibold ${isSelected ? 'text-red-600' : 'text-slate-800'}`}>
                    {entry.seed_time_display || 'NT'}
                  </p>
                  <p className="text-xs text-slate-400">Seed Time</p>
                </div>
              </div>
            );
          })}
        </div>
        
        {scratchSelections.size > 0 && (
          <p className="mt-3 text-sm text-red-600">
            {scratchSelections.size} event{scratchSelections.size !== 1 ? 's' : ''} selected for scratch
          </p>
        )}
      </div>
      
      {/* Notes Section */}
      <div>
        <button
          onClick={() => setShowNotesInput(!showNotesInput)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          <MessageSquare size={16} />
          {showNotesInput ? 'Hide notes' : 'Add notes or request changes'}
        </button>
        
        {showNotesInput && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes or change requests here..."
            className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl resize-none"
            rows={3}
          />
        )}
      </div>
      
      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 border-t border-slate-200">
        {hasChanges ? (
          <>
            <button
              onClick={() => handleConfirm('change_requested')}
              disabled={confirming}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {confirming ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Edit3 size={18} />
              )}
              Submit Changes
            </button>
            <button
              onClick={() => {
                setScratchSelections(new Set());
                setNotes('');
              }}
              className="px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-xl font-medium"
            >
              Clear
            </button>
          </>
        ) : (
          <button
            onClick={() => handleConfirm('confirmed')}
            disabled={confirming}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50"
          >
            {confirming ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <CheckCircle size={18} />
            )}
            Confirm All Events
          </button>
        )}
      </div>
    </div>
  );
}

// Main Action Center Component
export default function ActionCenter({ userId, parentId }) {
  const [pendingActions, setPendingActions] = useState([]);
  const [completedActions, setCompletedActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState(null);

  useEffect(() => {
    loadActions();
  }, [userId]);

  const loadActions = async () => {
    setLoading(true);
    try {
      // Get pending actions
      const { data: pending } = await supabase
        .rpc('get_parent_pending_actions', { parent_user_uuid: userId });
      
      setPendingActions(pending || []);
      
      // Get completed confirmations
      const { data: parent } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (parent) {
        const { data: completed } = await supabase
          .from('entry_confirmations')
          .select(`
            *,
            meets (id, name, start_date),
            swimmers (id, name)
          `)
          .eq('parent_id', parent.id)
          .neq('status', 'pending')
          .order('confirmed_at', { ascending: false })
          .limit(10);
        
        setCompletedActions(completed || []);
      }
    } catch (error) {
      console.error('Error loading actions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmationComplete = () => {
    setSelectedAction(null);
    loadActions();
  };

  if (selectedAction) {
    return (
      <ConfirmationDetail
        meetId={selectedAction.meet_id}
        swimmerId={selectedAction.swimmer_id}
        swimmerName={selectedAction.swimmer_name}
        parentId={parentId}
        onBack={() => setSelectedAction(null)}
        onConfirm={handleConfirmationComplete}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Actions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell size={20} className="text-blue-500" />
            <h3 className="font-bold text-lg text-slate-800">Action Required</h3>
            {pendingActions.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingActions.length}
              </span>
            )}
          </div>
        </div>
        
        {pendingActions.length === 0 ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center">
            <CheckCircle size={48} className="mx-auto text-emerald-500 mb-3" />
            <h4 className="font-semibold text-emerald-800 mb-1">All caught up!</h4>
            <p className="text-sm text-emerald-600">No pending confirmations</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingActions.map((action, idx) => (
              <ActionCard 
                key={idx} 
                action={action} 
                onClick={() => setSelectedAction(action)}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Recent Confirmations */}
      {completedActions.length > 0 && (
        <div>
          <h3 className="font-bold text-lg text-slate-800 mb-4">Recent Confirmations</h3>
          <div className="space-y-2">
            {completedActions.map(action => (
              <div 
                key={action.id}
                className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    action.status === 'confirmed' ? 'bg-emerald-50' :
                    action.status === 'change_requested' ? 'bg-blue-50' :
                    'bg-red-50'
                  }`}>
                    {action.status === 'confirmed' ? (
                      <CheckCircle size={20} className="text-emerald-500" />
                    ) : action.status === 'change_requested' ? (
                      <Edit3 size={20} className="text-blue-500" />
                    ) : (
                      <X size={20} className="text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{action.meets?.name}</p>
                    <p className="text-sm text-slate-500">{action.swimmers?.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    action.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                    action.status === 'change_requested' ? 'bg-blue-100 text-blue-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {action.status.replace('_', ' ')}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(action.confirmed_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
