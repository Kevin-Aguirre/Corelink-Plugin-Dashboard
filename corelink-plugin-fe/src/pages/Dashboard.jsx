import { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState
} from "reactflow";
import "reactflow/dist/style.css";
import { getServerHost, COLORS } from "../constants"
import { CorelinkNode } from "../components/CorelinkNode"
import { Sidebar } from "../components/Sidebar"
import { Topbar } from '../components/Topbar'

const nodeTypes = { corelink: CorelinkNode };
let nodeIdCounter = 0;

export default function Dashboard() {
  const SERVER_HOST = getServerHost();
  const [tab, setTab] = useState("senders");
  const [showEditor, setShowEditor] = useState(false);
  const [streams, setStreams] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${SERVER_HOST}/api/streams`);
        const data = await res.json();
        const list = Object.entries(data).map(([id, info]) => ({
          stream_id: parseInt(id),
          name: `${info.role} ${id}`,
          role: info.role,
          ...info,
        }));
        if (list.length > 0) setStreams(list);
      } catch (e) {}
    };
    fetch_();
    const iv = setInterval(fetch_, 3000);
    return () => clearInterval(iv);
  }, []);

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData("application/reactflow", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/reactflow");
    if (!raw) return;
    const item = JSON.parse(raw);
    if (nodes.find(n => n.data.stream_id === item.stream_id)) return;
    const bounds = e.currentTarget.getBoundingClientRect();
    const position = { x: e.clientX - bounds.left - 80, y: e.clientY - bounds.top - 30 };
    setNodes(prev => [...prev, {
      id: `node-${++nodeIdCounter}`,
      type: "corelink",
      position,
      data: { name: item.name, type: item.role, stream_id: item.stream_id },
    }]);
  }, [nodes, setNodes]);  // ← remove nodes from deps too

  const onEdgeClick = useCallback((e, edge) => {
    e.stopPropagation();
    setEdges(prev => prev.filter(ed => ed.id !== edge.id));
  }, [setEdges]);

  const onNodeDoubleClick = useCallback(async (e, node) => {
    if (node.data.type === "plugin" && node.data.stream_id) {
      await fetch(`${SERVER_HOST}/api/plugin/${node.data.stream_id}`, { method: "DELETE" });
    }
    setNodes(prev => prev.filter(n => n.id !== node.id));
    setEdges(prev => prev.filter(ed => ed.source !== node.id && ed.target !== node.id));
  }, [setNodes, setEdges, SERVER_HOST]);

  const onConnect = useCallback((params) => {
      setEdges(prev => addEdge({
        ...params,
        style: { stroke: COLORS.accent, strokeWidth: 1.5, strokeDasharray: "4 3", cursor: "pointer" },
        animated: true,
      }, prev));
    }, [setEdges]);

  const handleAddPluginToCanvas = (code, name, language) => {
    setNodes(prev => [...prev, {
      id: `node-${++nodeIdCounter}`,
      type: "corelink",
      position: { x: 200 + prev.filter(n => n.data.type === "plugin").length * 60, y: 150 },
      data: { name, type: "plugin", code, language, stream_id: null },
    }]);
    setShowEditor(false);
    setTab("plugins");
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      // Reset pending connections for all receivers on canvas
      for (const rn of nodes.filter(n => n.data.type === "receiver" && n.data.stream_id)) {
        await fetch(`${SERVER_HOST}/api/reset-connections/${rn.data.stream_id}`, { method: "POST" });
      }

      // Spawn plugin nodes that haven't been deployed yet (no stream_id)
      const nodeStreamIds = {}; // node.id → newly assigned stream_id
      for (const node of nodes.filter(n => n.data.type === "plugin" && !n.data.stream_id)) {
        const res = await fetch(`${SERVER_HOST}/api/plugin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: node.data.code, name: node.data.name, language: node.data.language }),
        });
        const data = await res.json();
        if (data.status === "ok") {
          nodeStreamIds[node.id] = data.plugin.stream_id;
        } else {
          alert(data.error || `Failed to deploy plugin ${node.data.name}`);
          setDeploying(false);
          return;
        }
      }

      // Update canvas nodes with newly assigned stream_ids
      if (Object.keys(nodeStreamIds).length > 0) {
        setNodes(prev => prev.map(n =>
          nodeStreamIds[n.id]
            ? { ...n, data: { ...n.data, stream_id: nodeStreamIds[n.id] } }
            : n
        ));
      }

      // Queue connections for all edges
      const getStreamId = (nodeId) => {
        return nodeStreamIds[nodeId] || nodes.find(n => n.id === nodeId)?.data.stream_id;
      };
      for (const edge of edges) {
        const fromId = getStreamId(edge.source);
        const toId = getStreamId(edge.target);
        if (!fromId || !toId) continue;
        await fetch(`${SERVER_HOST}/api/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from_stream_id: fromId, to_stream_id: toId }),
        });
      }
    } catch (e) {
      alert("Deploy failed");
    }
    setDeploying(false);
  };

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      backgroundColor: COLORS.bg, fontFamily: "'IBM Plex Sans', sans-serif",
      color: COLORS.text,
    }}>
      <Topbar onDeploy={handleDeploy} deploying={deploying} edgeCount={edges.length} />

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <div
          style={{ flex: 1, minWidth: 0, position: "relative" }}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onEdgeClick={onEdgeClick}
            onConnect={onConnect}
            onNodeDoubleClick={onNodeDoubleClick}
            nodeTypes={nodeTypes}
            fitView
            style={{ backgroundColor: COLORS.bg }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color={COLORS.border} gap={24} size={1} />
            <Controls
              position="bottom-right"
              style={{
                background: COLORS.surface,
                border: `0.5px solid ${COLORS.border}`,
                borderRadius: "8px",
                margin: "1rem",
              }}
            />
          </ReactFlow>
        </div>

        <Sidebar
          tab={tab}
          setTab={setTab}
          streams={streams}
          onDragStart={handleDragStart}
          onNewPlugin={() => { setTab("plugins"); setShowEditor(true); }}
          onDeployPlugin={handleAddPluginToCanvas}
          showEditor={showEditor}
          setShowEditor={setShowEditor}
        />
      </div>
    </div>
  );
}