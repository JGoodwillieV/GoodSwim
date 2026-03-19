import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Waves, Loader2 } from 'lucide-react';

const DEMO_EMAIL = 'demo@goodswim.io';
const DEMO_PASSWORD = 'GoodSwimDemo2025!';

export default function DemoLogin() {
  const navigate = useNavigate();
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('Launching demo...');

  useEffect(() => {
    const loginDemo = async () => {
      try {
        await supabase.auth.signOut();
        setStatus('Setting up your demo experience...');

        const { data, error } = await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });

        if (error) throw error;

        if (data.session) {
          setStatus('Loading team data...');
          await new Promise(resolve => setTimeout(resolve, 800));
          navigate('/app', { replace: true });
        } else {
          throw new Error('Failed to create demo session');
        }
      } catch (err) {
        console.error('Demo login error:', err);
        setError('Demo is temporarily unavailable. Please try again later.');
      }
    };

    loginDemo();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-600 to-cyan-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-2xl">
        <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Waves size={32} className="text-teal-600" />
        </div>
        
        {error ? (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Oops!</h1>
            <p className="text-slate-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="bg-teal-600 text-white px-6 py-2.5 rounded-xl hover:bg-teal-700 transition-colors"
            >
              Back to Home
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">GoodSwim Demo</h1>
            <p className="text-slate-600 mb-6">{status}</p>
            <Loader2 size={28} className="animate-spin text-teal-600 mx-auto" />
            <p className="text-xs text-slate-400 mt-6">
              Explore the full platform with a pre-loaded team of 35 swimmers
            </p>
          </>
        )}
      </div>
    </div>
  );
}
