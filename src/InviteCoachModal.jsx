import React, { useState } from 'react';
import { supabase } from './supabase';
import { useTeamRole } from './hooks/useTeamRole';
import {
  X, Mail, Copy, Check, UserPlus, Loader2, AlertCircle,
  Shield, Users, Eye
} from 'lucide-react';

const APP_URL = 'https://www.goodswim.io';

const ROLES = [
  {
    id: 'admin',
    label: 'Admin',
    icon: Shield,
    color: 'purple',
    description: 'Full access to roster, practices, meets, reports, staff management, and inviting coaches. No billing access.',
  },
  {
    id: 'coach',
    label: 'Coach',
    icon: Users,
    color: 'blue',
    description: 'Full operational access: roster, practices, test sets, meets, and reports.',
  },
  {
    id: 'assistant',
    label: 'Assistant',
    icon: Eye,
    color: 'emerald',
    description: 'View roster, create practices, run test sets, and view reports. Cannot manage roster or meets.',
  },
];

export default function InviteCoachModal({ onClose }) {
  const { teamId } = useTeamRole();
  const [step, setStep] = useState('form');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('coach');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const handleSendInvite = async () => {
    if (!email) { setError('Please enter an email address'); return; }
    if (!email.includes('@')) { setError('Please enter a valid email address'); return; }

    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const teamName = user?.user_metadata?.team_name || 'Your Team';
      const inviterName = user?.user_metadata?.full_name || user?.email;

      const { data, error: insertError } = await supabase
        .from('coach_invites')
        .insert({
          team_id: teamId,
          email: email.trim().toLowerCase(),
          name: name.trim() || null,
          role: selectedRole,
          invited_by: user.id,
        })
        .select('token')
        .single();

      if (insertError) throw insertError;

      const link = `${APP_URL}/coach-invite/${data.token}`;
      setInviteLink(link);

      // Try to send email via edge function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(
          `https://ozznaspwqcfxulgqovro.supabase.co/functions/v1/send-coach-invite`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              email: email.trim().toLowerCase(),
              name: name.trim() || null,
              role: selectedRole,
              token: data.token,
              team_name: teamName,
              invited_by_name: inviterName,
            }),
          }
        );
        const result = await res.json();
        setEmailSent(result.email_sent === true);
      } catch {
        setEmailSent(false);
      }

      setStep('success');
    } catch (err) {
      console.error('Error creating invite:', err);
      setError(err.message || 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = inviteLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const roleColors = { admin: 'purple', coach: 'blue', assistant: 'emerald' };

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
              <h2 className="font-bold text-lg">Invite Coach</h2>
              <p className="text-blue-100 text-sm">
                {step === 'form' ? 'Add a coach to your team' : 'Invite sent!'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
          {step === 'form' && (
            <div className="p-4 space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="coach@email.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Jane Smith"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Role Selector */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Permission Level</label>
                <div className="space-y-2">
                  {ROLES.map((role) => {
                    const isSelected = selectedRole === role.id;
                    const color = roleColors[role.id];
                    return (
                      <div
                        key={role.id}
                        onClick={() => setSelectedRole(role.id)}
                        className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? `border-${color}-500 bg-${color}-50`
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected ? `bg-${color}-500 text-white` : 'bg-slate-100 text-slate-500'
                          }`}>
                            <role.icon size={16} />
                          </div>
                          <div className="flex-1">
                            <p className={`font-semibold text-sm ${isSelected ? `text-${color}-700` : 'text-slate-700'}`}>
                              {role.label}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{role.description}</p>
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? `border-${color}-500 bg-${color}-500` : 'border-slate-300'
                          }`}>
                            {isSelected && <Check size={12} className="text-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                  {emailSent
                    ? `An email has been sent to ${email}`
                    : `Share the link below with ${name || email}`}
                </p>
              </div>

              <div className="bg-slate-100 rounded-xl p-4">
                <div className="flex items-center gap-2 justify-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${roleColors[selectedRole]}-100 text-${roleColors[selectedRole]}-700`}>
                    {ROLES.find(r => r.id === selectedRole)?.label}
                  </span>
                  <span className="text-sm text-slate-600">{name || email}</span>
                </div>
              </div>

              {!emailSent && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 mb-2 font-medium">INVITE LINK</p>
                  <p className="text-sm text-blue-800 break-all font-mono">{inviteLink}</p>
                </div>
              )}

              <button
                onClick={handleCopyLink}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                  copied ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? <><Check size={18} /> Copied!</> : <><Copy size={18} /> Copy Invite Link</>}
              </button>

              {emailSent && (
                <p className="text-xs text-slate-400">Email sent. Link also copied as a backup.</p>
              )}
              <p className="text-xs text-slate-400">Link expires in 30 days</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'form' && (
          <div className="p-4 border-t bg-slate-50">
            <button
              onClick={handleSendInvite}
              disabled={!email || loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> Sending...</>
              ) : (
                <><Mail size={18} /> Send Invite</>
              )}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="p-4 border-t bg-slate-50">
            <button onClick={onClose} className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition-colors">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
