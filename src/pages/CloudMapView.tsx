import React, { useMemo, useCallback } from 'react';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, addEdge, BackgroundVariant, NodeProps, Handle, Position, MarkerType, Connection, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { usePages } from '../hooks/usePages';
import { useNavigate } from 'react-router-dom';
import { Network, Folder, Users, Box, CheckSquare, Edit3 } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  project: <Folder size={14} />,
  client: <Users size={14} />,
  todo: <CheckSquare size={14} />,
  note: <Edit3 size={14} />,
  base: <Box size={14} />
};

function CustomNode({ data, selected }: NodeProps) {
  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: 'var(--radius-lg)',
      backgroundColor: selected ? 'var(--accent)' : 'var(--bg-surface)',
      border: `2px solid ${selected ? 'var(--accent-strong)' : 'var(--border)'}`,
      boxShadow: selected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      color: selected ? '#fff' : 'var(--text-primary)',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      minWidth: '150px',
      transition: 'var(--transition-interactive)',
      cursor: 'pointer'
    }}>
      <Handle type="target" position={Position.Top} style={{ background: 'var(--text-muted)', width: 6, height: 6 }} />
      
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 24, height: 24, borderRadius: '6px',
        backgroundColor: selected ? 'rgba(255,255,255,0.2)' : data.color ? `${data.color as string}20` : 'var(--bg-app)',
        color: selected ? '#fff' : (data.color as string) || 'var(--text-muted)'
      }}>
        {iconMap[data.typeName as string] || <Box size={14} />}
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {data.title as string}
        </div>
        <div style={{ fontSize: '10px', opacity: 0.7, textTransform: 'uppercase' }}>
          {data.typeName as string}
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: 'var(--text-muted)', width: 6, height: 6 }} />
    </div>
  );
}

const nodeTypes = {
  customNode: CustomNode,
};

export function CloudMapView() {
  const { data } = usePages({ limit: 500 });
  const navigate = useNavigate();

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  React.useEffect(() => {
    if (!data?.items) return;

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Simple layouting logic for the demo (could use dagre in a real app)
    const levelCounts: Record<number, number> = {};
    
    // Calculate levels
    const levels: Record<string, number> = {};
    const getLevel = (id: string, depth = 0): number => {
      if (depth > 10) return 10;
      if (levels[id] !== undefined) return levels[id];
      const page = data.items.find(p => p.id === id);
      if (!page || !page.parentId) {
        levels[id] = 0;
        return 0;
      }
      const parentLevel = getLevel(page.parentId, depth + 1);
      levels[id] = parentLevel + 1;
      return levels[id];
    };

    data.items.forEach(p => getLevel(p.id));

    data.items.forEach((page) => {
      const level = levels[page.id] || 0;
      levelCounts[level] = (levelCounts[level] || 0) + 1;
      
      const x = (levelCounts[level] - 1) * 220;
      const y = level * 150;

      newNodes.push({
        id: page.id,
        type: 'customNode',
        position: { x, y },
        data: { 
          title: page.title, 
          typeName: page.typeName,
          color: page.typeColor || '#868e96'
        }
      });

      if (page.parentId) {
        newEdges.push({
          id: `e-${page.parentId}-${page.id}`,
          source: page.parentId,
          target: page.id,
          animated: true,
          style: { stroke: 'var(--accent)', strokeWidth: 2, opacity: 0.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent)' }
        });
      }
    });

    // Center nodes horizontally
    newNodes.forEach(node => {
      const level = levels[node.id] || 0;
      const totalInLevel = levelCounts[level] || 1;
      const totalWidth = totalInLevel * 220;
      node.position.x = node.position.x - (totalWidth / 2) + 200; // offset
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [data?.items, setNodes, setEdges]);

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)), [setEdges]);

  const onNodeClick = (_: React.MouseEvent, node: any) => {
    navigate(`/page/${node.id}`);
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '16px 24px', 
        borderBottom: '1px solid var(--divider)', 
        backgroundColor: 'var(--bg-surface)',
        display: 'flex', alignItems: 'center', gap: '12px'
      }}>
        <Network color="var(--accent)" />
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Mappa a Nuvola</h1>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Visualizzazione gerarchica di tutti i blocchi interconnessi</p>
        </div>
      </div>
      
      <div style={{ flex: 1, backgroundColor: 'var(--bg-app)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-right"
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={24} size={2} />
        </ReactFlow>
      </div>
    </div>
  );
}
