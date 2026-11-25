import React, { useState, useEffect, useRef } from "react";
import {
  Send,
  Mic,
  MicOff,
  Bot,
  User,
  Plus,
  Trash2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage, Conversation, UserPreferences } from "../types";
import {
  getConversations,
  saveConversation,
  deleteConversation,
  getMessages,
  saveMessage,
  getPreferences,
} from "../lib/storage";
import { AssistantOrchestrator } from "../lib/assistant";
import { voiceEngine } from "../lib/voice";
import { useNetworkStatus } from "../lib/network";

export default function ChatView() {
  const { isOnline } = useNetworkStatus();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isMicActive, setIsMicActive] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitData();
  }, []);

  const loadInitData = async () => {
    const preferences = await getPreferences();
    setPrefs(preferences);
    setAutoSpeak(preferences.voice.autoSpeak);

    const convList = await getConversations();
    setConversations(convList);

    if (convList.length > 0) {
      selectConversation(convList[0].id);
    } else {
      startNewConversation();
    }
  };

  const selectConversation = async (id: string) => {
    setActiveConvId(id);
    const msgs = await getMessages(id);
    setMessages(msgs);
    scrollToBottom();
  };

  const startNewConversation = async () => {
    const newId = crypto.randomUUID();
    const newConv: Conversation = {
      id: newId,
      title: "New Conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveConversation(newConv);
    setConversations((prev) => [newConv, ...prev]);
    setActiveConvId(newId);
    setMessages([]);
  };

  const handleDeleteConv = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteConversation(id);
    const updated = conversations.filter((c) => c.id !== id);
    setConversations(updated);
    if (activeConvId === id) {
      if (updated.length > 0) {
        selectConversation(updated[0].id);
      } else {
        startNewConversation();
      }
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isProcessing || !prefs) return;

    setInputText("");
    setIsProcessing(true);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId: activeConvId,
      role: "user",
      content: query,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    await saveMessage(userMsg);
    scrollToBottom();

    try {
      const result = await AssistantOrchestrator.processMessage(
        query,
        newHistory,
        isOnline,
        prefs
      );

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId: activeConvId,
        role: "assistant",
        content: result.reply,
        timestamp: Date.now(),
        isOffline: result.isOffline,
        provider: prefs.activeProvider,
        toolCalls: result.toolExecuted
          ? [{ name: result.toolExecuted.name, args: { details: result.toolExecuted.details } }]
          : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      await saveMessage(assistantMsg);
      scrollToBottom();

      // Read aloud if autoSpeak enabled
      if (autoSpeak) {
        voiceEngine.speak(result.reply);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        conversationId: activeConvId,
        role: "assistant",
        content: `Error: ${err.message || "Failed to generate response."}`,
        timestamp: Date.now(),
        isOffline: !isOnline,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Microphone toggle for chat input
  const toggleMic = async () => {
    if (isMicActive) {
      voiceEngine.stopListening();
      setIsMicActive(false);
    } else {
      voiceEngine.onTranscript((text, isFinal) => {
        setInputText(text);
        if (isFinal) {
          handleSend(text);
          voiceEngine.stopListening();
          setIsMicActive(false);
        }
      });
      const ok = await voiceEngine.startListening();
      if (ok) setIsMicActive(true);
    }
  };

  const copyToClipboard = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Sidebar: Sessions list */}
      <div
        style={{
          width: 260,
          borderRight: "1px solid var(--border)",
          background: "var(--bg-secondary)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)" }}>
          <button
            onClick={startNewConversation}
            style={{
              width: "100%",
              padding: "0.6rem",
              borderRadius: "0.6rem",
              background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
              color: "#08090d",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              fontSize: "0.9rem",
            }}
          >
            <Plus size={16} /> New Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem" }}>
          {conversations.map((conv) => {
            const isActive = conv.id === activeConvId;
            return (
              <div
                key={conv.id}
                onClick={() => selectConversation(conv.id)}
                style={{
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  background: isActive ? "var(--nav-active)" : "transparent",
                  border: `1px solid ${isActive ? "var(--accent-cyan)" : "transparent"}`,
                  color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "0.25rem",
                  fontSize: "0.85rem",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 170,
                  }}
                >
                  {conv.title}
                </span>
                <button
                  onClick={(e) => handleDeleteConv(e, conv.id)}
                  style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Chat Flow */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
        {/* Top bar info */}
        <div
          style={{
            padding: "0.75rem 1.5rem",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "var(--bg-glass)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Sparkles size={18} color="var(--accent-cyan)" />
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>AI Intelligence Hub</span>
            <span
              style={{
                fontSize: "0.75rem",
                padding: "0.15rem 0.5rem",
                borderRadius: "1rem",
                background: isOnline ? "rgba(103,232,249,0.15)" : "rgba(255,128,102,0.15)",
                color: isOnline ? "var(--accent-cyan)" : "var(--accent-coral)",
                fontWeight: 600,
              }}
            >
              {isOnline ? "Cloud Online" : "Local Offline"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={() => setAutoSpeak(!autoSpeak)}
              title={autoSpeak ? "Mute automatic speech" : "Enable voice readout"}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "0.4rem",
                padding: "0.35rem 0.6rem",
                color: autoSpeak ? "var(--accent-cyan)" : "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.8rem",
              }}
            >
              {autoSpeak ? <Volume2 size={15} /> : <VolumeX size={15} />}
              {autoSpeak ? "Voice On" : "Voice Off"}
            </button>
          </div>
        </div>

        {/* Messages Stream */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {messages.length === 0 ? (
            <div
              style={{
                margin: "auto",
                textAlign: "center",
                color: "var(--text-secondary)",
                maxWidth: 480,
              }}
            >
              <Bot size={44} style={{ margin: "0 auto 1rem", opacity: 0.5, color: "var(--accent-cyan)" }} />
              <h2 style={{ fontSize: "1.25rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                How may I assist you today?
              </h2>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
                Try asking: "Explain quantum computing", "Save this note", "Create a task for tomorrow", or "Search Google for latest tech news".
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: isUser ? "flex-end" : "flex-start",
                    gap: "0.75rem",
                  }}
                >
                  {!isUser && (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Bot size={18} color="#08090d" />
                    </div>
                  )}

                  <div
                    className="glass"
                    style={{
                      maxWidth: "75%",
                      padding: "1rem 1.25rem",
                      background: isUser ? "rgba(103, 232, 249, 0.09)" : "var(--bg-glass)",
                      borderColor: isUser ? "rgba(103, 232, 249, 0.25)" : "var(--border)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: 600, color: isUser ? "var(--accent-cyan)" : "var(--accent-purple)" }}>
                        {isUser ? "You" : "JARVIS"}
                      </span>
                      <button
                        onClick={() => copyToClipboard(msg.id, msg.content)}
                        style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                        title="Copy message"
                      >
                        {copiedId === msg.id ? <Check size={13} color="var(--accent-cyan)" /> : <Copy size={13} />}
                      </button>
                    </div>

                    <div style={{ fontSize: "0.92rem", lineHeight: 1.6, color: "var(--text-primary)" }}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>

                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div
                        style={{
                          marginTop: "0.6rem",
                          padding: "0.4rem 0.6rem",
                          borderRadius: "0.4rem",
                          background: "rgba(167, 139, 250, 0.12)",
                          fontSize: "0.8rem",
                          color: "var(--accent-purple)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                        }}
                      >
                        <Check size={14} /> Action: {msg.toolCalls[0].name} ({msg.toolCalls[0].args?.details || ""})
                      </div>
                    )}
                  </div>

                  {isUser && (
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <User size={18} color="var(--text-secondary)" />
                    </div>
                  )}
                </div>
              );
            })
          )}
          {isProcessing && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Bot size={18} color="#08090d" />
              </div>
              <div className="glass" style={{ padding: "0.75rem 1.25rem", color: "var(--accent-cyan)", fontSize: "0.85rem" }}>
                JARVIS is formulating response...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Dock */}
        <div style={{ padding: "1rem 1.5rem", background: "var(--bg-secondary)", borderTop: "1px solid var(--border)" }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
          >
            <button
              type="button"
              onClick={toggleMic}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: isMicActive ? "var(--accent-coral)" : "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: isMicActive ? "#ffffff" : "var(--accent-cyan)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {isMicActive ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            <input
              type="text"
              placeholder={isMicActive ? "Listening to your voice..." : "Ask JARVIS anything..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              style={{
                flex: 1,
                padding: "0.75rem 1.25rem",
                borderRadius: "0.75rem",
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                outline: "none",
                fontSize: "0.95rem",
              }}
            />

            <button
              type="submit"
              disabled={!inputText.trim() || isProcessing}
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
                border: "none",
                color: "#08090d",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: inputText.trim() && !isProcessing ? "pointer" : "default",
                opacity: inputText.trim() && !isProcessing ? 1 : 0.4,
                flexShrink: 0,
              }}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
