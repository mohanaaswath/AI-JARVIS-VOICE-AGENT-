// assistant.ts — Orchestrator for Online & Offline Assistant Capabilities, Tools, and Actions
import axios from "axios";
import type {
  ChatMessage,
  NoteItem,
  TaskItem,
  UserPreferences,
} from "../types";
import {
  saveNote,
  saveTask,
  getNotes,
  getTasks,
} from "./storage";

export interface AssistantProcessResult {
  reply: string;
  toolExecuted?: {
    name: string;
    details: string;
    data?: any;
  };
  sources?: { title: string; snippet: string; url: string }[];
  isOffline: boolean;
}

export class AssistantOrchestrator {
  private static baseURL = `${(import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "")}/api`;

  /**
   * Process a user input message, detecting tools and routing to online AI or offline logic.
   */
  public static async processMessage(
    userText: string,
    history: ChatMessage[],
    isOnline: boolean,
    prefs: UserPreferences
  ): Promise<AssistantProcessResult> {
    const trimmed = userText.trim();
    const lower = trimmed.toLowerCase();

    // ── 1. Check for Direct Browser Actions / Intent Tools ─────────────────────

    // Intent: Save note
    if (
      lower.startsWith("save this in my notes") ||
      lower.startsWith("save this explanation in my notes") ||
      lower.startsWith("save to notes") ||
      lower.startsWith("add note") ||
      lower.startsWith("create note") ||
      lower.includes("save note")
    ) {
      let contentToSave = "";
      let title = "JARVIS Note";

      // If user says "save this explanation", look for last assistant message
      if (lower.includes("this") || lower === "save this in my notes") {
        const lastAssistantMsg = [...history].reverse().find((m) => m.role === "assistant");
        if (lastAssistantMsg) {
          contentToSave = lastAssistantMsg.content;
          title = lastAssistantMsg.content.slice(0, 35) + "...";
        }
      }

      if (!contentToSave) {
        // Extract content after "note:" or "add note"
        const cleanContent = trimmed
          .replace(/^(save (this )?(in|to) (my )?notes?:?|add note:?|create note:?)/i, "")
          .trim();
        contentToSave = cleanContent || trimmed;
        title = contentToSave.slice(0, 30) || "New Note";
      }

      const note: NoteItem = {
        id: crypto.randomUUID(),
        title: title,
        content: contentToSave,
        tags: ["voice", "assistant"],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await saveNote(note);

      return {
        reply: `I have saved that to your notes: "${note.title}"`,
        toolExecuted: {
          name: "create_note",
          details: `Created note "${note.title}"`,
          data: note,
        },
        isOffline: !isOnline,
      };
    }

    // Intent: Create task
    if (
      lower.startsWith("add task") ||
      lower.startsWith("create task") ||
      lower.startsWith("new task") ||
      lower.startsWith("remind me to")
    ) {
      const taskTitle = trimmed
        .replace(/^(add task:?|create task:?|new task:?|remind me to:?)/i, "")
        .trim();

      const task: TaskItem = {
        id: crypto.randomUUID(),
        title: taskTitle || "New Task",
        completed: false,
        priority: "medium",
        createdAt: Date.now(),
      };

      await saveTask(task);

      return {
        reply: `Task added to your list: "${task.title}".`,
        toolExecuted: {
          name: "create_task",
          details: `Added task "${task.title}"`,
          data: task,
        },
        isOffline: !isOnline,
      };
    }

    // Intent: Web Navigation / Search Action (Google / YouTube / Website)
    if (
      lower.startsWith("open ") ||
      lower.startsWith("search google for ") ||
      lower.startsWith("search youtube for ")
    ) {
      if (lower.startsWith("search youtube for ")) {
        const q = trimmed.replace(/^search youtube for /i, "").trim();
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
        window.open(url, "_blank", "noopener,noreferrer");
        return {
          reply: `Searching YouTube for "${q}". I have opened the results in a new tab.`,
          toolExecuted: { name: "search_youtube", details: `Search for ${q}` },
          isOffline: !isOnline,
        };
      }

      if (lower.startsWith("search google for ")) {
        const q = trimmed.replace(/^search google for /i, "").trim();
        const url = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
        window.open(url, "_blank", "noopener,noreferrer");
        return {
          reply: `Searching Google for "${q}". I've opened the search in a new tab.`,
          toolExecuted: { name: "search_google", details: `Search for ${q}` },
          isOffline: !isOnline,
        };
      }

      if (lower.startsWith("open youtube")) {
        window.open("https://www.youtube.com", "_blank", "noopener,noreferrer");
        return {
          reply: "Opening YouTube.",
          toolExecuted: { name: "open_website", details: "https://www.youtube.com" },
          isOffline: !isOnline,
        };
      }

      if (lower.startsWith("open google")) {
        window.open("https://www.google.com", "_blank", "noopener,noreferrer");
        return {
          reply: "Opening Google.",
          toolExecuted: { name: "open_website", details: "https://www.google.com" },
          isOffline: !isOnline,
        };
      }

      if (lower.startsWith("open github")) {
        window.open("https://github.com", "_blank", "noopener,noreferrer");
        return {
          reply: "Opening GitHub.",
          toolExecuted: { name: "open_website", details: "https://www.github.com" },
          isOffline: !isOnline,
        };
      }
    }

    // ── 2. Offline Mode Handling ───────────────────────────────────────────────
    if (!isOnline) {
      return this.handleOfflineResponse(trimmed, lower, history);
    }

    // ── 3. Online Mode AI Execution ────────────────────────────────────────────
    try {
      const messagesPayload = [
        ...history.slice(-8).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        { role: "user", content: trimmed },
      ];

      const apiKey =
        prefs.activeProvider === "gemini"
          ? prefs.geminiApiKey
          : prefs.activeProvider === "openai"
          ? prefs.openaiApiKey
          : prefs.claudeApiKey;

      const model =
        prefs.activeProvider === "gemini"
          ? prefs.geminiModel
          : prefs.activeProvider === "openai"
          ? prefs.openaiModel
          : prefs.claudeModel;

      const response = await axios.post(
        `${this.baseURL}/chat`,
        {
          messages: messagesPayload,
          provider: prefs.activeProvider,
          model: model || undefined,
          api_key: apiKey || undefined,
          web_search: prefs.webSearchEnabled,
        },
        { timeout: 35000 }
      );

      const data = response.data;
      return {
        reply: data.content,
        sources: data.sources || undefined,
        isOffline: false,
      };
    } catch (err: any) {
      console.warn("Online AI request failed, falling back:", err);
      // If server unreachable or error, provide graceful fallback
      if (!isOnline || err.code === "ERR_NETWORK" || err.response?.status === 503) {
        return this.handleOfflineResponse(trimmed, lower, history);
      }

      return {
        reply: `I encountered an issue connecting to the AI service: ${
          err.response?.data?.detail || err.message || "Please check your network or API keys in Settings."
        }`,
        isOffline: false,
      };
    }
  }

  /**
   * Safe offline response generator when internet is unavailable.
   */
  private static async handleOfflineResponse(
    _text: string,
    lower: string,
    _history: ChatMessage[]
  ): Promise<AssistantProcessResult> {
    // Check local notes / tasks query
    if (lower.includes("how many notes") || lower.includes("list notes") || lower.includes("show notes")) {
      const notes = await getNotes();
      return {
        reply: `You have ${notes.length} saved notes in your local offline storage. ${
          notes.length > 0 ? "Latest: " + notes[0].title : ""
        }`,
        isOffline: true,
      };
    }

    if (lower.includes("how many tasks") || lower.includes("list tasks") || lower.includes("show tasks")) {
      const tasks = await getTasks();
      const pending = tasks.filter((t) => !t.completed);
      return {
        reply: `You have ${tasks.length} total tasks (${pending.length} pending) in local offline storage.`,
        isOffline: true,
      };
    }

    if (lower.includes("hello") || lower.includes("hey jarvis") || lower.includes("hi")) {
      return {
        reply: "Hello! I am operating in Offline Mode. Your local notes, tasks, and browser voice interaction are fully ready.",
        isOffline: true,
      };
    }

    // General offline notice
    return {
      reply:
        "You are currently offline. Cloud AI inference, real-time web searches, and external APIs require an active internet connection. " +
        "You can still create notes, manage tasks, explore saved conversation history, and use local speech interaction.",
      isOffline: true,
    };
  }
}
