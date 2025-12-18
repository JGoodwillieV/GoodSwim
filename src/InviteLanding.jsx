// src/InviteLanding.jsx
// Landing page for parents clicking an invite link
import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { 
  Waves, Users, Mail, Lock, Loader2, Check, X, 
  AlertCircle, ArrowRight, Eye, EyeOff, UserPlus
} from 'lucide-react';

export default function InviteLanding({ token, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState(null);
  
  // Auth state
  const [authMode, setAuthMode] = useState('signup'); // signup or login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);
  
  // Success state
  const [accepted, setAccepted] = useState(false);

  // Load invite data on mount
  useEffect(() => {
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    try {
      console.log('[InviteLanding] Loading invite for token:', token);
      
      const { data, error } = await supabase.rpc('get_invite_by_token', {
        p_token: token
      });

      console.log('[InviteLanding] Invite data:', data, 'Error:', error);

      if (error) throw error;

      if (!data.valid) {
        setError(data.error || 'Invalid invite');
        setLoading(false);
        return;
      }

      setInviteData(data);
      setEmail(data.email || '');
    } catch (err) {
      console.error('[InviteLanding] Error loading invite:', err);
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
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }

        console.log('[InviteLanding] Signing up user:', email);
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });
        
        if (error) throw error;
        session = data.session;
        console.log('[InviteLanding] Signup result - session:', !!session, 'user:', data.user?.id);
        
        // If no session, email confirmation might be required
        if (!session && data.user) {
          console.log('[InviteLanding] No session after signup, trying to log in...');
          // Try logging in immediately (depends on Supabase settings)
          const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          });
          if (loginError) {
            // Email confirmation is required
            throw new Error('Account created! Please check your email to verify your account, then come back and log in.');
          }
          session = loginData.session;
        }
      } else {
        console.log('[InviteLanding] Logging in user:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
        session = data.session;
      }

      if (session) {
        console.log('[InviteLanding] Got session for user:', session.user.id);
        
        // 1. Create/update user profile as 'parent'
        console.log('[InviteLanding] Creating/updating user profile...');
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: session.user.id,
            role: 'parent',
            display_name: inviteData?.account_name || email.split('@')[0],
            first_login: true
          }, {
            onConflict: 'id'
          });
          
        if (profileError) {
          console.error('[InviteLanding] Profile creation error:', profileError);
        } else {
          console.log('[InviteLanding] Profile created/updated successfully');
        }

        // 2. Accept the invite (links swimmers to parent)
        await acceptInvite(session.user.id);
      } else {
        throw new Error('Failed to create session. Please try again.');
      }
    } catch (err) {
      console.error('[InviteLanding] Auth error:', err);
      setAuthError(err.message);
      setAuthLoading(false);
    }
  };

  const acceptInvite = async (userId) => {
    try {
      console.log('[InviteLanding] Accepting invite for user:', userId);
      
      const { data, error } = await supabase.rpc('accept_parent_invite', {
        p_token: token,
        p_user_id: userId
      });

      console.log('[InviteLanding] Accept invite result:', data, 'Error:', error);

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to accept invite');
      }

      console.log('[InviteLanding] Invite accepted! Parent ID:', data.parent_id, 'Swimmers linked:', data.swimmers_linked);
      
      setAccepted(true);
      setAuthLoading(false);
      
      // Redirect to dashboard after showing success message
      setTimeout(() => {
        console.log('[InviteLanding] Redirecting to dashboard...');
        // Clear the URL and do a full page reload to reset all state
        window.location.replace('/');
      }, 2000);
      
    } catch (err) {
      console.error('[InviteLanding] Error accepting invite:', err);
      setAuthError(err.message);
      setAuthLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading invite...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={32} className="text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Invalid Invite</h2>
          <p className="text-slate-500 mb-6">{error}</p>
          <a 
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  // Success state
  if (accepted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Welcome!</h2>
          <p className="text-slate-500 mb-2">
            You're now connected to {inviteData?.swimmer_names?.length || 0} swimmer{inviteData?.swimmer_names?.length !== 1 ? 's' : ''}.
          </p>
          <p className="text-sm text-slate-400">Redirecting to your dashboard...</p>
          <Loader2 size={24} className="animate-spin text-blue-600 mx-auto mt-4" />
        </div>
      </div>
    );
  }

  // Main invite view
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center text-white">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Waves size={28} />
          </div>
          <h1 className="text-2xl font-bold mb-1">StormTracker</h1>
          <p className="text-blue-100">Swim Team Management</p>
        </div>

        {/* Invite Details */}
        <div className="p-6 border-b bg-blue-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <UserPlus size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">You've been invited!</p>
              <p className="text-slate-800 font-bold">{inviteData?.account_name || 'Parent Account'}</p>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4">
            <p className="text-sm text-slate-500 mb-2">You'll have access to:</p>
            <div className="flex flex-wrap gap-2">
              {inviteData?.swimmer_names?.map((name, idx) => (
                <span 
                  key={idx}
                  className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Auth Form */}
        <div className="p-6">
          {/* Tab Toggle */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                authMode === 'signup' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                authMode === 'login' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500'
              }`}
            >
              Log In
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
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
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Password
              </label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Confirm Password
                </label>
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
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {authMode === 'signup' ? 'Create Account & Join' : 'Log In & Join'}
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
