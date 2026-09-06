export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  summary: string;
  content: string;
  messages: ChatMessage[];
  mood?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SummaryResponse {
  title: string;
  summary: string;
  mood: string;
  tags: string[];
}
