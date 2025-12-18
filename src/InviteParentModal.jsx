// src/InviteParentModal.jsx
// Modal for coaches to generate parent invite links
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  X, Mail, Copy, Check, Users, Link2, Loader2, 
  ChevronDown, Search, UserPlus, Send, AlertCircle
} from 'lucide-react';

// App URL - change this when you get a real domain
const APP_URL = 'https://storm-tracker-nine.vercel.app';

export default function InviteParentModal({ onClose, swimmers = [] }) {
  const [step, setStep] = useState('select'); // select, confirm, success
  const [selectedSwimmers, setSelectedSwimmers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [email, setEmail] = useState('');
  const [accountName, setAccountName] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  // Group swimmers by parent email for easy family selection
  const swimmersByFamily = swimmers.reduce((acc, swimmer) => {
    const key = swimmer.parent_email || 'no-email';
    if (!acc[key]) {
      acc[key] = {
        email: swimmer.parent_email,
        accountName: swimmer.parent_account_name,
        swimmers: []
      };
    }
    acc[key].swimmers.push(swimmer);
    return acc;
  }, {});

  // Filter swimmers based on search
  const filteredSwimmers = swimmers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.parent_email && s.parent_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (s.parent_account_name && s.parent_account_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // When selecting a swimmer, auto-fill email and account name
  const handleSwimmerToggle = (swimmer) => {
    const isSelected = selectedSwimmers.some(s => s.id === swimmer.id);
    
    if (isSelected) {
      setSelectedSwimmers(selectedSwimmers.filter(s => s.id !== swimmer.id));
    } else {
      setSelectedSwimmers([...selectedSwimmers, swimmer]);
      
      // Auto-fill email if not set and swimmer has parent info
      if (!email && swimmer.parent_email) {
        setEmail(swimmer.parent_email);
      }
      if (!accountName && swimmer.parent_account_name) {
        setAccountName(swimmer.parent_account_name);
      }
    }
  };

  // Select all swimmers with same parent email
  const handleSelectFamily = (familyEmail) => {
    const family = swimmersByFamily[familyEmail];
    if (!family) return;
    
    const familySwimmerIds = family.swimmers.map(s => s.id);
    const allSelected = family.swimmers.every(s => 
      selectedSwimmers.some(sel => sel.id === s.id)
    );
    
    if (allSelected) {
      // Deselect all from this family
      setSelectedSwimmers(selectedSwimmers.filter(s => 
        !familySwimmerIds.includes(s.id)
      ));
    } else {
      // Select all from this family
      const newSelected = [...selectedSwimmers];
      family.swimmers.forEach(s => {
        if (!newSelected.some(sel => sel.id === s.id)) {
          newSelected.push(s);
        }
      });
      setSelectedSwimmers(newSelected);
      setEmail(family.email || '');
      setAccountName(family.accountName || '');
    }
  };

  // Generate the invite
  const handleGenerateInvite = async () => {
    if (selectedSwimmers.length === 0) {
      setError('Please select at least one swimmer');
      return;
    }
    if (!email) {
      setError('Please enter a parent email');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('parent_invites')
        .insert({
          email: email.trim().toLowerCase(),
          account_name: accountName.trim() || null,
          swimmer_ids: selectedSwimmers.map(s => s.id),
          invited_by: user.id
        })
        .select('token')
        .single();

      if (insertError) throw insertError;

      const link = `${APP_URL}/invite/${data.token}`;
      setInviteLink(link);
      setStep('success');
    } catch (err) {
      console.error('Error creating invite:', err);
      setError(err.message || 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = inviteLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3 text-white">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg">Invite Parent</h2>
              <p className="text-blue-100 text-sm">
                {step === 'select' && 'Select swimmers to link'}
                {step === 'success' && 'Invite created!'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          {step === 'select' && (
            <div className="p-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search swimmers or families..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Selected count */}
              {selectedSwimmers.length > 0 && (
                <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
                  <Users size={16} />
                  {selectedSwimmers.length} swimmer{selectedSwimmers.length !== 1 ? 's' : ''} selected
                </div>
              )}

              {/* Swimmer list */}
              <div className="space-y-2">
                {filteredSwimmers.map(swimmer => {
                  const isSelected = selectedSwimmers.some(s => s.id === swimmer.id);
                  return (
                    <div
                      key={swimmer.id}
                      onClick={() => handleSwimmerToggle(swimmer)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{swimmer.name}</p>
                          <p className="text-sm text-slate-500">{swimmer.group_name}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-slate-300'
                        }`}>
                          {isSelected && <Check size={14} className="text-white" />}
                        </div>
                      </div>
                      {swimmer.parent_email && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                          <Mail size={12} />
                          {swimmer.parent_email}
                          {swimmer.parent_account_name && (
                            <span className="text-slate-300">• {swimmer.parent_account_name}</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Email input */}
              <div className="pt-4 border-t space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Parent Email *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="parent@email.com"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Account Name (optional)
                  </label>
                  <input
                    type="text"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g., Smith Family"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check size={32} className="text-green-600" />
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-slate-800">Invite Created!</h3>
                <p className="text-slate-500 mt-1">
                  Share this link with {accountName || email}
                </p>
              </div>

              <div className="bg-slate-100 rounded-xl p-4">
                <p className="text-sm text-slate-500 mb-2">Swimmers included:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedSwimmers.map(s => (
                    <span key={s.id} className="bg-white px-3 py-1 rounded-full text-sm font-medium text-slate-700">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs text-blue-600 mb-2 font-medium">INVITE LINK</p>
                <p className="text-sm text-blue-800 break-all font-mono">
                  {inviteLink}
                </p>
              </div>

              <button
                onClick={handleCopyLink}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={18} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copy Link
                  </>
                )}
              </button>

              <p className="text-xs text-slate-400">
                Link expires in 30 days
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'select' && (
          <div className="p-4 border-t bg-slate-50">
            <button
              onClick={handleGenerateInvite}
              disabled={selectedSwimmers.length === 0 || !email || loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Link2 size={18} />
                  Generate Invite Link
                </>
              )}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="p-4 border-t bg-slate-50">
            <button
              onClick={onClose}
              className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
