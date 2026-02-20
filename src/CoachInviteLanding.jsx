import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from './supabase';
import {
  Waves, Mail, Lock, Loader2, Check, X,
  AlertCircle, ArrowRight, Eye, EyeOff, Shield, Users
} from 'lucide-react';

const ROLE_LABELS = {
  admin: 'Admin',
  coach: 'Coach',
  assistant: 'Assistant Coach',
};

export default function CoachInviteLanding() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState(null);

  const [authMode, setAuthMode] = useState('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const [accepted, setAccepted] = useState(false);

  useEffect(() => { loadInvite(); }, [token]);

  const loadInvite = async () => {
    try {
      const { data, error } = await supabase.rpc('get_coach_invite_by_token', { p_token: token });
      if (error) throw error;

      if (!data.valid) {
        setError(data.error || 'Invalid invite');
        setLoading(false);
        return;
      }

      setInviteData(data);
      setEmail(data.email || '');
    } catch (err) {
      console.error('Error loading coach invite:', err);
      setError('Failed to load invite');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      let session;

      if (authMode === 'signup') {
        if (password !== confirmPassword) throw new Error('Passwords do not match');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: inviteData?.name || email.split('@')[0],
              first_name: inviteData?.name?.split(' ')[0] || '',
              last_name: inviteData?.name?.split(' ').slice(1).join(' ') || '',
              invited_to_team: inviteData?.team_id,
            }
          }
        });
        if (error) throw error;
        session = data.session;

        if (!session && data.user) {
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
          if (loginError) {
            throw new Error('Account created! Please check your email to verify your account, then come back and log in.');
          }
          session = loginData.session;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        session = data.session;
      }

      if (session) {
        await acceptInvite(session.user.id);
      } else {
        throw new Error('Failed to create session. Please try again.');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError(err.message);
      setAuthLoading(false);
    }
  };

  const acceptInvite = async (userId) => {
    try {
      const { data, error } = await supabase.rpc('accept_coach_invite', {
        p_token: token,
        p_user_id: userId,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to accept invite');

      setAccepted(true);
      setAuthLoading(false);

      setTimeout(() => { window.location.replace('/app'); }, 2000);
    } catch (err) {
      console.error('Error accepting coach invite:', err);
      setAuthError(err.message);
      setAuthLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading invite...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Invalid Invite</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <a href="/" className="inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors">
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome to {inviteData?.team_name}!</h2>
          <p className="text-slate-500 mb-2">
            You've joined as {ROLE_LABELS[inviteData?.role] || 'Coach'}.
          </p>
          <p className="text-sm text-slate-400">Redirecting to your dashboard...</p>
          <Loader2 size={24} className="animate-spin text-blue-600 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Waves size={28} />
          </div>
          <h1 className="text-2xl font-bold mb-1">GoodSwim</h1>
          <p className="text-blue-100">Swim Team Management</p>
        </div>

        {/* Invite Details */}
        <div className="p-6 border-b bg-blue-50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Coach Invitation</p>
              <p className="text-slate-800 font-bold">{inviteData?.team_name}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Invited by</span>
              <span className="text-sm font-medium text-slate-700">{inviteData?.invited_by_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Your role</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                <Shield size={14} />
                {ROLE_LABELS[inviteData?.role] || 'Coach'}
              </span>
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="p-6">
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                authMode === 'signup' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                authMode === 'login' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'
              }`}
            >
              Log In
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {authMode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            {authError && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {authLoading ? (
                <><Loader2 size={18} className="animate-spin" /> Processing...</>
              ) : (
                <>
                  {authMode === 'signup' ? 'Create Account & Join Team' : 'Log In & Join Team'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
