import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "Testuser",
    password: "Testpassword",
    host: "localhost",
    port: "20012",
    workspace: "Holodeck",
  });
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const serverUrl = `http://${form.host}:20015`;
      const res = await fetch(`${serverUrl}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username, password: form.password }),
      });
      const data = await res.json();
      if (res.ok && data.status === "ok") {
        sessionStorage.setItem("cl_server", serverUrl);
        sessionStorage.setItem("cl_workspace", form.workspace);
        if (data.token) sessionStorage.setItem("cl_token", data.token);
        navigate("/dashboard");
      } else {
        setError(data.error || "Authentication failed.");
      }
    } catch (e) {
      setError(`Could not reach server at http://${form.host}:20015 — is the corelink server running?`);
    }
    setLoading(false);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.dot} />
          CORELINK
        </div>
        <h1 style={styles.h1}>Connect to server</h1>
        <p style={styles.sub}>Enter your credentials to access the dashboard</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>USERNAME</label>
              <input
                style={styles.input}
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Testuser"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>PASSWORD</label>
              <input
                style={styles.input}
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>HOST</label>
            <input
              style={styles.input}
              name="host"
              value={form.host}
              onChange={handleChange}
              placeholder="corelink.hpc.nyu.edu"
            />
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>PORT</label>
              <input
                style={styles.input}
                name="port"
                type="number"
                value={form.port}
                onChange={handleChange}
                placeholder="20012"
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>WORKSPACE</label>
              <input
                style={styles.input}
                name="workspace"
                value={form.workspace}
                onChange={handleChange}
                placeholder="Holodeck"
              />
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? "Connecting..." : "Connect"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f3",
    fontFamily: "'IBM Plex Sans', sans-serif",
    padding: "2rem",
  },
  card: {
    backgroundColor: "#ffffff",
    border: "0.5px solid #e0e0db",
    borderRadius: "12px",
    padding: "2rem",
    width: "100%",
    maxWidth: "420px",
  },
  logo: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: "12px",
    fontWeight: 500,
    color: "#888780",
    letterSpacing: "0.08em",
    marginBottom: "2rem",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: "#1D9E75",
    display: "inline-block",
  },
  h1: {
    fontSize: "22px",
    fontWeight: 500,
    color: "#2c2c2a",
    marginBottom: "0.25rem",
  },
  sub: {
    fontSize: "14px",
    color: "#888780",
    marginBottom: "1.75rem",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  field: {
    marginBottom: "1rem",
  },
  label: {
    display: "block",
    fontSize: "11px",
    fontWeight: 500,
    color: "#888780",
    letterSpacing: "0.05em",
    marginBottom: "6px",
    fontFamily: "'IBM Plex Mono', monospace",
  },
  input: {
    width: "100%",
    height: "38px",
    padding: "0 12px",
    fontSize: "14px",
    fontFamily: "'IBM Plex Sans', sans-serif",
    backgroundColor: "#f5f5f3",
    border: "0.5px solid #e0e0db",
    borderRadius: "8px",
    color: "#2c2c2a",
    outline: "none",
    boxSizing: "border-box",
  },
  error: {
    marginTop: "1rem",
    padding: "10px 12px",
    backgroundColor: "#fcebeb",
    border: "0.5px solid #f09595",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#a32d2d",
  },
  btn: {
    width: "100%",
    height: "40px",
    marginTop: "1.5rem",
    backgroundColor: "#1D9E75",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 500,
    fontFamily: "'IBM Plex Sans', sans-serif",
    cursor: "pointer",
  },
};