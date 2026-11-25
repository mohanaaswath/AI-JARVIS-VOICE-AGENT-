import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Radio,
  Sparkles,
} from "lucide-react";
import ArcReactor from "./ArcReactor";
import { voiceEngine, type VoiceEngineStatus } from "../lib/voice";
import { AssistantOrchestrator } from "../lib/assistant";
import { getPreferences, saveMessage, getMessages } from "../lib/storage";
import { useNetworkStatus } from "../lib/network";
import type { ChatMessage, UserPreferences } from "../types";
import { fetchLiveKitStatus, fetchLiveKitToken } from "../lib/api";
import { Room, RoomEvent, Track } from "livekit-client";

type AssistantState = "idle" | "listening" | "processing" | "speaking" | "error";

export default function VoiceView() {
  const { isOnline } = useNetworkStatus();
  const [engineState, setEngineState] = useState<AssistantState>("idle");
  const [audioVolume, setAudioVolume] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [assistantResponse, setAssistantResponse] = useState(
    "Hello! I am JARVIS, your browser voice assistant. How may I assist you today?"
  );
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [conversationId] = useState<string>(() => crypto.randomUUID());
  const [lkConfigured, setLkConfigured] = useState<boolean>(false);
  const [lkConnected, setLkConnected] = useState<boolean>(false);

  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    getPreferences().then((p) => {
      setPrefs(p);
      voiceEngine.updateSettings(p.voice);
    });

    fetchLiveKitStatus()
      .then((s) => setLkConfigured(s.configured))
      .catch(() => setLkConfigured(false));

    // Connect voiceEngine callbacks
    voiceEngine.onVolumeChange((vol) => {
      setAudioVolume(vol);
    });

    voiceEngine.onStateChange((status: VoiceEngineStatus) => {
      if (status.isSpeaking) {
        setEngineState("speaking");
      } else if (status.isListening) {
        setEngineState("listening");
      } else if (status.error) {
        setEngineState("error");
      } else {
        setEngineState("idle");
      }
    });

    voiceEngine.onTranscript((text, isFinal) => {
      if (isFinal) {
        setTranscript(text);
        setInterimText("");
        handleVoiceQuery(text);
      } else {
        setInterimText(text);
      }
    });

    return () => {
      voiceEngine.stopListening();
      voiceEngine.stopSpeaking();
      roomRef.current?.disconnect();
    };
  }, []);

  const handleVoiceQuery = async (queryText: string) => {
    if (!queryText.trim() || !prefs) return;

    setEngineState("processing");

    // Save user message to IndexedDB
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId,
      role: "user",
      content: queryText,
      timestamp: Date.now(),
    };
    await saveMessage(userMsg);

    const history = await getMessages(conversationId);

    const result = await AssistantOrchestrator.processMessage(
      queryText,
      history,
      isOnline,
      prefs
    );

    setAssistantResponse(result.reply);

    // Save assistant message to IndexedDB
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      conversationId,
      role: "assistant",
      content: result.reply,
      timestamp: Date.now(),
      isOffline: result.isOffline,
    };
    await saveMessage(assistantMsg);

    // Speak response
    await voiceEngine.speak(result.reply);
  };

  const toggleMic = async () => {
    if (engineState === "speaking") {
      voiceEngine.stopSpeaking();
      return;
    }

    if (engineState === "listening") {
      voiceEngine.stopListening();
      setEngineState("idle");
    } else {
      voiceEngine.stopSpeaking();
      setTranscript("");
      setInterimText("");
      const success = await voiceEngine.startListening();
      if (success) {
        setEngineState("listening");
      }
    }
  };

  const triggerPrompt = (prompt: string) => {
    setTranscript(prompt);
    handleVoiceQuery(prompt);
  };

  // Optional LiveKit mode
  const toggleLiveKitSession = async () => {
    if (lkConnected) {
      roomRef.current?.disconnect();
      setLkConnected(false);
      setEngineState("idle");
      return;
    }

    try {
      setEngineState("processing");
      const roomName = `jarvis-${Date.now()}`;
      const identity = `user-${crypto.randomUUID().slice(0, 8)}`;
      const { token, url } = await fetchLiveKitToken(roomName, identity);
      const room = new Room();
      roomRef.current = room;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          document.body.appendChild(audioElement);
          audioElement.play().catch(() => {});
          setEngineState("speaking");
        }
      });

      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);
      setLkConnected(true);
      setEngineState("listening");
    } catch (e: any) {
      setEngineState("error");
      setAssistantResponse(`LiveKit connection failed: ${e.message}`);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: "100%",
        padding: "2rem 1.5rem",
        position: "relative",
        maxWidth: 900,
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Top Status Bar */}
      <div
        className="glass"
        style={{
          width: "100%",
          padding: "0.75rem 1.25rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: isOnline ? "var(--accent-cyan)" : "var(--accent-coral)",
              boxShadow: `0 0 10px ${isOnline ? "var(--accent-cyan)" : "var(--accent-coral)"}`,
            }}
          />
          <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
            {isOnline ? "Online Cloud Ready" : "Offline Local Mode"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {lkConfigured && (
            <button
              onClick={toggleLiveKitSession}
              style={{
                background: lkConnected ? "rgba(103,232,249,0.2)" : "transparent",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                padding: "0.35rem 0.75rem",
                fontSize: "0.8rem",
                color: lkConnected ? "var(--accent-cyan)" : "var(--text-secondary)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <Radio size={14} />
              {lkConnected ? "LiveKit Active" : "Connect LiveKit"}
            </button>
          )}

          <span
            style={{
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            STATE: {engineState}
          </span>
        </div>
      </div>

      {/* Central Animated Arc Reactor */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          margin: "2.5rem 0",
        }}
      >
        <ArcReactor
          state={engineState}
          volume={audioVolume}
          size={250}
          onClick={toggleMic}
        />

        <motion.div
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{
            marginTop: "1.5rem",
            fontSize: "0.9rem",
            fontWeight: 600,
            letterSpacing: "0.1em",
            color:
              engineState === "listening"
                ? "var(--accent-cyan)"
                : engineState === "speaking"
                ? "var(--accent-purple)"
                : "var(--text-secondary)",
            textTransform: "uppercase",
          }}
        >
          {engineState === "listening"
            ? "JARVIS is Listening..."
            : engineState === "speaking"
            ? "JARVIS is Speaking (Tap to Interrupt)"
            : engineState === "processing"
            ? "Analyzing..."
            : "Tap Microphone to Speak"}
        </motion.div>
      </div>

      {/* Dialogue Feedback Cards */}
      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        {/* Real-time User Transcript */}
        {(transcript || interimText) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass"
            style={{
              padding: "1rem 1.25rem",
              borderLeft: "3px solid var(--accent-cyan)",
            }}
          >
            <div style={{ fontSize: "0.75rem", color: "var(--accent-cyan)", fontWeight: 600, marginBottom: "0.25rem" }}>
              YOU SAID
            </div>
            <p style={{ color: "var(--text-primary)", fontSize: "1rem" }}>
              {transcript} {interimText && <span style={{ opacity: 0.6 }}>{interimText}</span>}
            </p>
          </motion.div>
        )}

        {/* Assistant Spoken Response */}
        <motion.div
          className="glass"
          style={{
            padding: "1.25rem 1.5rem",
            borderLeft: "3px solid var(--accent-purple)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--accent-purple)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem" }}>
              <Sparkles size={14} /> JARVIS RESPONSE
            </span>
            {engineState === "speaking" && (
              <button
                onClick={() => voiceEngine.stopSpeaking()}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--accent-coral)",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                }}
              >
                Interrupt
              </button>
            )}
          </div>
          <p style={{ color: "var(--text-primary)", fontSize: "1.05rem", lineHeight: 1.6 }}>
            {assistantResponse}
          </p>
        </motion.div>
      </div>

      {/* Suggested Quick Interaction Chips */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          justifyContent: "center",
          marginBottom: "1.5rem",
        }}
      >
        {[
          "Explain artificial intelligence",
          "Save this in my notes",
          "Add task: Review presentation",
          "Search Google for latest tech news",
          "Open YouTube",
        ].map((prompt) => (
          <button
            key={prompt}
            onClick={() => triggerPrompt(prompt)}
            className="glass"
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: "1rem",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s",
              border: "1px solid var(--border)",
            }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Primary Interaction Controls Dock */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1.25rem",
        }}
      >
        <button
          onClick={toggleMic}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background:
              engineState === "listening"
                ? "linear-gradient(135deg, var(--accent-coral), #dc2626)"
                : "linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))",
            border: "none",
            color: engineState === "listening" ? "#ffffff" : "#08090d",
            boxShadow:
              engineState === "listening"
                ? "0 0 30px rgba(248, 113, 113, 0.6)"
                : "0 0 30px rgba(103, 232, 249, 0.4)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.25s",
          }}
        >
          {engineState === "listening" ? <MicOff size={32} /> : <Mic size={32} />}
        </button>
      </div>
    </div>
  );
}
