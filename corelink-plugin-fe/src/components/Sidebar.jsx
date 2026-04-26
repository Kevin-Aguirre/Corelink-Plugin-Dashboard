import { useState, useCallback, useRef } from "react";
import "reactflow/dist/style.css";
import { SidebarItem } from "../components/SidebarItem";
import { PluginEditor } from "../components/PluginEditor";
import { COLORS } from "../constants";

export function Sidebar({ tab, setTab, streams, onDragStart, onNewPlugin, onDeployPlugin, showEditor, setShowEditor, onRename, onDeletePlugin, onViewLogs, onEditPlugin, editPlugin, serverHost, authHeaders }) {
  const [width, setWidth] = useState(520);
  const widthRef = useRef(520);
  const draggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    draggingRef.current = true;
    setIsDragging(true);

    const startX = e.clientX;
    const startWidth = widthRef.current;

    const onMouseMove = (e) => {
      const delta = startX - e.clientX; 
      const newWidth = Math.min(600, Math.max(200, startWidth + delta));
      widthRef.current = newWidth;
      setWidth(newWidth);
    };

    const onMouseUp = () => {
      draggingRef.current = false;
      setIsDragging(false);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, []);

  const sidebarStyle = {
    width: `${width}px`,
    flexShrink: 0,
    borderLeft: `0.5px solid ${COLORS.border}`,
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    backgroundColor: COLORS.bg,
    height: "100%",
    overflowY: "hidden",
    overflowX: "visible",  // ← allow handle to bleed left
    position: "relative",
    userSelect: isDragging ? "none" : "auto",
  };

  const tabs = ["senders", "plugins", "receivers"];
  const filtered = {
    senders:   streams.filter(s => s.role === "sender"),
    plugins:   streams.filter(s => s.role === "plugin"),
    receivers: streams.filter(s => s.role === "receiver"),
  };

  const resizeHandle = (
  <div
    onMouseDown={handleMouseDown}
    style={{
      position: "absolute",
      left: "-5px",  // ← left edge
      top: 0,
      bottom: 0,
      width: "10px",
      cursor: "col-resize",
      backgroundColor: isDragging ? COLORS.accent : "transparent",
      transition: "background-color 0.15s",
      zIndex: 100,
    }}
    onMouseEnter={e => e.currentTarget.style.backgroundColor = COLORS.borderHover}
    onMouseLeave={e => { if (!draggingRef.current) e.currentTarget.style.backgroundColor = "transparent"; }}
  />
);

  if (showEditor) {
    return (
      <div style={sidebarStyle}>
        {resizeHandle}
        <PluginEditor onBack={() => setShowEditor(false)} onDeploy={onDeployPlugin} editPlugin={editPlugin} serverHost={serverHost} authHeaders={authHeaders} />
      </div>
    );
  }

  return (
    <div style={sidebarStyle}>
      {resizeHandle}

      <div style={{ display: "flex", gap: "4px", marginBottom: "1.25rem" }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: "6px 4px",
            background: tab === t ? COLORS.surface : "none",
            border: `0.5px solid ${tab === t ? COLORS.border : "transparent"}`,
            borderRadius: "6px",
            color: tab === t ? COLORS.text : COLORS.textMuted,
            fontSize: "10px", fontWeight: 500,
            fontFamily: "'IBM Plex Mono', monospace",
            letterSpacing: "0.05em",
            cursor: "pointer", textTransform: "uppercase",
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === "plugins" && (
        <button
          onClick={onNewPlugin}
          style={{
            width: "100%", height: "36px", marginBottom: "12px",
            background: "none",
            border: `0.5px dashed ${COLORS.border}`,
            borderRadius: "8px",
            color: COLORS.plugin,
            fontSize: "12px", fontWeight: 500,
            fontFamily: "'IBM Plex Sans', sans-serif",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = COLORS.plugin}
          onMouseLeave={e => e.currentTarget.style.borderColor = COLORS.border}
        >
          + new plugin
        </button>
      )}

      <div style={{ overflowY: "auto", flex: 1 }}>
        {filtered[tab].length === 0 ? (
          <div style={{ fontSize: "12px", color: COLORS.textDim, textAlign: "center", marginTop: "2rem" }}>
            no {tab} registered
          </div>
        ) : (
          filtered[tab].map(item => (
            <SidebarItem key={item.stream_id} item={item} onDragStart={onDragStart} onRename={onRename} onDeletePlugin={onDeletePlugin} onViewLogs={onViewLogs} onEditPlugin={onEditPlugin} />
          ))
        )}
      </div>
    </div>
  );
}