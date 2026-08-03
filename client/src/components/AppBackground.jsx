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
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <video
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4"
      />
      <div className="absolute inset-0 noise-overlay opacity-[0.5] mix-blend-overlay" />
      <div className="absolute inset-0 bg-[#080808]/80 backdrop-blur-sm" />
    </div>
  );
}
