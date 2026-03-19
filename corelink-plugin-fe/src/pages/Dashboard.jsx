import { useState, useCallback, useEffect } from "react";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  useNodesState,
  useEdgesState
} from "reactflow";
import "reactflow/dist/style.css";
import { SERVER_HOST, COLORS } from "../constants"
import { CorelinkNode } from "../components/CorelinkNode"
import { Sidebar } from "../components/Sidebar"
import { Topbar } from '../components/Topbar'

const nodeTypes = { corelink: CorelinkNode };
let nodeIdCounter = 0;

export default function Dashboard() {
  const [tab, setTab] = useState("senders");
  const [showEditor, setShowEditor] = useState(false);
  const [streams, setStreams] = useState([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [deploying, setDeploying] = useState(false);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${SERVER_HOST}/streams`);
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

  const onNodeDoubleClick = useCallback((e, node) => {
    setNodes(prev => prev.filter(n => n.id !== node.id));
    setEdges(prev => prev.filter(ed => ed.source !== node.id && ed.target !== node.id));
  }, [setNodes, setEdges]);

  const onConnect = useCallback((params) => {
      setEdges(prev => addEdge({
        ...params,
        style: { stroke: COLORS.accent, strokeWidth: 1.5, strokeDasharray: "4 3", cursor: "pointer" },
        animated: true,
      }, prev));
    }, [setEdges]);

  const handleDeployPlugin = async (code, name) => {
    try {
      const res = await fetch(`${SERVER_HOST}/plugin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name }),
      });

      const data = await res.json();
      if (data.status === "ok") {
        // Reset connections for all receiver nodes on canvas
        const receiverNodes = nodes.filter(n => n.data.type === "receiver");
        for (const rn of receiverNodes) {
          await fetch(`${SERVER_HOST}/reset-connections/${rn.data.stream_id}`, {
            method: "POST",
          });
        }

        // Update the plugin node on canvas with new stream_id
        const newPluginId = data.plugin.stream_id;
        setNodes(prev => prev.map(n =>
          n.data.type === "plugin"
            ? { ...n, data: { ...n.data, stream_id: newPluginId, name: `plugin ${newPluginId}` } }
            : n
        ));

        setShowEditor(false);
        setTab("plugins");
      } else {
        alert(data.error || "Deploy failed");
      }
    } catch (e) {
      alert("Could not reach backend");
    }
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      for (const edge of edges) {
        const fromNode = nodes.find(n => n.id === edge.source);
        const toNode = nodes.find(n => n.id === edge.target);
        if (!fromNode || !toNode) continue;
        await fetch(`${SERVER_HOST}/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_stream_id: fromNode.data.stream_id,
            to_stream_id: toNode.data.stream_id,
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
          onDeployPlugin={handleDeployPlugin}
          showEditor={showEditor}
          setShowEditor={setShowEditor}
        />
      </div>
    </div>
  );
}