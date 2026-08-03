import React, { useEffect, useState, createContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Landing from './pages/Landing';
import PublicNote from './pages/PublicNote';
import ResetPassword from './pages/ResetPassword';
import { DialogProvider } from './components/DialogProvider';

export const ThemeContext = createContext();

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [bgType, setBgType] = useState(localStorage.getItem('app_bg_type') || 'video');
  const [bgColor, setBgColor] = useState(localStorage.getItem('app_bg_color') || '#080808');

  useEffect(() => {
    // Load initial accent color
    const savedThemeId = localStorage.getItem('app_theme');
    const customColorHex = localStorage.getItem('app_custom_color');
    const customSecondaryHex = localStorage.getItem('app_custom_secondary');
    
    const hexToRgb = (hex) => {
      let r = 0, g = 0, b = 0;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16); g = parseInt(hex.substring(3, 5), 16); b = parseInt(hex.substring(5, 7), 16);
      }
      return `${r} ${g} ${b}`;
    };

    if (savedThemeId === 'custom' && customColorHex && customSecondaryHex) {
      document.documentElement.style.setProperty('--color-primary', hexToRgb(customColorHex));
      document.documentElement.style.setProperty('--color-primary-hex', customColorHex);
      document.documentElement.style.setProperty('--color-secondary', hexToRgb(customSecondaryHex));
      document.documentElement.style.setProperty('--color-secondary-hex', customSecondaryHex);
    } else {
      const themeId = savedThemeId || 'gold';
      const THEMES = [
        { id: 'gold', color: '#DEDBC8', hex: '222 219 200', secondaryColor: '#D4AF37', secondaryHex: '212 175 55' },
        { id: 'emerald', color: '#10b981', hex: '16 185 129', secondaryColor: '#059669', secondaryHex: '5 150 105' },
        { id: 'blue', color: '#3b82f6', hex: '59 130 246', secondaryColor: '#2563eb', secondaryHex: '37 99 235' },
        { id: 'purple', color: '#8b5cf6', hex: '139 92 246', secondaryColor: '#7c3aed', secondaryHex: '124 58 237' },
        { id: 'rose', color: '#f43f5e', hex: '244 63 94', secondaryColor: '#e11d48', secondaryHex: '225 29 72' }
      ];
      const t = THEMES.find(x => x.id === themeId);
      if (t) {
        document.documentElement.style.setProperty('--color-primary', t.hex);
        document.documentElement.style.setProperty('--color-primary-hex', t.color);
        document.documentElement.style.setProperty('--color-secondary', t.secondaryHex);
        document.documentElement.style.setProperty('--color-secondary-hex', t.secondaryColor);
      }
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-app-bg text-primary-text gap-4">
        <div className="w-80 h-16 overflow-hidden flex items-center justify-center animate-pulse">
          <img src="/logo.png" alt="Logo" className="w-[360px] max-w-none mix-blend-screen" />
        </div>
        <div className="animate-pulse font-code font-bold text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, bgType, setBgType, bgColor, setBgColor }}>
      <DialogProvider>
        <Router>
        <Routes>
          <Route 
            path="/" 
            element={session ? <Navigate to="/dashboard" /> : <Landing />} 
          />
          <Route 
            path="/auth" 
            element={session ? <Navigate to="/dashboard" /> : <Auth />} 
          />
          <Route 
            path="/dashboard/*" 
            element={session ? <Dashboard session={session} /> : <Navigate to="/auth" />} 
          />
          <Route 
            path="/reset-password" 
            element={<ResetPassword />} 
          />
          <Route 
            path="/share/:noteId" 
            element={<PublicNote />} 
          />
        </Routes>
        </Router>
      </DialogProvider>
    </ThemeContext.Provider>
  );
}

export default App;
