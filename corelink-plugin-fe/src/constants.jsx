export const getServerHost = () => {
  try { return sessionStorage.getItem('cl_server') || 'http://localhost:20015' } catch { return 'http://localhost:20015' }
}

export const SERVER_HOST = "http://localhost:8000"

export const COLORS = {
  bg: "#0f0f0e",
  surface: "#1a1a18",
  border: "#2a2a27",
  borderHover: "#3a3a37",
  text: "#e8e6e0",
  textMuted: "#888780",
  textDim: "#555553",
  accent: "#1D9E75",
  sender: "#378ADD",
  plugin: "#EF9F27",
  receiver: "#1D9E75",
};

export const TYPE_META = {
  sender:   { color: COLORS.sender,   label: "SENDER" },
  plugin:   { color: COLORS.plugin,   label: "PLUGIN" },
  receiver: { color: COLORS.receiver, label: "RECEIVER" },
};