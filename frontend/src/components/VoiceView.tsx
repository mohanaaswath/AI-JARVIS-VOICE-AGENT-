import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, PhoneOff, Phone, Wifi, AlertCircle } from "lucide-react";
import { Room, RoomEvent, Track } from "livekit-client";
import { fetchLiveKitToken, fetchLiveKitStatus } from "../lib/api";

type VoiceState = "idle" | "connecting" | "connected" | "listening" | "speaking" | "error";

export default function VoiceView() {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lkConfigured, setLkConfigured] = useState<boolean | null>(null);
  const [lkUrl, setLkUrl] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState("Ready to connect");
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    fetchLiveKitStatus()
      .then((s) => {
        setLkConfigured(s.configured);
        setLkUrl(s.url);
      })
      .catch(() => setLkConfigured(false));
  }, []);

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect();
    };
  }, []);

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
        setError("Microphone access denied. Please allow microphone permission and try again.");
      } else {
        setError(msg);
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
    idle: "#64748b",
    connecting: "#f59e0b",
    connected: "#10b981",
    listening: "#3b82f6",
    speaking: "#8b5cf6",
    error: "#ef4444",
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
        gap: "2rem",
      }}
    >
      {/* Status header */}
      <div style={{ textAlign: "center" }}>
        <div className="eyebrow"><span className="eyebrow-dot" /> LIVE AUDIO LINK</div>
        <h1 className="voice-title" style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          Speak with <span className="gradient-text">JARVIS</span>
        </h1>
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
          Real-time intelligence, tuned to your voice.
        </p>
      </div>

      {/* LiveKit config warning */}
      {lkConfigured === false && (
        <div
          style={{
            padding: "1rem",
            background: "rgba(245,158,11,0.1)",
            border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "0.75rem",
            color: "#fcd34d",
            fontSize: "0.85rem",
            maxWidth: 420,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <AlertCircle size={16} />
          LiveKit credentials not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL in your .env file.
        </div>
      )}

      {lkConfigured === true && (
        <div
          style={{
            padding: "0.5rem 1rem",
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: "0.5rem",
            color: "#6ee7b7",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <Wifi size={14} />
          LiveKit configured: {lkUrl}
        </div>
      )}

      {/* Main orb */}
      <div style={{ position: "relative" }}>
        {/* Pulse rings */}
        {(voiceState === "connected" || voiceState === "listening" || voiceState === "speaking") && (
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

        {/* Central orb */}
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
            background: `radial-gradient(circle at 35% 35%, ${color}44, ${color}22)`,
            border: `2px solid ${color}66`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 1,
          }}
        >
          {voiceState === "connecting" ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              style={{
                width: 48,
                height: 48,
                border: `3px solid ${color}33`,
                borderTopColor: color,
                borderRadius: "50%",
              }}
            />
          ) : voiceState === "error" ? (
            <MicOff size={48} color={color} />
          ) : voiceState === "idle" ? (
            <Mic size={48} color={color} />
          ) : (
            /* Wave bars when connected/listening/speaking */
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {Array.from({ length: 7 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="wave-bar"
                  animate={{ height: voiceState === "speaking" ? [4, 24, 4] : [4, 14, 4] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.08,
                    ease: "easeInOut",
                  }}
                  style={{
                    width: 4,
                    borderRadius: 2,
                    background: `linear-gradient(to top, ${color}, #06b6d4)`,
                  }}
                />
              ))}
            </div>
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
            {voiceState.charAt(0).toUpperCase() + voiceState.slice(1)}
          </span>
        </div>
        <p style={{ color: "#64748b", fontSize: "0.85rem" }}>{statusMsg}</p>
      </div>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            style={{
              padding: "0.875rem 1rem",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "0.75rem",
              color: "#fca5a5",
              fontSize: "0.85rem",
              maxWidth: 420,
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
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.4)",
              borderRadius: "0.75rem",
              color: "#fca5a5",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            <PhoneOff size={18} />
            End Session
          </motion.button>
        )}
      </div>

      <p style={{ color: "#334155", fontSize: "0.75rem", textAlign: "center", maxWidth: 360 }}>
        Voice requires the LiveKit agent server (<code style={{ color: "#8b5cf6" }}>venv\Scripts\python.exe -m agent start</code>) to be running separately.
        The web frontend connects via a secure token — your API keys stay on the server.
      </p>
    </div>
  );
}
