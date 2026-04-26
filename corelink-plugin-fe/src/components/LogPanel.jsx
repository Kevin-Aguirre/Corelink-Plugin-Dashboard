import { useState, useEffect, useRef } from "react";
import { COLORS } from "../constants";

export function LogPanel({ pluginName, serverHost, authHeaders, onClose }) {
  const [logs, setLogs] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(
          `${serverHost}/api/plugin/${encodeURIComponent(pluginName)}/logs`,
          { headers: authHeaders() }
        );
        const data = await res.json();
        setLogs(data.logs || []);
      } catch (e) {}
    };
    fetchLogs();
    const iv = setInterval(fetchLogs, 2000);
    return () => clearInterval(iv);
  }, [pluginName, serverHost]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0,
      height: "240px",
      backgroundColor: COLORS.bg,
      borderTop: `0.5px solid ${COLORS.border}`,
      display: "flex", flexDirection: "column",
      fontFamily: "'IBM Plex Mono', monospace",
      zIndex: 50,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 16px",
        borderBottom: `0.5px solid ${COLORS.border}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: "11px", color: COLORS.textMuted, letterSpacing: "0.05em" }}>
          LOGS &mdash; {pluginName}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: COLORS.textMuted, fontSize: "16px", padding: "0 4px",
          }}
        >
          &times;
        </button>
      </div>
      <div style={{
        flex: 1, overflowY: "auto", padding: "8px 16px",
        fontSize: "12px", lineHeight: "1.6",
      }}>
        {logs.length === 0 ? (
          <div style={{ color: COLORS.textDim }}>no logs yet</div>
        ) : (
          logs.map((entry, i) => (
            <div key={i} style={{ color: entry.level === "error" ? "#e55" : COLORS.textMuted }}>
              <span style={{ color: COLORS.textDim, marginRight: "8px" }}>
                {new Date(entry.ts).toLocaleTimeString()}
              </span>
              {entry.msg}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
