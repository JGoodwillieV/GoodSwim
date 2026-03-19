import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './Login';
import SignUp from './SignUp';
import DemoLogin from './pages/DemoLogin';
import InviteLanding from './InviteLanding';
import CoachInviteLanding from './CoachInviteLanding';
import AuthenticatedApp from './AuthenticatedApp';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!session ? <LandingPage /> : <Navigate to="/app" />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/app" />} />
        <Route path="/signup" element={!session ? <SignUp /> : <Navigate to="/app" />} />
        <Route path="/demo" element={<DemoLogin />} />
        
        {/* Invite Routes (Handle deep links) */}
        <Route path="/invite/:token" element={<InviteLanding />} />
        <Route path="/coach-invite/:token" element={<CoachInviteLanding />} />

        {/* Protected Application Routes */}
        <Route 
          path="/app/*" 
          element={session ? <AuthenticatedApp session={session} /> : <Navigate to="/login" />} 
        />

        {/* Catch all - 404 */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
