import React, { useState, useEffect } from "react";

interface IntroScreenProps {
  isFading: boolean;
}

const PHRASES = [
  "Waking up Gemini...",
  "Preparing your journal...",
  "Finding your thoughts...",
  "Securing your private archive...",
  "Almost there...",
];

export const IntroScreen: React.FC<IntroScreenProps> = ({ isFading }) => {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [textFade, setTextFade] = useState(true);

  // Cycle phrases every 1.5 seconds with a brief text-fade effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTextFade(false);
      setTimeout(() => {
        setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
        setTextFade(true);
      }, 200);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-stone-950 text-stone-100 transition-opacity duration-700 ease-out ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Ambient background glow */}
      <div className="absolute w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-72 h-72 rounded-full bg-stone-700/20 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center">
        {/* Animated Modern Logo Graphic (Pen & Journal + Sparks) */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-b from-stone-800 to-stone-900 border border-stone-700/80 shadow-2xl flex items-center justify-center group">
            {/* SVG Pen & Notebook / Spark Graphic */}
            <svg
              className="w-12 h-12 text-amber-300 drop-shadow-md transition-transform duration-700"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Journal Book Outline */}
              <rect
                x="8"
                y="8"
                width="28"
                height="32"
                rx="4"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="opacity-90"
              />
              {/* Spine line */}
              <line
                x1="14"
                y1="8"
                x2="14"
                y2="40"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="2 3"
                className="opacity-60"
              />
              {/* Ruled lines inside journal */}
              <line
                x1="18"
                y1="16"
                x2="30"
                y2="16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="opacity-40"
              />
              <line
                x1="18"
                y1="22"
                x2="28"
                y2="22"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="opacity-40"
              />
              <line
                x1="18"
                y1="28"
                x2="25"
                y2="28"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="opacity-40"
              />

              {/* Glowing Stylus / Pen Tip */}
              <path
                d="M34 10L38 14L24 28L20 28L20 24L34 10Z"
                fill="#FDE68A"
                stroke="#F59E0B"
                strokeWidth="1.5"
                strokeLinejoin="round"
                className="animate-bounce"
                style={{ animationDuration: "2s" }}
              />

              {/* Sparks / Celestial Stars */}
              <path
                d="M39 6L40 9L43 10L40 11L39 14L38 11L35 10L38 9L39 6Z"
                fill="#FBBF24"
                className="animate-pulse"
              />
              <circle cx="10" cy="38" r="1.5" fill="#FDE68A" className="animate-ping" style={{ animationDuration: "3s" }} />
            </svg>
          </div>

          {/* Pulsing ring indicator */}
          <div className="absolute -inset-1.5 rounded-[26px] border border-amber-400/30 animate-pulse pointer-events-none" />
        </div>

        {/* App Title */}
        <h1 className="text-3xl font-bold tracking-tight text-stone-100 font-serif">
          Gemini Journal
        </h1>
        <p className="text-xs text-stone-400 mt-1.5 tracking-wide">
          Private, AI-Guided Personal Reflections
        </p>

        {/* Rotating Loading Phrases with smooth cross-fade */}
        <div className="h-8 mt-8 flex items-center justify-center">
          <p
            className={`text-sm text-amber-200/90 font-medium transition-opacity duration-300 ${
              textFade ? "opacity-100" : "opacity-0"
            }`}
          >
            {PHRASES[phraseIndex]}
          </p>
        </div>

        {/* Loading dots / spinner */}
        <div className="flex items-center gap-2 mt-4">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>

        {/* Zero-friction assurance */}
        <span className="mt-8 text-[11px] text-stone-500 font-mono">
          Anonymous session • Zero login required
        </span>
      </div>
    </div>
  );
};
