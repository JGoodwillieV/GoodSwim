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
      // Pass all signup data as metadata - the database trigger will handle the rest!
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            team_name: teamName,
            first_name: firstName,
            last_name: lastName,
            state: state,
            coach_role: role,
            full_name: `${firstName} ${lastName}`
          }
        }
      });

      if (error) throw error;

      // Success! The database trigger automatically creates:
      // - The team record
      // - The user_profile record
      // - The team_members record
      // User just needs to confirm their email now
      alert('Success! Please check your email to confirm your account.');
      
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
