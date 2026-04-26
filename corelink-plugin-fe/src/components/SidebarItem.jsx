
import { useState, useRef, useEffect } from "react";
import "reactflow/dist/style.css";
import { COLORS, TYPE_META } from "../constants"


export function SidebarItem({ item, onDragStart, onRename, onDeletePlugin, onViewLogs, onEditPlugin }) {
  const meta = TYPE_META[item.role];
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const commitRename = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== item.name) {
      onRename?.(item.stream_id, trimmed);
    } else {
      setEditValue(item.name);
    }
  };

  return (
    <div
      draggable={!editing}
      onDragStart={(e) => onDragStart(e, item)}
      style={{
        padding: "10px 12px",
        border: `0.5px solid ${COLORS.border}`,
        borderRadius: "8px",
        marginBottom: "6px",
        cursor: editing ? "default" : "grab",
        backgroundColor: COLORS.surface,
        display: "flex", alignItems: "center", gap: "10px",
        userSelect: "none",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.borderHover}
      onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
    >
      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: meta.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setEditing(false); setEditValue(item.name); } }}
            style={{
              fontSize: "13px", color: COLORS.text, fontWeight: 500,
              background: COLORS.bg, border: `1px solid ${COLORS.borderHover}`,
              borderRadius: "4px", padding: "2px 6px", width: "100%",
              outline: "none", fontFamily: "'IBM Plex Sans', sans-serif",
            }}
          />
        ) : (
          <div
            onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
            style={{ fontSize: "13px", color: COLORS.text, fontWeight: 500, cursor: "text" }}
            title="Double-click to rename"
          >
            {item.name}
          </div>
        )}
        <div style={{ fontSize: "11px", color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
          id: {item.stream_id}
        </div>
      </div>
      {item.role === "plugin" && (
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEditPlugin?.(item.pluginKey || item.name); }}
            title="Edit plugin code"
            style={{
              width: 24, height: 24, padding: 0,
              background: "none", border: `0.5px solid ${COLORS.border}`,
              borderRadius: "4px", cursor: "pointer",
              color: COLORS.textMuted, fontSize: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.borderHover}
            onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
          >
            &#9998;
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onViewLogs?.(item.pluginKey || item.name); }}
            title="View logs"
            style={{
              width: 24, height: 24, padding: 0,
              background: "none", border: `0.5px solid ${COLORS.border}`,
              borderRadius: "4px", cursor: "pointer",
              color: COLORS.textMuted, fontSize: "12px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.borderHover}
            onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
          >
            &#9776;
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDeletePlugin?.(item.pluginKey || item.name); }}
            title="Stop & delete plugin"
            style={{
              width: 24, height: 24, padding: 0,
              background: "none", border: `0.5px solid ${COLORS.border}`,
              borderRadius: "4px", cursor: "pointer",
              color: "#e55", fontSize: "14px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "#e55"}
            onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
