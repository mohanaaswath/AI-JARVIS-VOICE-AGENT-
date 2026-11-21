// storage.ts — IndexedDB persistence layer for JARVIS PWA
import type {
  ChatMessage,
  Conversation,
  NoteItem,
  TaskItem,
  UserPreferences,
} from "../types";

const DB_NAME = "jarvis_offline_db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this browser"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Conversations store
      if (!db.objectStoreNames.contains("conversations")) {
        const convStore = db.createObjectStore("conversations", { keyPath: "id" });
        convStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // Messages store
      if (!db.objectStoreNames.contains("messages")) {
        const msgStore = db.createObjectStore("messages", { keyPath: "id" });
        msgStore.createIndex("conversationId", "conversationId", { unique: false });
        msgStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Notes store
      if (!db.objectStoreNames.contains("notes")) {
        const noteStore = db.createObjectStore("notes", { keyPath: "id" });
        noteStore.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      // Tasks store
      if (!db.objectStoreNames.contains("tasks")) {
        const taskStore = db.createObjectStore("tasks", { keyPath: "id" });
        taskStore.createIndex("createdAt", "createdAt", { unique: false });
        taskStore.createIndex("completed", "completed", { unique: false });
      }

      // Preferences store
      if (!db.objectStoreNames.contains("preferences")) {
        db.createObjectStore("preferences", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

// ── Conversations & Messages ──────────────────────────────────────────────────

export async function getConversations(): Promise<Conversation[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("conversations", "readonly");
    const store = tx.objectStore("conversations");
    const request = store.getAll();
    request.onsuccess = () => {
      const list = (request.result as Conversation[]) || [];
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveConversation(conv: Conversation): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("conversations", "readwrite");
    const store = tx.objectStore("conversations");
    const request = store.put(conv);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["conversations", "messages"], "readwrite");
    tx.objectStore("conversations").delete(id);

    const msgStore = tx.objectStore("messages");
    const index = msgStore.index("conversationId");
    const req = index.openCursor(IDBKeyRange.only(id));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMessages(conversationId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readonly");
    const index = tx.objectStore("messages").index("conversationId");
    const request = index.getAll(IDBKeyRange.only(conversationId));
    request.onsuccess = () => {
      const list = (request.result as ChatMessage[]) || [];
      list.sort((a, b) => a.timestamp - b.timestamp);
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveMessage(msg: ChatMessage): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["messages", "conversations"], "readwrite");
    tx.objectStore("messages").put(msg);

    // Update conversation updatedAt
    const convStore = tx.objectStore("conversations");
    const convReq = convStore.get(msg.conversationId);
    convReq.onsuccess = () => {
      const conv = convReq.result as Conversation | undefined;
      if (conv) {
        conv.updatedAt = msg.timestamp;
        convStore.put(conv);
      } else {
        convStore.put({
          id: msg.conversationId,
          title: msg.content.slice(0, 40) || "New Conversation",
          createdAt: msg.timestamp,
          updatedAt: msg.timestamp,
        });
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function getNotes(): Promise<NoteItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readonly");
    const store = tx.objectStore("notes");
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result as NoteItem[]) || [];
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveNote(note: NoteItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readwrite");
    const req = tx.objectStore("notes").put(note);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readwrite");
    const req = tx.objectStore("notes").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<TaskItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tasks", "readonly");
    const store = tx.objectStore("tasks");
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result as TaskItem[]) || [];
      list.sort((a, b) => {
        if (a.completed === b.completed) return b.createdAt - a.createdAt;
        return a.completed ? 1 : -1;
      });
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveTask(task: TaskItem): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tasks", "readwrite");
    const req = tx.objectStore("tasks").put(task);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tasks", "readwrite");
    const req = tx.objectStore("tasks").delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Preferences ───────────────────────────────────────────────────────────────

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: "dark",
  activeProvider: "gemini",
  geminiModel: "gemini-1.5-flash",
  openaiModel: "gpt-4o-mini",
  claudeModel: "claude-3-5-sonnet",
  localModelEnabled: false,
  webSearchEnabled: true,
  voice: {
    voiceURI: "",
    lang: "en-US",
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
    autoSpeak: true,
    continuousListening: false,
  },
};

export async function getPreferences(): Promise<UserPreferences> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction("preferences", "readonly");
      const req = tx.objectStore("preferences").get("user_prefs");
      req.onsuccess = () => {
        if (req.result && req.result.value) {
          resolve({ ...DEFAULT_PREFERENCES, ...req.result.value });
        } else {
          resolve(DEFAULT_PREFERENCES);
        }
      };
      req.onerror = () => resolve(DEFAULT_PREFERENCES);
    });
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("preferences", "readwrite");
    const req = tx.objectStore("preferences").put({
      key: "user_prefs",
      value: prefs,
      updatedAt: Date.now(),
    });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Export / Import / Clear ───────────────────────────────────────────────────

export async function exportAllData(): Promise<string> {
  const [conversations, notes, tasks, preferences] = await Promise.all([
    getConversations(),
    getNotes(),
    getTasks(),
    getPreferences(),
  ]);

  const db = await getDB();
  const allMessages: ChatMessage[] = await new Promise((resolve, reject) => {
    const tx = db.transaction("messages", "readonly");
    const req = tx.objectStore("messages").getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  const exportPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    conversations,
    messages: allMessages,
    notes,
    tasks,
    preferences: {
      ...preferences,
      // Clear sensitive keys from export by default for safety
      geminiApiKey: preferences.geminiApiKey ? "REDACTED" : undefined,
      openaiApiKey: preferences.openaiApiKey ? "REDACTED" : undefined,
      claudeApiKey: preferences.claudeApiKey ? "REDACTED" : undefined,
    },
  };

  return JSON.stringify(exportPayload, null, 2);
}

export async function importAllData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ["conversations", "messages", "notes", "tasks"],
      "readwrite"
    );

    if (Array.isArray(data.conversations)) {
      const convStore = tx.objectStore("conversations");
      data.conversations.forEach((c: Conversation) => convStore.put(c));
    }

    if (Array.isArray(data.messages)) {
      const msgStore = tx.objectStore("messages");
      data.messages.forEach((m: ChatMessage) => msgStore.put(m));
    }

    if (Array.isArray(data.notes)) {
      const noteStore = tx.objectStore("notes");
      data.notes.forEach((n: NoteItem) => noteStore.put(n));
    }

    if (Array.isArray(data.tasks)) {
      const taskStore = tx.objectStore("tasks");
      data.tasks.forEach((t: TaskItem) => taskStore.put(t));
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      ["conversations", "messages", "notes", "tasks"],
      "readwrite"
    );
    tx.objectStore("conversations").clear();
    tx.objectStore("messages").clear();
    tx.objectStore("notes").clear();
    tx.objectStore("tasks").clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
