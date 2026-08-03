import React, { useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { ThemeContext } from '../App';
import { Moon, Sun, Code2, BookOpen, GitMerge, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState('login'); // 'login' | 'signup' | 'forgot'
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  
  const { theme, toggleTheme } = useContext(ThemeContext);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (view === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage('Check your email for the login link!');
      } else if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (view === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/reset-password',
        });
        if (error) throw error;
        setMessage('Password reset instructions sent to your email.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-app-bg text-primary-text selection:bg-primary/30">
      {/* Header */}
      <header className="p-6 flex justify-between items-center z-10 relative">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="bg-[#E1E0CC] text-black rounded p-1">
            <Code2 size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight">note.dev</span>
        </Link>
        <button onClick={toggleTheme} className="p-2 rounded-full border border-app-border-strong hover:bg-surface-hover transition-colors">
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:flex-row items-center justify-center p-6 gap-12 lg:gap-24 relative z-10">
        
        {/* Left Side: Hero / Pitch */}
        <div className="hidden md:flex flex-col gap-8 max-w-md">
          <div>
            <h1 className="text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-4">
              The Developer's<br/>Notebook.
            </h1>
            <p className="text-gray-400 text-lg">
              Write concepts, run code snippets, and sketch data structures. Designed for the modern engineer.
            </p>
          </div>
          
          <div className="flex flex-col gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[#101010] border border-app-border">
                <BookOpen size={20} className="text-primary" />
              </div>
              <div>
                <h5 className="font-medium text-primary-text mb-1">Structured Knowledge</h5>
                <p className="text-sm text-gray-500 leading-relaxed">Organize notes into reusable notebooks. Perfect for DSA or language practice.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[#101010] border border-app-border">
                <Code2 size={20} className="text-primary" />
              </div>
              <div>
                <h5 className="font-medium text-primary-text mb-1">Runnable Snippets</h5>
                <p className="text-sm text-gray-500 leading-relaxed">Execute JavaScript, Python, C++, HTML and CSS directly inside your notes.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[#101010] border border-app-border">
                <GitMerge size={20} className="text-primary" />
              </div>
              <div>
                <h5 className="font-medium text-primary-text mb-1">Diagram Templates</h5>
                <p className="text-sm text-gray-500 leading-relaxed">Manual templates for Stacks, Queues, Trees, and Graphs. No heavy engines.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="w-full max-w-md bg-[#101010] p-8 sm:p-10 rounded-[2rem] border border-app-border shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-noise opacity-10 pointer-events-none" />
          
          <div className="relative z-10 text-center mb-8">
            <h3 className="text-2xl font-bold mb-2">
              {view === 'signup' ? 'Create your workspace' : view === 'forgot' ? 'Reset Password' : 'Welcome back'}
            </h3>
            <p className="text-gray-400 text-sm">
              {view === 'signup' ? 'Sign up to start organizing your knowledge.' : view === 'forgot' ? 'Enter your email to receive a reset link.' : 'Log in to continue your progress.'}
            </p>
          </div>

          <div className="relative z-10">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm mb-6">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-xl text-sm mb-6">
                {message}
              </div>
            )}

            <form onSubmit={handleAuth} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Email address</label>
                <input
                  type="email"
                  className="w-full bg-app-bg border border-app-border-strong rounded-xl px-4 py-3 text-primary-text placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                  placeholder="developer@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {view !== 'forgot' && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-medium text-gray-300">Password</label>
                    {view === 'login' && (
                      <button type="button" onClick={() => setView('forgot')} className="text-xs text-primary hover:text-[#cfcca8] transition-colors">
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    type="password"
                    className="w-full bg-app-bg border border-app-border-strong rounded-xl px-4 py-3 text-primary-text placeholder-gray-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}
              <button 
                type="submit" 
                className="w-full bg-primary text-black font-medium rounded-xl px-4 py-3 mt-4 hover:bg-[#cfcca8] transition-colors flex justify-center items-center gap-2 disabled:opacity-70"
                disabled={loading}
              >
                {loading ? 'Processing...' : view === 'signup' ? 'Create Account' : view === 'forgot' ? 'Send Reset Link' : 'Log In'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="text-center mt-6">
              {view === 'forgot' ? (
                <button 
                  type="button"
                  className="text-gray-400 hover:text-white text-sm transition-colors"
                  onClick={() => setView('login')}
                >
                  Back to Log In
                </button>
              ) : (
                <>
                  <span className="text-gray-400 text-sm">
                    {view === 'signup' ? 'Already have an account?' : "Don't have an account?"}
                  </span>
                  <button 
                    type="button"
                    className="text-primary hover:text-[#cfcca8] font-medium text-sm ml-2 transition-colors"
                    onClick={() => setView(view === 'signup' ? 'login' : 'signup')}
                  >
                    {view === 'signup' ? 'Log In' : 'Sign Up'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
