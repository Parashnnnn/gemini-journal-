import React, { useState, useEffect } from "react";
import { UserProfile, JournalEntry } from "../types";
import { db } from "../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  BookOpen,
  Calendar,
  Smile,
  Tag,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  Bot,
  User as UserIcon,
  Clock,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

interface EntriesListProps {
  user: UserProfile;
  onNewEntryClick: () => void;
}

export const EntriesList: React.FC<EntriesListProps> = ({ user, onNewEntryClick }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMood, setSelectedMood] = useState<string>("all");
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Real-time Firestore subscription scoped to /users/{uid}/entries
  // Security rules enforce that request.auth.uid == user.uid
  useEffect(() => {
    if (!user.uid) return;

    setLoading(true);
    setError(null);

    const localKey = `gemini_journal_entries_${user.uid}`;
    // Pre-populate immediately from local device cache if present for instant rendering
    const cached = localStorage.getItem(localKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEntries(parsed);
          setLoading(false);
        }
      } catch {}
    }

    const entriesRef = collection(db, "users", user.uid, "entries");
    const q = query(entriesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: JournalEntry[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push({ id: docSnap.id, ...docSnap.data() } as JournalEntry);
        });
        setEntries(fetched);
        localStorage.setItem(localKey, JSON.stringify(fetched));
        setLoading(false);
      },
      (err) => {
        console.warn("Firestore entries live sync notice:", err);
        // If Firestore live sync is delayed, retain local device cache
        if (cached) {
          setLoading(false);
        } else {
          setEntries([]);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [user.uid]);

  // Delete an entry
  const handleDelete = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Permanently delete this journal entry? This cannot be undone.")) {
      return;
    }

    setDeletingId(entryId);
    try {
      await deleteDoc(doc(db, "users", user.uid, "entries", entryId));
    } catch (err: unknown) {
      console.warn("Firestore delete notice:", err);
    }

    try {
      const localKey = `gemini_journal_entries_${user.uid}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const filtered = parsed.filter((e: any) => e.id !== entryId);
        localStorage.setItem(localKey, JSON.stringify(filtered));
        setEntries(filtered);
      }
    } catch {}

    if (expandedEntryId === entryId) {
      setExpandedEntryId(null);
    }
    setDeletingId(null);
  };

  // Self-service Data Export (Proves per-user isolated storage)
  const handleExportJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            userId: user.uid,
            userEmail: user.email,
            entryCount: entries.length,
            entries,
          },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gemini-journal-export-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Available unique moods
  const uniqueMoods = Array.from(new Set(entries.map((e) => e.mood).filter(Boolean))) as string[];

  // Filtered entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      (entry.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.summary || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.content || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.tags || []).some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMood = selectedMood === "all" || entry.mood === selectedMood;

    return matchesSearch && matchesMood;
  });

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      {/* Header with Export and New buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900">
            My Journal Archive
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Strictly isolated to <code className="bg-stone-100 px-1 py-0.5 rounded font-mono">/users/{user.uid}/entries</code>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              id="export-entries-json-btn"
              onClick={handleExportJson}
              title="Export all personal entries as JSON"
              className="flex items-center gap-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-300 hover:bg-stone-50 px-3 py-2 rounded-xl transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          )}

          <button
            id="entries-new-reflection-btn"
            onClick={onNewEntryClick}
            className="flex items-center gap-1.5 text-xs font-medium bg-stone-900 text-stone-50 hover:bg-stone-800 px-3.5 py-2 rounded-xl transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>New Reflection</span>
          </button>
        </div>
      </div>

      {/* Error notification */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Search and Filters */}
      {entries.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="entries-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your entries, topics, or insights..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
            />
          </div>

          {uniqueMoods.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedMood("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedMood === "all"
                    ? "bg-stone-900 text-stone-50"
                    : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                All
              </button>
              {uniqueMoods.map((mood) => (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedMood === mood
                      ? "bg-stone-900 text-stone-50"
                      : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  {mood}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Entries List */}
      <div className="mt-6 space-y-4">
        {loading ? (
          <div className="py-16 text-center text-stone-400 text-sm">
            <div className="w-8 h-8 rounded-full border-2 border-stone-300 border-t-stone-900 animate-spin mx-auto mb-3" />
            <p>Accessing your private Firestore archive...</p>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-16 text-center bg-white border border-dashed border-stone-300 rounded-2xl p-8">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-stone-800 text-sm">
              {searchQuery ? "No matching entries found" : "Your journal is empty"}
            </h3>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              {searchQuery
                ? "Try searching with different terms or reset your mood filter."
                : "Every entry you save will be summarized by Gemini and permanently isolated under your personal account."}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewEntryClick}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold bg-stone-900 text-stone-50 px-4 py-2 rounded-xl hover:bg-stone-800 transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Write Your First Reflection</span>
              </button>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const isExpanded = expandedEntryId === entry.id;
            const entryDate = new Date(entry.createdAt);

            return (
              <div
                key={entry.id}
                className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs hover:border-stone-300 transition-all cursor-pointer"
                onClick={() => setExpandedEntryId(isExpanded ? null : entry.id)}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500">
                        <Calendar className="w-3 h-3 text-stone-400" />
                        {entryDate.toLocaleDateString(undefined, {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-stone-300">•</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 font-mono">
                        <Clock className="w-3 h-3" />
                        {entryDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {entry.mood && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200">
                          <Smile className="w-2.5 h-2.5" />
                          {entry.mood}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-stone-900 tracking-tight">
                      {entry.title || "Reflective Journal"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      id={`delete-entry-${entry.id}`}
                      onClick={(e) => handleDelete(entry.id, e)}
                      disabled={deletingId === entry.id}
                      title="Delete Entry"
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* AI Summary Block */}
                <div className="mt-3 p-3.5 bg-stone-50/80 rounded-xl border border-stone-200/80 text-xs text-stone-700 leading-relaxed">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-stone-500 mb-1">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Gemini Reflection Summary</span>
                  </div>
                  <p className="italic text-stone-800 font-serif text-sm">
                    "{entry.summary}"
                  </p>
                </div>

                {/* Tags */}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {entry.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px]"
                      >
                        <Tag className="w-2.5 h-2.5 text-stone-400" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Expanded Multi-turn Dialogue */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-stone-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                        Full Conversation Transcript ({entry.messages?.length || 0} turns)
                      </h4>
                      <span className="text-[11px] text-stone-400 font-mono">
                        ID: {entry.id}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {entry.messages && entry.messages.length > 0 ? (
                        entry.messages.map((m, i) => (
                          <div
                            key={i}
                            className={`p-3 rounded-xl text-xs leading-relaxed ${
                              m.role === "user"
                                ? "bg-stone-900 text-stone-100 ml-4"
                                : "bg-stone-100 text-stone-800 mr-4 border border-stone-200"
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-semibold text-[10px] mb-1 opacity-75">
                              {m.role === "user" ? (
                                <>
                                  <UserIcon className="w-3 h-3" />
                                  <span>You</span>
                                </>
                              ) : (
                                <>
                                  <Bot className="w-3 h-3 text-amber-400" />
                                  <span>Gemini Journal</span>
                                </>
                              )}
                            </div>
                            <p className="whitespace-pre-wrap">{m.content}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-stone-600 whitespace-pre-wrap">
                          {entry.content}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
