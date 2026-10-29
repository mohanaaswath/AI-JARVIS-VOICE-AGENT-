import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff, Phone, AlertCircle, Wrench, CheckCircle2, XCircle } from "lucide-react";
import { Room, RoomEvent, Track } from "livekit-client";
import { fetchLiveKitToken, fetchLiveKitStatus, fetchActivity } from "../lib/api";
import type { ActionResult } from "../types";

type VoiceState =
  | "idle"
  | "connecting"
  | "connected"
  | "listening"
  | "executing"
  | "speaking"
  | "error";

export default function VoiceView() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lkConfigured, setLkConfigured] = useState<boolean | null>(null);
  const [statusMsg, setStatusMsg] = useState("Ready to connect");
  const [recentAction, setRecentAction] = useState<ActionResult | null>(null);
  const roomRef = useRef<Room | null>(null);
  const lastActionIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetchLiveKitStatus()
      .then((s) => {
        setLkConfigured(s.configured);
      })
      .catch(() => setLkConfigured(false));
  }, []);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
    };
  }, []);

  // Poll recent activity while connected to show real-time tool execution
  useEffect(() => {
    if (voiceState === "idle" || voiceState === "error") return;

    const interval = setInterval(async () => {
      try {
        const acts = await fetchActivity(1);
        if (acts.length > 0) {
          const latest = acts[0];
          if (latest.action_id !== lastActionIdRef.current) {
            lastActionIdRef.current = latest.action_id;
            setRecentAction(latest);
            // Flash executing state briefly if active
            if (voiceState === "listening") {
              setVoiceState("executing");
              setStatusMsg(`Executed ${latest.action_name}`);
              setTimeout(() => {
                if (roomRef.current) {
                  setVoiceState("listening");
                  setStatusMsg("Listening…");
                }
              }, 2500);
            }
          }
        }
      } catch {
        // Ignore activity fetch errors during call
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [voiceState]);

  const startSession = async () => {
    setError(null);
    setVoiceState("connecting");
    setStatusMsg("Connecting to voice agent…");

    try {
      const roomName = `jarvis-${Date.now()}`;
      const identity = `user-${crypto.randomUUID().slice(0, 8)}`;
      const { token, url } = await fetchLiveKitToken(roomName, identity);
      const room = new Room();
      roomRef.current = room;
      let isConnected = false;

      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio) {
          const audioElement = track.attach();
          audioElement.autoplay = true;
          audioElement.style.display = "none";
          document.body.appendChild(audioElement);
          setVoiceState("speaking");
          setStatusMsg("Assistant is speaking");
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach().forEach((element) => element.remove());
        if (isConnected) {
          setVoiceState("listening");
          setStatusMsg("Listening…");
        }
      });

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        if (speakers.some((speaker) => speaker.identity !== identity)) {
          setVoiceState("speaking");
          setStatusMsg("Assistant is speaking");
        } else if (isConnected) {
          setVoiceState("listening");
          setStatusMsg("Listening…");
        }
      });

      room.on(RoomEvent.Disconnected, () => {
        roomRef.current = null;
        setVoiceState("idle");
        setStatusMsg("Session ended");
      });

      await room.connect(url, token);
      isConnected = true;
      await room.localParticipant.setMicrophoneEnabled(true);
      setVoiceState("listening");
      setStatusMsg("Listening…");
    } catch (err: unknown) {
      roomRef.current?.disconnect();
      roomRef.current = null;
      const msg = err instanceof Error ? err.message : "Connection failed";
      if (msg.includes("Permission denied") || msg.includes("NotAllowedError")) {
        setError("Microphone access denied. Please allow microphone permission in your browser and try again.");
      } else {
        setError("Unable to start the voice session. Ensure the backend API and LiveKit Cloud credentials are valid.");
      }
      setVoiceState("error");
      setStatusMsg("Connection failed");
    }
  };

  const endSession = () => {
    roomRef.current?.disconnect();
    roomRef.current = null;
    setVoiceState("idle");
    setStatusMsg("Session ended");
    setError(null);
  };

  const STATE_COLORS: Record<VoiceState, string> = {
    idle: "#818797",
    connecting: "#ff8066",
    connected: "#67e8f9",
    listening: "#67e8f9",
    executing: "var(--accent-lime)",
    speaking: "#a78bfa",
    error: "#ff8066",
  };

  const color = STATE_COLORS[voiceState];

  return (
    <div
      className="voice-page"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        gap: "1.5rem",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      {/* Status header */}
      <div style={{ textAlign: "center" }}>
        <div className="eyebrow">
          <span className="eyebrow-dot" /> LIVE WINDOWS VOICE LINK
        </div>
        <h1
          className="voice-title"
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
            fontWeight: 800,
            color: "var(--text-primary)",
            marginBottom: "0.5rem",
          }}
        >
          Speak with <span className="gradient-text">JARVIS</span>
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
          Full Windows desktop voice control. Natural speech, tool execution, and verified results.
        </p>
      </div>

      {lkConfigured === false && (
        <div
          style={{
            padding: "0.5rem 1rem",
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "0.5rem",
            color: "var(--accent-coral)",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertCircle size={14} />
          Voice credentials incomplete. Ensure LIVEKIT_URL, LIVEKIT_API_KEY, and GOOGLE_API_KEY are configured in frontend/.env.
        </div>
      )}

      {/* Main orb */}
      <div style={{ position: "relative" }}>
        {(voiceState === "connected" ||
          voiceState === "listening" ||
          voiceState === "executing" ||
          voiceState === "speaking") && (
          <>
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: `2px solid ${color}`,
                }}
                animate={{ scale: 1 + i * 0.35, opacity: 0 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeOut",
                }}
              />
            ))}
          </>
        )}

        {/* Assistant avatar */}
        <motion.div
          animate={{
            scale: voiceState === "speaking" ? [1, 1.05, 1] : 1,
            boxShadow:
              voiceState === "idle"
                ? `0 0 30px ${color}33`
                : `0 0 60px ${color}66`,
          }}
          transition={{ duration: 1, repeat: voiceState === "speaking" ? Infinity : 0 }}
          style={{
            width: 140,
            height: 140,
            borderRadius: "50%",
            border: `2px solid ${color}66`,
            overflow: "hidden",
            position: "relative",
            zIndex: 1,
            background: "#0f172a",
          }}
        >
          <img
            src="/Jarvis%20image.jpg"
            alt="JARVIS assistant"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
          {voiceState === "connecting" && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{
                position: "absolute",
                inset: 44,
                border: "3px solid rgba(255,255,255,0.3)",
                borderTopColor: "#fff",
                borderRadius: "50%",
              }}
            />
          )}
        </motion.div>
      </div>

      {/* Status label */}
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.375rem 0.875rem",
            background: `${color}11`,
            border: `1px solid ${color}33`,
            borderRadius: "2rem",
            marginBottom: "0.5rem",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
          <span style={{ color, fontSize: "0.85rem", fontWeight: 500 }}>
            {voiceState === "executing"
              ? "Executing Windows Tool"
              : voiceState.charAt(0).toUpperCase() + voiceState.slice(1)}
          </span>
        </div>
        <p style={{ color: "#64748b", fontSize: "0.85rem" }}>{statusMsg}</p>
      </div>

      {/* Live Tool Execution Feedback Badge */}
      <AnimatePresence>
        {recentAction && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass"
            style={{
              padding: "0.6rem 1rem",
              borderRadius: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              border: "1px solid var(--border)",
              fontSize: "0.8rem",
              maxWidth: 480,
            }}
          >
            <Wrench size={14} color="var(--accent-lime)" />
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
              {recentAction.action_name}:
            </span>
            <span style={{ color: "#94a3b8", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {recentAction.message}
            </span>
            {recentAction.verification_status === "verified" ? (
              <CheckCircle2 size={14} color="var(--accent-lime)" />
            ) : (
              <XCircle size={14} color="var(--accent-coral)" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              padding: "0.875rem 1rem",
              background: "rgba(255,128,102,0.1)",
              border: "1px solid rgba(255,128,102,0.3)",
              borderRadius: "0.75rem",
              color: "var(--accent-coral)",
              fontSize: "0.85rem",
              maxWidth: 480,
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div style={{ display: "flex", gap: "1rem" }}>
        {voiceState === "idle" || voiceState === "error" ? (
          <motion.button
            id="start-voice-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startSession}
            disabled={lkConfigured === false}
            className="btn-glow"
            style={{
              padding: "0.875rem 2rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.95rem",
              opacity: lkConfigured === false ? 0.4 : 1,
              cursor: lkConfigured === false ? "not-allowed" : "pointer",
            }}
          >
            <Phone size={18} />
            Start Voice Session
          </motion.button>
        ) : (
          <motion.button
            id="end-voice-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={endSession}
            style={{
              padding: "0.875rem 2rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.95rem",
              background: "rgba(255,128,102,0.15)",
              border: "1px solid rgba(255,128,102,0.4)",
              borderRadius: "0.75rem",
              color: "var(--accent-coral)",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <PhoneOff size={18} />
            End Session
          </motion.button>
        )}
      </div>
    </div>
  );
}
