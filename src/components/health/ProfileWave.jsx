import { useState, useEffect, useRef } from "react";

export default function ProfileWave() {
  const [offset, setOffset] = useState(0);
  const rafRef = useRef();

  useEffect(() => {
    let start;
    const animate = (ts) => {
      if (!start) start = ts;
      setOffset(((ts - start) / 30) % 200);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#007AFF" stopOpacity="0" />
            <stop offset="50%" stopColor="#007AFF" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#7E57C2" stopOpacity="0" />
          </linearGradient>
          <filter id="waveGlow">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>

        {/* Rotating ring */}
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="url(#waveGrad)"
          strokeWidth="1.5"
          strokeDasharray="60 220"
          strokeDashoffset={-offset}
          filter="url(#waveGlow)"
          opacity="0.7"
        />
        {/* Counter-rotating ring */}
        <circle
          cx="50"
          cy="50"
          r="38"
          fill="none"
          stroke="#26A69A"
          strokeWidth="1"
          strokeDasharray="30 200"
          strokeDashoffset={offset * 1.5}
          opacity="0.4"
        />
        {/* Pulse rings */}
        <circle
          cx="50"
          cy="50"
          r="32"
          fill="none"
          stroke="#007AFF"
          strokeWidth="0.8"
          opacity={0.3 - (offset % 50) / 200}
          style={{ transform: `scale(${1 + (offset % 50) / 50})`, transformOrigin: "center" }}
        />
      </svg>
    </div>
  );
}