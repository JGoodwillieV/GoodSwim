import React, { useState } from 'react';
import { supabase } from './supabase';
import { Link } from 'react-router-dom';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [state, setState] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const usStates = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
    'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
    'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
    'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
    'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
    'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];

  const roleOptions = ['Head Coach', 'Age Group Coach', 'Staff', 'Other'];

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        // 2. Create the Team (This triggers your database logic)
        // Note: It is safer to do this via a Postgres Trigger on auth.users creation,
        // or a Supabase Edge Function.
        // However, for client-side MVP:
        
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .insert([{ 
            name: teamName,
            state: state,
            subscription_tier: 'starter', // Default to free/starter
            subscription_status: 'trialing'
          }])
          .select()
          .single();

        if (teamError) throw teamError;

        // 3. Link User to Team as Owner
        const { error: memberError } = await supabase
          .from('team_members')
          .insert([{
            team_id: teamData.id,
            user_id: authData.user.id,
            role: 'owner'
          }]);

        if (memberError) throw memberError;
        
        // 4. Create User Profile
        await supabase.from('user_profiles').insert({
             id: authData.user.id,
             role: 'coach',
             display_name: `${firstName} ${lastName}`,
             first_name: firstName,
             last_name: lastName,
             coach_role: role,
             first_login: true
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={handleSignUp} className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Create your Team</h2>
        
        {error && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Team Name</label>
            <input 
              type="text" 
              required
              className="w-full p-2 border rounded-lg"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              placeholder="e.g. Springfield Sharks"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input 
                type="text" 
                required
                className="w-full p-2 border rounded-lg"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input 
                type="text" 
                required
                className="w-full p-2 border rounded-lg"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Smith"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-2 border rounded-lg"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full p-2 border rounded-lg"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
            <select 
              required
              className="w-full p-2 border rounded-lg bg-white"
              value={state}
              onChange={e => setState(e.target.value)}
            >
              <option value="">Select a state...</option>
              {usStates.map((stateName) => (
                <option key={stateName} value={stateName}>
                  {stateName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select 
              required
              className="w-full p-2 border rounded-lg bg-white"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              <option value="">Select a role...</option>
              {roleOptions.map((roleOption) => (
                <option key={roleOption} value={roleOption}>
                  {roleOption}
                </option>
              ))}
            </select>
          </div>

          <button 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            {loading ? 'Creating Team...' : 'Start 14-Day Free Trial'}
          </button>
        </div>
        
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account? <Link to="/login" className="text-blue-600">Log in</Link>
        </p>
      </form>
    </div>
  );
}
