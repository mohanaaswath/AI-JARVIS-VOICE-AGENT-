// ArcReactor.tsx — Central futuristic animated JARVIS reactor visualization
import { motion } from "framer-motion";

interface ArcReactorProps {
  state: "idle" | "listening" | "processing" | "speaking" | "error";
  volume?: number;
  size?: number;
  onClick?: () => void;
}

export default function ArcReactor({
  state,
  volume = 0,
  size = 220,
  onClick,
}: ArcReactorProps) {
  // Color palette according to state
  const getColors = () => {
    switch (state) {
      case "listening":
        return {
          core: "#67e8f9", // cyan
          ring: "rgba(103, 232, 249, 0.8)",
          glow: "rgba(103, 232, 249, 0.45)",
          label: "LISTENING",
        };
      case "speaking":
        return {
          core: "#a78bfa", // purple
          ring: "rgba(167, 139, 250, 0.85)",
          glow: "rgba(124, 108, 255, 0.5)",
          label: "SPEAKING",
        };
      case "processing":
        return {
          core: "#38bdf8", // light blue
          ring: "rgba(56, 189, 248, 0.8)",
          glow: "rgba(56, 189, 248, 0.4)",
          label: "PROCESSING",
        };
      case "error":
        return {
          core: "#f87171", // coral red
          ring: "rgba(248, 113, 113, 0.8)",
          glow: "rgba(248, 113, 113, 0.4)",
          label: "OFFLINE / ERROR",
        };
      default:
        return {
          core: "#67e8f9",
          ring: "rgba(103, 232, 249, 0.4)",
          glow: "rgba(103, 232, 249, 0.2)",
          label: "ONLINE STANDBY",
        };
    }
  };

  const colors = getColors();
  const dynamicScale = 1 + volume * 0.25;

  return (
    <div
      onClick={onClick}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
      }}
    >
      {/* Outer ambient glow */}
      <motion.div
        animate={{
          scale: [dynamicScale * 0.95, dynamicScale * 1.05, dynamicScale * 0.95],
          opacity: state === "listening" || state === "speaking" ? [0.6, 0.9, 0.6] : [0.25, 0.4, 0.25],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: size * 1.15,
          height: size * 1.15,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
          filter: "blur(14px)",
          pointerEvents: "none",
        }}
      />

      {/* Outer Segmented Ring 1 */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: state === "processing" ? 4 : 20, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          width: size * 0.92,
          height: size * 0.92,
          borderRadius: "50%",
          border: `2px dashed ${colors.ring}`,
          boxShadow: `0 0 15px ${colors.glow}`,
        }}
      />

      {/* Middle Counter-rotating Ring 2 */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: state === "processing" ? 6 : 28, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          width: size * 0.76,
          height: size * 0.76,
          borderRadius: "50%",
          border: `1.5px solid ${colors.ring}`,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
        }}
      />

      {/* Inner Energy Ring 3 */}
      <motion.div
        animate={{
          scale: state === "speaking" ? [0.95, 1.08, 0.95] : [0.98, 1.02, 0.98],
          rotate: 360,
        }}
        transition={{
          scale: { duration: 0.35, repeat: Infinity },
          rotate: { duration: 15, repeat: Infinity, ease: "linear" },
        }}
        style={{
          position: "absolute",
          width: size * 0.58,
          height: size * 0.58,
          borderRadius: "50%",
          border: `2px dotted ${colors.core}`,
        }}
      />

      {/* Glowing Center Core */}
      <motion.div
        animate={{
          scale: state === "speaking" || state === "listening" ? [1, 1.12, 1] : [1, 1.04, 1],
        }}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: size * 0.36,
          height: size * 0.36,
          borderRadius: "50%",
          background: `radial-gradient(circle, #ffffff 15%, ${colors.core} 70%, transparent 100%)`,
          boxShadow: `0 0 25px ${colors.core}, inset 0 0 10px #ffffff`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        <span
          style={{
            fontSize: size * 0.065,
            fontWeight: 800,
            letterSpacing: "0.15em",
            color: "#08090d",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          JARVIS
        </span>
      </motion.div>
    </div>
  );
}
