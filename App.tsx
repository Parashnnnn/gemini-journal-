import { useState, useEffect } from "react";
import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { collection, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import { UserProfile } from "./types";
import { Navbar } from "./components/Navbar";
import { JournalChat } from "./components/JournalChat";
import { EntriesList } from "./components/EntriesList";
import { ThreatModelModal } from "./components/ThreatModelModal";
import { IntroScreen } from "./components/IntroScreen";

const DEVICE_UID_KEY = "gemini_journal_device_uid";

function getOrSetPersistentDeviceUid(): string {
  let uid = localStorage.getItem(DEVICE_UID_KEY);
  if (!uid) {
    uid = "anon_" + (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).substring(2, 14));
    localStorage.setItem(DEVICE_UID_KEY, uid);
  }
  return uid;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"journal" | "entries" | "audit">("journal");
  const [entriesCount, setEntriesCount] = useState(0);

  // Intro and transition states
  const [showIntro, setShowIntro] = useState(true);
  const [isIntroFading, setIsIntroFading] = useState(false);

  // Silent anonymous authentication + smooth intro transition
  useEffect(() => {
    let isMounted = true;
    let minTimeElapsed = false;
    let authResolved = false;

    // Trigger smooth fade-out once both conditions are satisfied
    const attemptFadeOut = () => {
      if (minTimeElapsed && authResolved && isMounted) {
        setIsIntroFading(true);
        setTimeout(() => {
          if (isMounted) {
            setShowIntro(false);
          }
        }, 700); // 700ms matches transition-opacity duration
      }
    };

    // Minimum display timer for silky smooth intro animation (approx 2s)
    const introTimer = setTimeout(() => {
      minTimeElapsed = true;
      attemptFadeOut();
    }, 2000);

    // Monitor Firebase Auth State or trigger silent anonymous sign-in
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        if (isMounted) {
          setCurrentUser({
            uid: user.uid,
            email: null,
            displayName: "Anonymous Journaler",
            photoURL: null,
            isAnonymous: true,
          });
          authResolved = true;
          attemptFadeOut();
        }
      } else {
        // Silently sign in anonymously with zero UI prompt
        try {
          await signInAnonymously(auth);
        } catch (err: unknown) {
          console.warn("Silent anonymous sign-in notice:", err);
          // If Anonymous auth provider is disabled in Firebase console,
          // preserve user session via persistent device UID
          const persistentUid = getOrSetPersistentDeviceUid();
          if (isMounted) {
            setCurrentUser({
              uid: persistentUid,
              email: null,
              displayName: "Anonymous Journaler",
              photoURL: null,
              isAnonymous: true,
            });
            authResolved = true;
            attemptFadeOut();
          }
        }
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(introTimer);
      unsubscribe();
    };
  }, []);

  // Monitor entries count for badge in navbar
  useEffect(() => {
    if (!currentUser?.uid) {
      setEntriesCount(0);
      return;
    }

    try {
      const entriesRef = collection(db, "users", currentUser.uid, "entries");
      const unsubscribe = onSnapshot(
        entriesRef,
        (snapshot) => {
          setEntriesCount(snapshot.size);
        },
        (err) => {
          // Fallback to local entries count if Firestore is restricted
          try {
            const local = localStorage.getItem(`gemini_journal_entries_${currentUser.uid}`);
            if (local) {
              const parsed = JSON.parse(local);
              if (Array.isArray(parsed)) {
                setEntriesCount(parsed.length);
              }
            }
          } catch {
            // Ignore
          }
        }
      );

      return () => unsubscribe();
    } catch {
      // Fallback
    }
  }, [currentUser?.uid]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-amber-100 selection:text-amber-900 relative">
      {/* Animated Intro / Loading Screen */}
      {showIntro && <IntroScreen isFading={isIntroFading} />}

      {/* Main Journal Application (Renders underneath with smooth fade-in) */}
      {currentUser && (
        <div className={`flex-1 flex flex-col transition-opacity duration-700 ease-in ${showIntro ? "opacity-0" : "opacity-100"}`}>
          <Navbar
            user={currentUser}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            entriesCount={entriesCount}
          />

          <main className="flex-1">
            {activeTab === "journal" && (
              <JournalChat
                user={currentUser}
                onEntrySaved={() => {
                  // Increments count automatically via snapshot
                }}
              />
            )}

            {activeTab === "entries" && (
              <EntriesList
                user={currentUser}
                onNewEntryClick={() => setActiveTab("journal")}
              />
            )}

            {activeTab === "audit" && <ThreatModelModal />}
          </main>
        </div>
      )}
    </div>
  );
}
