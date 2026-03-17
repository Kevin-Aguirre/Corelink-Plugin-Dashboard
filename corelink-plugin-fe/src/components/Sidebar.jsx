import "reactflow/dist/style.css";
import { SidebarItem } from "../components/SidebarItem";
import { PluginEditor } from "../components/PluginEditor"
import { COLORS } from "../constants";

export function Sidebar({ tab, setTab, streams, onDragStart, onNewPlugin, onDeployPlugin, showEditor, setShowEditor }) {
  const sidebarStyle = {
    width: "260px",
    flexShrink: 0,
    borderLeft: `0.5px solid ${COLORS.border}`,
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    backgroundColor: COLORS.bg,
    height: "100%",
    overflowY: "hidden",
  };
  const tabs = ["senders", "plugins", "receivers"];
  const filtered = {
    senders:   streams.filter(s => s.role === "sender"),
    plugins:   streams.filter(s => s.role === "plugin"),
    receivers: streams.filter(s => s.role === "receiver"),
  };

  if (showEditor) {
    return (
      <div style={{
        width: "260px",
        flexShrink: 0,
        borderLeft: `0.5px solid ${COLORS.border}`,
        padding: "1.25rem",
        display: "flex",
        flexDirection: "column",
        backgroundColor: COLORS.bg,
        height: "100%",
        overflowY: "hidden",
    }}>
        <PluginEditor onBack={() => setShowEditor(false)} onDeploy={onDeployPlugin} />
      </div>
    );
  }

  return (
    <div style={sidebarStyle}>
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
            <SidebarItem key={item.stream_id} item={item} onDragStart={onDragStart} />
          ))
        )}
      </div>
    </div>
  );
}