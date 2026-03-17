import {
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";

import { COLORS, TYPE_META } from "../constants";

export function CorelinkNode({ data, selected }) {
  const meta = TYPE_META[data.type];
  return (
    <div style={{
      minWidth: "160px",
      background: COLORS.surface,
      border: `0.5px solid ${selected ? meta.color : COLORS.border}`,
      borderRadius: "10px",
      fontFamily: "'IBM Plex Sans', sans-serif",
      transition: "border-color 0.15s",
    }}>
      {data.type !== "sender" && (
        <Handle
          type="target"
          position={Position.Left}
          style={{ background: COLORS.textDim, border: `2px solid ${COLORS.bg}`, width: 12, height: 12 }}
        />
      )}

      <div style={{
        padding: "8px 12px",
        borderBottom: `0.5px solid ${COLORS.border}`,
        display: "flex", alignItems: "center", gap: "8px",
      }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: meta.color, flexShrink: 0 }} />
        <span style={{
          fontSize: "10px", fontWeight: 500, color: meta.color,
          fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.06em",
        }}>
          {meta.label}
        </span>
      </div>

      <div style={{ padding: "10px 12px" }}>
        <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 500, marginBottom: 4 }}>{data.name}</div>
        <div style={{ fontSize: "11px", color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
          id: {data.stream_id}
        </div>
      </div>

      {data.type !== "receiver" && (
        <Handle
          type="source"
          position={Position.Right}
          style={{ background: meta.color, border: `2px solid ${COLORS.bg}`, width: 12, height: 12 }}
        />
      )}
    </div>
  );
}
