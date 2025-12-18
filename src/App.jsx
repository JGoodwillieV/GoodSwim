import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';

// Pages
import LandingPage from './pages/LandingPage'; // You will create this
import Login from './Login';
import SignUp from './SignUp'; // You will create this
import InviteLanding from './InviteLanding';
import AuthenticatedApp from './AuthenticatedApp'; // The moved code

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={!session ? <LandingPage /> : <Navigate to="/app" />} />
        <Route path="/login" element={!session ? <Login /> : <Navigate to="/app" />} />
        <Route path="/signup" element={!session ? <SignUp /> : <Navigate to="/app" />} />
        
        {/* Invite Route (Handle deep links) */}
        <Route path="/invite/:token" element={<InviteLanding />} />

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
