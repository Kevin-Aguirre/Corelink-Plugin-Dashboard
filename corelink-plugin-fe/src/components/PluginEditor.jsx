import { useState } from "react";
import "reactflow/dist/style.css";
import { COLORS } from "../constants";

export function PluginEditor({ onBack, onDeploy }) {
  const [code, setCode] = useState(
    `async def process(data_bytes: bytes, header: dict) -> str:
        word = data_bytes.decode('utf-8')
        # YOUR CODE HERE
        return word.upper()
    `);
    const [language, setLanguage] = useState("python");
    const [deploying, setDeploying] = useState(false);

    const handleDeploy = async () => {
        setDeploying(true);
        await onDeploy(code, language);
        setDeploying(false);
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <button onClick={onBack} style={{
            background: "none", border: "none", color: COLORS.textMuted,
            cursor: "pointer", fontSize: "12px",
            fontFamily: "'IBM Plex Mono', monospace",
            padding: 0,
            }}>
            ← plugins
            </button>
            <select value={language} onChange={e => setLanguage(e.target.value)} style={{
            background: COLORS.surface, border: `0.5px solid ${COLORS.border}`,
            borderRadius: "6px", color: COLORS.textMuted, fontSize: "11px",
            fontFamily: "'IBM Plex Mono', monospace", padding: "4px 8px", cursor: "pointer",
            }}>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            </select>
        </div>

        <div style={{
            fontSize: "11px", color: COLORS.textMuted,
            fontFamily: "'IBM Plex Mono', monospace", marginBottom: "8px",
        }}>
            NEW PLUGIN
        </div>

        <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            spellCheck={false}
            style={{
            flex: 1,
            background: "#0a0a09",
            border: `0.5px solid ${COLORS.border}`,
            borderRadius: "8px",
            color: "#c8e6c9",
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: "12px",
            lineHeight: 1.7,
            padding: "12px",
            resize: "none",
            outline: "none",
            marginBottom: "12px",
            }}
        />

        <button onClick={handleDeploy} disabled={deploying} style={{
            width: "100%", height: "38px",
            background: deploying ? COLORS.surface : COLORS.accent,
            border: "none", borderRadius: "8px",
            color: deploying ? COLORS.textMuted : "#fff",
            fontSize: "13px", fontWeight: 500,
            fontFamily: "'IBM Plex Sans', sans-serif",
            cursor: deploying ? "not-allowed" : "pointer",
        }}>
            {deploying ? "deploying..." : "deploy plugin"}
        </button>
        </div>
    );
}