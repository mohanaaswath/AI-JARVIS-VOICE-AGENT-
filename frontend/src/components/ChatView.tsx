import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, RotateCcw, Copy, Check, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { resetChat, streamChat } from "../lib/api";
import type { Message } from "../types";

const SUGGESTED = [
  "What can you help me with?",
  "Explain quantum computing simply",
  "Write a Python function to sort a list",
  "What's the weather like today?",
];

export default function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || loading) return;
      setInput("");
      setError(null);

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: msg,
        timestamp: new Date(),
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setLoading(true);

      try {
        let fullText = "";
        for await (const chunk of streamChat(msg)) {
          fullText += chunk;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: fullText } : m
            )
          );
        }
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, isStreaming: false } : m
          )
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: `⚠️ Error: ${errorMsg}`,
                  isStreaming: false,
                }
              : m
          )
        );
        setError(errorMsg);
      } finally {
        setLoading(false);
        inputRef.current?.focus();
      }
    },
    [input, loading]
  );

  const handleReset = async () => {
    await resetChat();
    setMessages([]);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "relative",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid rgba(139,92,246,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#f1f5f9" }}>
            Chat with JARVIS
          </h1>
          <p style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
            Powered by Google Gemini
          </p>
        </div>
        <button
          onClick={handleReset}
          className="btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem" }}
          title="Clear conversation"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: "1.5rem",
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{ textAlign: "center" }}
            >
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg,#8b5cf6,#06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1rem",
                  boxShadow: "0 0 40px rgba(139,92,246,0.3)",
                }}
              >
                <Bot size={32} color="white" />
              </div>
              <h2
                className="gradient-text"
                style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}
              >
                Hello! I'm JARVIS
              </h2>
              <p style={{ color: "#64748b", fontSize: "0.9rem" }}>
                Your advanced AI personal assistant. Ask me anything.
              </p>
            </motion.div>

            {/* Suggested prompts */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.75rem",
                maxWidth: 480,
                width: "100%",
              }}
            >
              {SUGGESTED.map((s) => (
                <motion.button
                  key={s}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSend(s)}
                  style={{
                    padding: "0.75rem",
                    background: "rgba(139,92,246,0.08)",
                    border: "1px solid rgba(139,92,246,0.2)",
                    borderRadius: "0.75rem",
                    color: "#94a3b8",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    textAlign: "left",
                    transition: "all 0.2s",
                  }}
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: "flex",
                gap: "0.75rem",
                flexDirection: msg.role === "user" ? "row-reverse" : "row",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background:
                    msg.role === "user"
                      ? "linear-gradient(135deg,#3b82f6,#8b5cf6)"
                      : "linear-gradient(135deg,#8b5cf6,#06b6d4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {msg.role === "user" ? (
                  <User size={16} color="white" />
                ) : (
                  <Bot size={16} color="white" />
                )}
              </div>

              {/* Bubble */}
              <div
                style={{
                  maxWidth: "72%",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    padding: "0.875rem 1rem",
                    borderRadius:
                      msg.role === "user"
                        ? "1rem 0.25rem 1rem 1rem"
                        : "0.25rem 1rem 1rem 1rem",
                    background:
                      msg.role === "user"
                        ? "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.25))"
                        : "rgba(17,24,39,0.8)",
                    border:
                      msg.role === "user"
                        ? "1px solid rgba(59,130,246,0.3)"
                        : "1px solid rgba(139,92,246,0.15)",
                    color: "#e2e8f0",
                    fontSize: "0.9rem",
                    lineHeight: 1.65,
                  }}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose-sm">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                      {msg.isStreaming && (
                        <span
                          style={{
                            display: "inline-block",
                            width: 8,
                            height: 16,
                            background: "#8b5cf6",
                            marginLeft: 2,
                            borderRadius: 1,
                            animation: "dot-bounce 1s infinite",
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>

                {/* Copy button */}
                {!msg.isStreaming && (
                  <button
                    onClick={() => copyMessage(msg.id, msg.content)}
                    style={{
                      position: "absolute",
                      top: 4,
                      right: msg.role === "user" ? "auto" : 4,
                      left: msg.role === "user" ? 4 : "auto",
                      opacity: 0,
                      background: "rgba(17,24,39,0.9)",
                      border: "1px solid rgba(139,92,246,0.2)",
                      borderRadius: "0.375rem",
                      padding: "2px 6px",
                      color: "#64748b",
                      cursor: "pointer",
                      fontSize: "0.7rem",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      transition: "opacity 0.2s",
                    }}
                    className="copy-btn"
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.opacity = "0";
                    }}
                  >
                    {copiedId === msg.id ? <Check size={12} /> : <Copy size={12} />}
                    {copiedId === msg.id ? "Copied" : "Copy"}
                  </button>
                )}

                <p
                  style={{
                    fontSize: "0.7rem",
                    color: "#334155",
                    marginTop: "0.25rem",
                    textAlign: msg.role === "user" ? "right" : "left",
                  }}
                >
                  {msg.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
          </div>
        )}

        {error && (
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "0.75rem",
              color: "#fca5a5",
              fontSize: "0.85rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid rgba(139,92,246,0.1)",
          background: "rgba(7,10,18,0.8)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-end",
            background: "rgba(17,24,39,0.8)",
            border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: "1rem",
            padding: "0.75rem",
          }}
        >
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message JARVIS… (Enter to send, Shift+Enter for newline)"
            disabled={loading}
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#f1f5f9",
              fontSize: "0.9rem",
              resize: "none",
              fontFamily: "inherit",
              lineHeight: 1.5,
              maxHeight: 160,
              overflowY: "auto",
            }}
          />
          <button
            id="chat-send-btn"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="btn-glow"
            style={{
              padding: "0.5rem",
              borderRadius: "0.625rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: loading || !input.trim() ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        </div>
        <p style={{ fontSize: "0.7rem", color: "#334155", marginTop: "0.5rem", textAlign: "center" }}>
          JARVIS may make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
