import React, { useState, useEffect, useContext, useRef } from 'react';
import { Settings, User, Palette, Image as ImageIcon, Save, ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { ThemeContext } from '../App';
import { supabase } from '../lib/supabase';

const THEMES = [
  { id: 'gold', name: 'Gold', color: '#DEDBC8', hex: '222 219 200', secondaryColor: '#D4AF37', secondaryHex: '212 175 55' },
  { id: 'emerald', name: 'Emerald', color: '#10b981', hex: '16 185 129', secondaryColor: '#059669', secondaryHex: '5 150 105' },
  { id: 'blue', name: 'Blue', color: '#3b82f6', hex: '59 130 246', secondaryColor: '#2563eb', secondaryHex: '37 99 235' },
  { id: 'purple', name: 'Purple', color: '#8b5cf6', hex: '139 92 246', secondaryColor: '#7c3aed', secondaryHex: '124 58 237' },
  { id: 'rose', name: 'Rose', color: '#f43f5e', hex: '244 63 94', secondaryColor: '#e11d48', secondaryHex: '225 29 72' },
];

export default function SettingsView({ session, onClose }) {
  const { bgType, setBgType, bgColor, setBgColor } = useContext(ThemeContext);
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem('app_theme') || 'gold');
  const [customColor, setCustomColor] = useState(localStorage.getItem('app_custom_color') || '#ffffff');
  const [customSecondary, setCustomSecondary] = useState(localStorage.getItem('app_custom_secondary') || '#9ca3af');
  const colorInputRef = useRef(null);
  const secondaryInputRef = useRef(null);
  
  const userEmail = session?.user?.email;
  const [username, setUsername] = useState(session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || '');
  const [password, setPassword] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const handleUpdateProfile = async () => {
    setIsUpdatingProfile(true);
    try {
      const updates = {};
      if (username !== session?.user?.user_metadata?.username) {
        updates.data = { username };
      }
      if (password) {
        updates.password = password;
      }
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.auth.updateUser(updates);
        if (error) throw error;
        alert('Profile updated successfully!');
        setPassword(''); // Clear password field after update
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const hexToRgb = (hex) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16); g = parseInt(hex[2] + hex[2], 16); b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.substring(1, 3), 16); g = parseInt(hex.substring(3, 5), 16); b = parseInt(hex.substring(5, 7), 16);
    }
    return `${r} ${g} ${b}`;
  };

  const handleThemeChange = (theme) => {
    setActiveTheme(theme.id);
    localStorage.setItem('app_theme', theme.id);
    localStorage.removeItem('app_custom_color');
    localStorage.removeItem('app_custom_secondary');
    document.documentElement.style.setProperty('--color-primary', theme.hex);
    document.documentElement.style.setProperty('--color-primary-hex', theme.color);
    document.documentElement.style.setProperty('--color-secondary', theme.secondaryHex);
    document.documentElement.style.setProperty('--color-secondary-hex', theme.secondaryColor);
  };

  const handleCustomColorChange = (e, isSecondary = false) => {
    const newColor = e.target.value;
    setActiveTheme('custom');
    localStorage.setItem('app_theme', 'custom');
    const rgb = hexToRgb(newColor);
    
    if (isSecondary) {
      setCustomSecondary(newColor);
      localStorage.setItem('app_custom_secondary', newColor);
      document.documentElement.style.setProperty('--color-secondary', rgb);
      document.documentElement.style.setProperty('--color-secondary-hex', newColor);
      
      // Ensure primary is also set so we don't end up with mixed custom/preset if they only change secondary first
      localStorage.setItem('app_custom_color', customColor);
    } else {
      setCustomColor(newColor);
      localStorage.setItem('app_custom_color', newColor);
      document.documentElement.style.setProperty('--color-primary', rgb);
      document.documentElement.style.setProperty('--color-primary-hex', newColor);
      
      // Ensure secondary is set
      localStorage.setItem('app_custom_secondary', customSecondary);
    }
  };

  const handleBgTypeChange = (type) => {
    setBgType(type);
    localStorage.setItem('app_bg_type', type);
  };

  const handleBgColorChange = (e) => {
    const newColor = e.target.value;
    setBgColor(newColor);
    localStorage.setItem('app_bg_color', newColor);
  };

  // The initial theme is now set in App.jsx!

  return (
    <div className="flex-1 overflow-y-auto z-10 text-primary-text relative">
      <div className="max-w-3xl mx-auto w-full px-8 pt-16 pb-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-10 border-b border-white/[0.05] pb-6"
        >
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white flex items-center gap-1.5 text-xs font-medium bg-white/[0.02] hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors mr-2">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          <Settings size={28} className="text-primary" />
          <h1 className="text-3xl font-medium tracking-tight text-white">Settings</h1>
        </motion.div>

        {/* Profile Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <User size={14} /> Profile & Security
          </h2>
          <div className="bg-[#111] border border-white/[0.05] rounded-xl p-6 shadow-xl">
            <div className="flex flex-col gap-5 max-w-md">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Email Address (Read Only)</label>
                <div className="text-sm text-gray-400 bg-white/[0.02] px-4 py-2.5 rounded-lg border border-white/[0.05] w-full cursor-not-allowed">
                  {userEmail || <span className="font-code font-bold">developer@DEVSPAXE.com</span>}
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">Username</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="text-sm text-white bg-black/40 px-4 py-2.5 rounded-lg border border-white/[0.1] w-full focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Enter a username"
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-2">New Password</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="text-sm text-white bg-black/40 px-4 py-2.5 rounded-lg border border-white/[0.1] w-full focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Leave blank to keep current password"
                />
              </div>

              <div className="pt-2">
                <button 
                  onClick={handleUpdateProfile}
                  disabled={isUpdatingProfile || (!password && username === session?.user?.user_metadata?.username)}
                  className="flex items-center gap-2 bg-primary text-black px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed w-fit shadow-lg shadow-primary/20"
                >
                  <Save size={16} />
                  {isUpdatingProfile ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 mt-6">Your profile details are managed securely by Supabase Auth.</p>
          </div>
        </motion.section>

        {/* Appearance Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Palette size={14} /> Appearance
          </h2>
          <div className="bg-[#111] border border-white/[0.05] rounded-xl p-6 shadow-xl">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-4">Accent Color</label>
            <div className="flex flex-wrap gap-4">
              {THEMES.map(theme => (
                <button
                  key={theme.id}
                  onClick={() => handleThemeChange(theme)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${activeTheme === theme.id ? 'ring-2 ring-offset-4 ring-offset-[#111] scale-110' : 'opacity-80 hover:scale-110 hover:opacity-100'}`}
                  style={{ background: `linear-gradient(135deg, ${theme.color} 50%, ${theme.secondaryColor} 50%)`, '--tw-ring-color': theme.color }}
                  title={theme.name}
                >
                  {activeTheme === theme.id && <div className="w-2 h-2 rounded-full bg-[#111] shadow-sm" />}
                </button>
              ))}
              
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    onClick={() => colorInputRef.current?.click()}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all overflow-hidden ${activeTheme === 'custom' ? 'ring-2 ring-offset-4 ring-offset-[#111] scale-110' : 'opacity-80 hover:scale-110 hover:opacity-100'}`}
                    style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)', '--tw-ring-color': customColor }}
                    title="Custom Primary Color"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: customColor }}>
                      {activeTheme === 'custom' && <div className="w-2 h-2 rounded-full bg-[#111]" />}
                    </div>
                  </button>
                  <input
                    ref={colorInputRef}
                    type="color"
                    value={customColor}
                    onChange={(e) => handleCustomColorChange(e, false)}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                  />
                </div>

                <div className="relative">
                  <button
                    onClick={() => secondaryInputRef.current?.click()}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all overflow-hidden ${activeTheme === 'custom' ? 'opacity-100' : 'opacity-50 hover:opacity-100'}`}
                    style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}
                    title="Custom Secondary Color"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center border-2 border-[#111]" style={{ backgroundColor: customSecondary }}>
                      {/* Inner dot */}
                    </div>
                  </button>
                  <input
                    ref={secondaryInputRef}
                    type="color"
                    value={customSecondary}
                    onChange={(e) => handleCustomColorChange(e, true)}
                    className="absolute inset-0 opacity-0 pointer-events-none"
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-6">Select a preset or pick custom primary and secondary colors.</p>
          </div>
        </motion.section>

        {/* Background Section */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <ImageIcon size={14} /> Background Style
          </h2>
          <div className="bg-[#111] border border-white/[0.05] rounded-xl p-6 shadow-xl">
            <div className="flex flex-col gap-6">
              
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-3">Background Type</label>
                <div className="flex gap-4">
                  <button
                    onClick={() => handleBgTypeChange('video')}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${bgType === 'video' ? 'bg-primary/10 border-primary text-primary' : 'bg-white/[0.02] border-white/[0.05] text-gray-400 hover:bg-white/[0.05]'}`}
                  >
                    Cinematic Video
                  </button>
                  <button
                    onClick={() => handleBgTypeChange('solid')}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${bgType === 'solid' ? 'bg-primary/10 border-primary text-primary' : 'bg-white/[0.02] border-white/[0.05] text-gray-400 hover:bg-white/[0.05]'}`}
                  >
                    Solid Color
                  </button>
                </div>
              </div>

              {bgType === 'solid' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-3">Custom Solid Color</label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={handleBgColorChange}
                      className="w-12 h-12 rounded-xl border border-white/10 cursor-pointer bg-transparent p-0"
                    />
                    <div className="text-sm text-gray-400 font-mono">{bgColor.toUpperCase()}</div>
                  </div>
                </motion.div>
              )}

            </div>
          </div>
        </motion.section>
      </div>
    </div>
  );
}
