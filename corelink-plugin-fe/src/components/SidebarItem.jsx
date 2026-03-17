import { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { COLORS, TYPE_META } from "../constants"


export function SidebarItem({ item, onDragStart }) {
  const meta = TYPE_META[item.role];
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      style={{
        padding: "10px 12px",
        border: `0.5px solid ${COLORS.border}`,
        borderRadius: "8px",
        marginBottom: "6px",
        cursor: "grab",
        backgroundColor: COLORS.surface,
        display: "flex", alignItems: "center", gap: "10px",
        userSelect: "none",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.borderHover}
      onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: meta.color, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: "13px", color: COLORS.text, fontWeight: 500 }}>{item.name}</div>
        <div style={{ fontSize: "11px", color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
          id: {item.stream_id}
        </div>
      </div>
    </div>
  );
}
