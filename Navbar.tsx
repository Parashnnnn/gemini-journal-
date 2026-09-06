import React from "react";
import { UserProfile } from "../types";
import { BookOpen, ShieldCheck, PenSquare, Lock, Sparkles } from "lucide-react";

interface NavbarProps {
  user: UserProfile;
  activeTab: "journal" | "entries" | "audit";
  setActiveTab: (tab: "journal" | "entries" | "audit") => void;
  entriesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  activeTab,
  setActiveTab,
  entriesCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-stone-50 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-amber-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-stone-900 tracking-tight text-base font-serif">
                Gemini Journal
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                <Lock className="w-2.5 h-2.5" />
                Anonymous
              </span>
            </div>
            <p className="text-xs text-stone-500 hidden sm:block">
              Private AI Reflection • Per-User Isolated Archive
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex items-center gap-1">
          <button
            id="nav-journal-tab"
            onClick={() => setActiveTab("journal")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "journal"
                ? "bg-stone-900 text-stone-50 shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <PenSquare className="w-4 h-4" />
            <span>Reflect</span>
          </button>

          <button
            id="nav-entries-tab"
            onClick={() => setActiveTab("entries")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "entries"
                ? "bg-stone-900 text-stone-50 shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>My Entries</span>
            {entriesCount > 0 && (
              <span
                className={`text-xs px-1.5 py-0.2 rounded-full ${
                  activeTab === "entries"
                    ? "bg-stone-700 text-stone-100"
                    : "bg-stone-200 text-stone-700"
                }`}
              >
                {entriesCount}
              </span>
            )}
          </button>

          <button
            id="nav-audit-tab"
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "audit"
                ? "bg-amber-900 text-amber-50 shadow-sm"
                : "text-stone-600 hover:text-stone-900 hover:bg-stone-100"
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="hidden md:inline">Security Audit</span>
            <span className="md:hidden">Audit</span>
          </button>
        </nav>

        {/* Private session indicator (no sign out UI) */}
        <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold text-stone-800 flex items-center justify-end gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="hidden sm:inline">Anonymous Session</span>
              <span className="sm:hidden">Private</span>
            </span>
            <span className="text-[10px] text-stone-400 font-mono" title={`Full UID: ${user.uid}`}>
              UID: {user.uid.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
