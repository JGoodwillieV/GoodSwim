// src/ActionRequiredBanner.jsx
// Banner component to show pending meet confirmations on parent dashboard
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { AlertTriangle, ChevronRight, Clock, Calendar, X } from 'lucide-react';

export default function ActionRequiredBanner({ userId, onActionClick }) {
  const [pendingActions, setPendingActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadPendingActions();
  }, [userId]);

  const loadPendingActions = async () => {
    try {
      const { data } = await supabase
        .rpc('get_parent_pending_actions', { parent_user_uuid: userId });
      
      setPendingActions(data || []);
    } catch (error) {
      console.error('Error loading pending actions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || dismissed || pendingActions.length === 0) {
    return null;
  }

  // Find the most urgent action (closest deadline)
  const sortedActions = [...pendingActions].sort((a, b) => {
    if (!a.entry_deadline) return 1;
    if (!b.entry_deadline) return -1;
    return new Date(a.entry_deadline) - new Date(b.entry_deadline);
  });

  const urgentAction = sortedActions[0];
  const deadline = urgentAction?.entry_deadline ? new Date(urgentAction.entry_deadline) : null;
  const hoursLeft = deadline ? (deadline - new Date()) / (1000 * 60 * 60) : null;
  const isVeryUrgent = hoursLeft !== null && hoursLeft < 24 && hoursLeft > 0;

  return (
    <div 
      className={`rounded-2xl p-4 mb-4 cursor-pointer transition-all ${
        isVeryUrgent 
          ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-200 animate-pulse-slow' 
          : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-200'
      }`}
      onClick={onActionClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="font-bold">
              {pendingActions.length === 1 
                ? 'Meet Entry Confirmation Required'
                : `${pendingActions.length} Meet Confirmations Required`
              }
            </p>
            <p className={`text-sm ${isVeryUrgent ? 'text-red-100' : 'text-amber-100'}`}>
              {urgentAction.meet_name} - {urgentAction.swimmer_name}
              {hoursLeft !== null && hoursLeft > 0 && (
                <span className="ml-2">
                  • {hoursLeft < 24 
                      ? `${Math.ceil(hoursLeft)} hours left!` 
                      : `Due ${deadline.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                    }
                </span>
              )}
            </p>
          </div>
        </div>
        <ChevronRight size={24} className="opacity-70" />
      </div>
      
      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.9; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
