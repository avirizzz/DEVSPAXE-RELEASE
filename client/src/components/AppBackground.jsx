import React, { useContext } from 'react';
import { ThemeContext } from '../App';

export default function AppBackground({ forceVideo }) {
  const { bgType, bgColor } = useContext(ThemeContext);

  if (!forceVideo && bgType === 'solid') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" style={{ backgroundColor: bgColor }}>
        <div className="absolute inset-0 noise-overlay opacity-[0.2] mix-blend-overlay" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-app-bg transition-colors duration-700">
      <video
        autoPlay loop muted playsInline crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover opacity-25 dark:opacity-40 transition-all duration-700"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
      />
      <div className="absolute inset-0 noise-overlay opacity-30 dark:opacity-50 mix-blend-overlay" />
      <div className="absolute inset-0 backdrop-blur-sm opacity-20 dark:opacity-85 transition-opacity duration-700" style={{ backgroundColor: 'var(--app-bg)' }} />
    </div>
  );
}
