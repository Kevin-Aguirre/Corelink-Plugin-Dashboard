import { useState } from "react";
import "reactflow/dist/style.css";
import { COLORS } from "../constants";

const BOILERPLATE = {
  python: `async def process(data_bytes: bytes, header: dict) -> str:
    word = data_bytes.decode('utf-8')
    # YOUR CODE HERE — must return a string
    return word.upper()
`,

  javascript: `async function process(data, header) {
    // data is a Buffer, header is an object
    const word = data.toString('utf-8');
    // YOUR CODE HERE
    return Buffer.from(word.toUpperCase(), 'utf-8');
}
`,

  cpp: `// Signature required by the Corelink C++ plugin runner.
// Build: see plugin-runner/clients/cpp/Dockerfile
#include <vector>
#include <cstdint>
#include <string>
#include <algorithm>
#include <nlohmann/json.hpp>

std::vector<uint8_t> process(const uint8_t* data, size_t len,
                              const nlohmann::json& header) {
    std::string word(reinterpret_cast<const char*>(data), len);
    // YOUR CODE HERE
    std::transform(word.begin(), word.end(), word.begin(), ::toupper);
    return std::vector<uint8_t>(word.begin(), word.end());
}
`,

  csharp: `// Signature required by the Corelink C# plugin runner.
// Build: see plugin-runner/clients/csharp/Dockerfile
using System.Text;
using Newtonsoft.Json.Linq;

public static async Task<byte[]> ProcessAsync(byte[] data, dynamic header) {
    string word = Encoding.UTF8.GetString(data);
    // YOUR CODE HERE
    await Task.CompletedTask;
    return Encoding.UTF8.GetBytes(word.ToUpper());
}
`,
};

const LANGUAGE_LABELS = {
  python:     "Python",
  javascript: "JavaScript",
  cpp:        "C++",
  csharp:     "C#",
};

const DOCKER_REQUIRED = new Set(["cpp", "csharp"]);

export function PluginEditor({ onBack, onDeploy }) {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(BOILERPLATE.python);
  const [deploying, setDeploying] = useState(false);
  const [pluginName, setPluginName] = useState(`plugin_${Date.now()}`);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(BOILERPLATE[lang]);
  };

  const handleDeploy = async () => {
    setDeploying(true);
    await onDeploy(code, pluginName, language);
    setDeploying(false);
  };

  const dockerRequired = DOCKER_REQUIRED.has(language);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: COLORS.textMuted,
          cursor: "pointer", fontSize: "12px",
          fontFamily: "'IBM Plex Mono', monospace",
          padding: 0,
        }}>
          ← plugins
        </button>

        {/* Language dropdown */}
        <select
          value={language}
          onChange={e => handleLanguageChange(e.target.value)}
          style={{
            background: COLORS.surface, border: `0.5px solid ${COLORS.border}`,
            borderRadius: "6px", color: COLORS.textMuted, fontSize: "11px",
            fontFamily: "'IBM Plex Mono', monospace", padding: "4px 8px", cursor: "pointer",
          }}
        >
          {Object.entries(LANGUAGE_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

      <div style={{
        fontSize: "11px", color: COLORS.textMuted,
        fontFamily: "'IBM Plex Mono', monospace", marginBottom: "8px",
      }}>
        NEW PLUGIN
      </div>

      <input
        value={pluginName}
        onChange={e => setPluginName(e.target.value)}
        placeholder="plugin name"
        style={{
          width: "100%", height: "34px", marginBottom: "8px",
          padding: "0 12px", fontSize: "12px",
          fontFamily: "'IBM Plex Mono', monospace",
          background: COLORS.surface,
          border: `0.5px solid ${COLORS.border}`,
          borderRadius: "8px", color: COLORS.text, outline: "none",
          boxSizing: "border-box",
        }}
      />

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
          marginBottom: "8px",
        }}
      />

      {/* Docker notice for C++ / C# */}
      {dockerRequired && (
        <div style={{
          fontSize: "10px", color: COLORS.textMuted,
          fontFamily: "'IBM Plex Mono', monospace",
          marginBottom: "8px", lineHeight: 1.5,
          padding: "6px 10px",
          border: `0.5px solid ${COLORS.border}`,
          borderRadius: "6px",
        }}>
          {language === "cpp" ? "C++" : "C#"} plugins run in Docker.
          Build the image first:<br />
          <span style={{ color: COLORS.accent }}>
            cd plugin-runner/clients/{language === "cpp" ? "cpp" : "csharp"} &amp;&amp; docker build -t corelink-plugin-{language === "cpp" ? "cpp" : "csharp"}:latest .
          </span>
        </div>
      )}

      <button
        onClick={handleDeploy}
        disabled={deploying}
        style={{
          width: "100%", height: "38px",
          background: deploying ? COLORS.surface : COLORS.accent,
          border: "none", borderRadius: "8px",
          color: deploying ? COLORS.textMuted : "#fff",
          fontSize: "13px", fontWeight: 500,
          fontFamily: "'IBM Plex Sans', sans-serif",
          cursor: deploying ? "not-allowed" : "pointer",
        }}
      >
        {deploying ? "deploying..." : `deploy ${LANGUAGE_LABELS[language].toLowerCase()} plugin`}
      </button>
    </div>
  );
}
