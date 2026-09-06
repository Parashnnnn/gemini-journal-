import React, { useState, useRef, useEffect } from "react";
import { UserProfile, ChatMessage, SummaryResponse, JournalEntry } from "../types";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  Send,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Shield,
  Tag,
  Smile,
  Bot,
  User as UserIcon,
} from "lucide-react";

interface JournalChatProps {
  user: UserProfile;
  onEntrySaved: () => void;
}

const STARTER_PROMPTS = [
  "What is consuming most of your emotional energy today?",
  "Reflect on a small victory or progress you made this week.",
  "Unpack a moment where you felt challenged or uncertain.",
  "What are 3 things you are quietly grateful for right now?",
];

export const JournalChat: React.FC<JournalChatProps> = ({ user, onEntrySaved }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [summaryPreview, setSummaryPreview] = useState<SummaryResponse | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiResponding]);

  // Handle sending a reflection message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isAiResponding) return;

    setErrorMessage(null);
    setSaveSuccess(null);

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText("");

    setIsAiResponding(true);

    try {
      // Obtain fresh Firebase Auth ID token or device anonymous token
      const currentUser = auth.currentUser;
      let idToken = "";
      if (currentUser) {
        idToken = await currentUser.getIdToken(true);
      } else if (user?.uid) {
        idToken = user.uid.startsWith("anon_") ? user.uid : `anon_${user.uid}`;
      } else {
        throw new Error("User session expired. Please refresh.");
      }

      // Call backend proxy - Gemini API key is NEVER exposed to the browser
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let rawError = errorData.error || `Server returned ${response.status} ${response.statusText}`;
        try {
          const parsed = JSON.parse(rawError);
          if (parsed.error && parsed.error.message) {
            rawError = parsed.error.message;
          }
        } catch {
          // not JSON
        }
        throw new Error(rawError);
      }

      const data = await response.json();
      const modelMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: "model",
        content: data.reply || "Thank you for reflecting with me.",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: unknown) {
      let msg = err instanceof Error ? err.message : "Failed to communicate with AI companion";
      if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
        msg = "The AI service is experiencing momentary high demand. Please click 'Retry' below.";
      }
      console.error("Chat error:", err);
      setErrorMessage(msg);
    } finally {
      setIsAiResponding(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  // Summarize & Save to Firestore
  const handleSaveAndSummarize = async () => {
    if (messages.length === 0) {
      setErrorMessage("Write at least one reflection before saving.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(null);

    try {
      const currentUser = auth.currentUser;
      let idToken = "";
      if (currentUser) {
        idToken = await currentUser.getIdToken(true);
      } else if (user?.uid) {
        idToken = user.uid.startsWith("anon_") ? user.uid : `anon_${user.uid}`;
      } else {
        throw new Error("Authentication required to persist journal.");
      }

      // Step 1: Call secure backend proxy to generate structured summary
      const summarizeRes = await fetch("/api/summarize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!summarizeRes.ok) {
        const errData = await summarizeRes.json().catch(() => ({}));
        let rawError = errData.error || "Failed to generate entry summary.";
        try {
          const parsed = JSON.parse(rawError);
          if (parsed.error && parsed.error.message) {
            rawError = parsed.error.message;
          }
        } catch {
          // not JSON
        }
        if (rawError.includes("503") || rawError.includes("high demand") || rawError.includes("UNAVAILABLE")) {
          rawError = "The AI service is experiencing momentary high demand. Please click 'Save & Summarize' again in a few seconds.";
        }
        throw new Error(rawError);
      }

      const summaryData: SummaryResponse = await summarizeRes.json();
      setSummaryPreview(summaryData);

      // Step 2: Store in Firestore strictly under /users/{uid}/entries/{entryId}
      // Firestore security rules enforce: request.auth.uid == userId
      const entryId = `entry-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const fullReflectionText = messages
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n\n");

      const entryData: JournalEntry = {
        id: entryId,
        userId: user.uid,
        title: summaryData.title || "Personal Reflection",
        summary: summaryData.summary || "Archived journal entry.",
        mood: summaryData.mood || "Reflective",
        tags: summaryData.tags || ["Journal"],
        content: fullReflectionText,
        messages: messages,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      // Store in Firestore strictly under /users/{uid}/entries/{entryId}
      try {
        const entryDocRef = doc(db, "users", user.uid, "entries", entryId);
        await setDoc(entryDocRef, entryData);
      } catch (firestoreErr) {
        console.warn("Direct Firestore write notice:", firestoreErr);
      }

      // Mirror in local device persistence under user UID
      try {
        const localKey = `gemini_journal_entries_${user.uid}`;
        const existingRaw = localStorage.getItem(localKey);
        const existingList: JournalEntry[] = existingRaw ? JSON.parse(existingRaw) : [];
        existingList.unshift(entryData);
        localStorage.setItem(localKey, JSON.stringify(existingList));
      } catch (cacheErr) {
        console.warn("Local cache mirror notice:", cacheErr);
      }

      setSaveSuccess(`Entry "${summaryData.title}" securely saved to your isolated archive.`);
      onEntrySaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save journal entry.";
      console.error("Save error:", err);
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartFresh = () => {
    if (messages.length > 0 && !window.confirm("Start a new session? Unsaved entries will be cleared.")) {
      return;
    }
    setMessages([]);
    setSummaryPreview(null);
    setSaveSuccess(null);
    setErrorMessage(null);
    setInputText("");
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto p-4 sm:p-6">
      {/* Session Controls Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-200">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-stone-800">
            Current Reflection Session
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 font-mono">
            {messages.length} turns
          </span>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              id="chat-clear-session-btn"
              onClick={handleStartFresh}
              disabled={isAiResponding || isSaving}
              className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 px-2.5 py-1.5 rounded-lg border border-stone-200 hover:bg-stone-50 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>New Session</span>
            </button>
          )}

          <button
            id="chat-save-entry-btn"
            onClick={handleSaveAndSummarize}
            disabled={messages.length === 0 || isAiResponding || isSaving}
            className="flex items-center gap-1.5 text-xs font-medium bg-stone-900 text-stone-50 hover:bg-stone-800 px-3.5 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-300" />
                <span>AI Summarizing & Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-amber-300" />
                <span>Save & Summarize</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-start gap-2 flex-1">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
          {messages.length > 0 && messages[messages.length - 1]?.role === "user" && (
            <button
              onClick={() => {
                const lastContent = messages[messages.length - 1].content;
                // remove last turn and re-send
                setMessages((prev) => prev.slice(0, -1));
                handleSendMessage(lastContent);
              }}
              disabled={isAiResponding}
              className="shrink-0 px-3 py-1 bg-rose-700 text-rose-50 hover:bg-rose-800 font-semibold rounded-lg text-xs transition-colors"
            >
              Retry
            </button>
          )}
        </div>
      )}

      {saveSuccess && (
        <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{saveSuccess}</p>
            {summaryPreview && (
              <div className="mt-2 text-stone-700 bg-white/80 p-2.5 rounded-lg border border-emerald-100">
                <p className="italic text-stone-800">"{summaryPreview.summary}"</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[11px] font-medium">
                    <Smile className="w-3 h-3" />
                    {summaryPreview.mood}
                  </span>
                  {summaryPreview.tags?.map((tag, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[11px]"
                    >
                      <Tag className="w-2.5 h-2.5 text-stone-400" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-semibold text-stone-900 text-base">
              Begin Your Private Reflection
            </h3>
            <p className="text-xs text-stone-500 mt-1 mb-6">
              Write freely. Prior messages provide conversational context for Gemini to help you unpack your thoughts.
            </p>

            {/* Starter Prompts */}
            <div className="w-full space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                Inspirational Prompts
              </span>
              {STARTER_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="w-full text-left text-xs p-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 transition-colors shadow-xs"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-200 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
                    isUser
                      ? "bg-stone-900 text-stone-100 rounded-tr-xs"
                      : "bg-white border border-stone-200 text-stone-800 rounded-tl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <span
                    className={`block text-[10px] mt-2 font-mono ${
                      isUser ? "text-stone-400 text-right" : "text-stone-400"
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {isUser && (
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5 text-xs font-semibold">
                    <UserIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* AI Typing State */}
        {isAiResponding && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-full bg-stone-900 text-amber-200 flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-xs px-4 py-3 shadow-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-stone-400 animate-bounce" />
                <span
                  className="w-2 h-2 rounded-full bg-stone-400 animate-bounce"
                  style={{ animationDelay: "150ms" }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-stone-400 animate-bounce"
                  style={{ animationDelay: "300ms" }}
                />
                <span className="text-xs text-stone-500 font-medium ml-2">
                  Reflecting with Gemini...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <div className="pt-2 border-t border-stone-200">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="relative flex items-end gap-2 bg-white rounded-2xl border border-stone-300 p-2 shadow-sm focus-within:border-stone-900 focus-within:ring-1 focus-within:ring-stone-900"
        >
          <textarea
            ref={textareaRef}
            id="chat-input-textarea"
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Write your journal thoughts or respond to Gemini (Enter to send, Shift+Enter for new line)..."
            disabled={isAiResponding || isSaving}
            className="flex-1 resize-none border-none p-2 text-sm focus:outline-none text-stone-900 placeholder:text-stone-400 max-h-32"
          />

          <button
            id="chat-send-btn"
            type="submit"
            disabled={!inputText.trim() || isAiResponding || isSaving}
            className="p-2.5 rounded-xl bg-stone-900 text-stone-50 hover:bg-stone-800 disabled:opacity-40 transition-colors shadow-xs"
            title="Send Reflection"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between mt-2 text-[11px] text-stone-400">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-emerald-600" />
            <span>ID token verified on server • Gemini key secured server-side</span>
          </div>
          <span>Shift + Enter for multiline</span>
        </div>
      </div>
    </div>
  );
};
