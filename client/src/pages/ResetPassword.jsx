import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Code2, ArrowRight } from 'lucide-react';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-app-bg text-primary-text p-6">
      <div className="w-full max-w-md bg-[#101010] p-8 rounded-[2rem] border border-app-border shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none" />
        <div className="text-center mb-8 relative z-10">
          <div className="flex justify-center mb-4">
            <div className="bg-[#E1E0CC] text-black rounded p-2">
              <Code2 size={24} />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2">Set New Password</h3>
          <p className="text-gray-400 text-sm">Enter your new password below.</p>
        </div>

        {error && (
          <div className="relative z-10 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleReset} className="flex flex-col gap-4 relative z-10">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">New Password</label>
            <input
              type="password"
              className="w-full bg-app-bg border border-app-border-strong rounded-xl px-4 py-3 text-primary-text placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            className="w-full bg-primary text-black font-medium rounded-xl px-4 py-3 mt-4 hover:bg-[#cfcca8] transition-colors flex justify-center items-center gap-2"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
