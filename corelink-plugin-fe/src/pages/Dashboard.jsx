import { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState
} from "reactflow";
import "reactflow/dist/style.css";
import { COLORS } from "../constants"
import { CorelinkNode } from "../components/CorelinkNode"
import { Sidebar } from "../components/Sidebar"
import { Topbar } from '../components/Topbar'


let nodeIdCounter = 0;

export default function Dashboard() {
  const nodeTypes = { corelink: CorelinkNode };

  const [tab, setTab] = useState("senders");
  const [showEditor, setShowEditor] = useState(false);
  const [streams, setStreams] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [deploying, setDeploying] = useState(false);

  // Poll streams from backend
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch("http://localhost:8000/streams");
        const data = await res.json();
        const list = Object.entries(data).map(([id, info]) => ({
          stream_id: parseInt(id),
          name: `${info.role} ${id}`,
          role: info.role,
          ...info,
        }));
        setStreams(list);
      } catch (e) {}
    };
    fetch_();
    const iv = setInterval(fetch_, 3000);
    return () => clearInterval(iv);
  }, []);

  // Drag from sidebar
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
  }, [nodes, setNodes]);

  const onConnect = useCallback((params) => {
    setEdges(prev => addEdge({
      ...params,
      style: { stroke: COLORS.accent, strokeWidth: 1.5, strokeDasharray: "4 3" },
      animated: true,
    }, prev));
  }, [setEdges]);

  // Deploy plugin
  const handleDeployPlugin = async (code) => {
    try {
      const res = await fetch("http://localhost:8000/plugin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.status === "ok") {
        setShowEditor(false);
        setTab("plugins");
      } else {
        alert(data.error || "Deploy failed");
      }
    } catch (e) {
      alert("Could not reach backend");
    }
  };

  // Deploy all edges
  const handleDeploy = async () => {
    setDeploying(true);
    try {
      for (const edge of edges) {
        const fromNode = nodes.find(n => n.id === edge.source);
        const toNode   = nodes.find(n => n.id === edge.target);
        if (!fromNode || !toNode) continue;
        await fetch("http://localhost:8000/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_stream_id: fromNode.data.stream_id,
            to_stream_id:   toNode.data.stream_id,
          }),
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
          style={{ flex: 1 }}
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            style={{ backgroundColor: COLORS.bg }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color={COLORS.border} gap={24} size={1} />
            <Controls style={{
              background: COLORS.surface,
              border: `0.5px solid ${COLORS.border}`,
              borderRadius: "8px",
            }} />
          </ReactFlow>
        </div>

        <Sidebar
          tab={tab}
          setTab={setTab}
          streams={streams}
          onDragStart={handleDragStart}
          onNewPlugin={() => { setTab("plugins"); setShowEditor(true); }}
          onDeployPlugin={handleDeployPlugin}
          showEditor={showEditor}
          setShowEditor={setShowEditor}
        />
      </div>
    </div>
  );
}