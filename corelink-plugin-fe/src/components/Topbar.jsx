import "reactflow/dist/style.css";
import { COLORS } from "../constants";


export function Topbar({ onDeploy, deploying, edgeCount }) {
  return (
    <div style={{
      height: "48px",
      borderBottom: `0.5px solid ${COLORS.border}`,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 1.25rem", flexShrink: 0,
      backgroundColor: COLORS.bg,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: COLORS.accent }} />
        <span style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: "12px",
          fontWeight: 500, color: COLORS.textMuted, letterSpacing: "0.08em",
        }}>
          CORELINK
        </span>
        <span style={{ fontSize: "11px", color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}>
          / workspace
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {edgeCount > 0 && (
          <span style={{ fontSize: "11px", color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
            {edgeCount} connection{edgeCount !== 1 ? "s" : ""}
          </span>
        )}
        <button
          onClick={onDeploy}
          disabled={deploying || edgeCount === 0}
          style={{
            height: "32px", padding: "0 16px",
            background: deploying || edgeCount === 0 ? COLORS.surface : COLORS.accent,
            border: `0.5px solid ${deploying || edgeCount === 0 ? COLORS.border : COLORS.accent}`,
            borderRadius: "8px",
            color: deploying || edgeCount === 0 ? COLORS.textMuted : "#fff",
            fontSize: "12px", fontWeight: 500,
            fontFamily: "'IBM Plex Sans', sans-serif",
            cursor: deploying || edgeCount === 0 ? "not-allowed" : "pointer",
          }}
        >
          {deploying ? "deploying..." : "deploy"}
        </button>
      </div>
    </div>
  );
}