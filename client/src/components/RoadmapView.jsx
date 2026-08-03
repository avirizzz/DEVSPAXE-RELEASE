import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow, MiniMap, Controls, Background,
  useNodesState, useEdgesState, addEdge,
  Handle, Position, Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, CheckCircle2, Circle, Edit2, Trash2, ChevronLeft, Link2 } from 'lucide-react';
import { useDialog } from './DialogProvider';
import * as api from '../lib/api';

const initialNodes = [
  { id: '1', type: 'roadmapNode', position: { x: 250, y: 100 }, data: { label: 'Front-end', isDone: true, topicType: 'main' } }
];
const initialEdges = [];

const RoadmapNode = ({ id, data, isConnectable }) => {
  const isSub = data.topicType === 'sub';

  return (
    <div className={`relative group cursor-grab active:cursor-grabbing ${isSub ? 'min-w-[120px]' : 'min-w-[160px]'}`}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-2 h-2 bg-primary border-none" />
      <Handle type="target" position={Position.Left} id="left" isConnectable={isConnectable} className="w-2 h-2 bg-primary border-none" />
      
      <div 
        className={`transition-all ${isSub 
          ? 'border border-white/10 bg-[#111] rounded-full px-4 py-2 text-center shadow-lg'
          : 'border border-primary/20 bg-[#111] rounded-lg px-5 py-4 text-center shadow-lg shadow-primary/5'
        } ${data.isDone ? 'opacity-60' : ''}`}
      >
        <span className={`${isSub ? 'text-[11px] font-medium text-gray-300' : 'text-[13px] font-bold text-primary tracking-wide'}`}>
          {data.label}
        </span>
      </div>
      
      {/* Note Link Icon */}
      {data.linked_note_id && (
        <button
          onClick={(e) => { e.stopPropagation(); data.onOpenNote(data.linked_note_id); }}
          className="absolute -left-2 -top-2 p-1 bg-[#111] rounded-full border border-primary/30 hover:scale-110 transition-transform shadow-sm z-10"
          title="Open Linked Note"
        >
          <Link2 size={12} className="text-primary" />
        </button>
      )}

      {/* Status Toggle */}
      <button 
        onClick={(e) => { e.stopPropagation(); data.onToggleStatus(id); }}
        className={`absolute bg-[#111] rounded-full border border-white/10 hover:scale-110 transition-transform shadow-sm z-10 ${isSub ? '-right-2 -top-2 p-0.5' : '-right-3 -top-3 p-1'}`}
        title="Toggle Status"
      >
        {data.isDone ? <CheckCircle2 size={isSub ? 14 : 16} className="text-primary" /> : <Circle size={isSub ? 14 : 16} className="text-gray-500" />}
      </button>

      {/* Edit Overlay */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-white border border-white/10 rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pointer-events-auto shadow-2xl z-20">
        <button className="p-1.5 hover:bg-white/10 text-gray-300 rounded transition-colors" onClick={(e) => { e.stopPropagation(); data.onLinkNote(id); }} title="Link Note"><Link2 size={12} /></button>
        <button className="p-1.5 hover:bg-white/10 rounded transition-colors" onClick={(e) => { e.stopPropagation(); data.onEdit(id); }} title="Rename"><Edit2 size={12} /></button>
        <button className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors" onClick={(e) => { e.stopPropagation(); data.onDelete(id); }} title="Delete"><Trash2 size={12} /></button>
      </div>

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-2 h-2 bg-primary border-none" />
      <Handle type="source" position={Position.Right} id="right" isConnectable={isConnectable} className="w-2 h-2 bg-primary border-none" />
    </div>
  );
};

const nodeTypes = { roadmapNode: RoadmapNode };

export default function RoadmapView({ roadmaps = [], setRoadmaps, activeRoadmapId, setActiveRoadmapId, notes = [], onSelectNote, onClose }) {
  const { promptAsync, confirmAsync } = useDialog();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [edgeStyle, setEdgeStyle] = useState('dashed');
  const [rfInstance, setRfInstance] = useState(null);
  const [linkModalOpen, setLinkModalOpen] = useState(null); // Node ID
  const skipSaveRef = useRef(true); // Skip initial save on mount

  // Sync state when active roadmap changes
  useEffect(() => {
    const activeRoadmap = roadmaps.find(r => r.id === activeRoadmapId);
    if (activeRoadmap) {
      skipSaveRef.current = true; // Prevent saving just because we loaded it
      setNodes(activeRoadmap.nodes && activeRoadmap.nodes.length > 0 ? activeRoadmap.nodes : initialNodes);
      setEdges(activeRoadmap.edges || []);
      
      // Allow saving after a brief moment so initial load doesn't trigger a save
      setTimeout(() => { skipSaveRef.current = false; }, 500);
    }
  }, [activeRoadmapId, roadmaps]);

  // Auto-save to Supabase
  useEffect(() => {
    if (skipSaveRef.current || !activeRoadmapId) return;
    
    const cleanNodes = nodes.map(n => ({...n, data: { label: n.data.label, isDone: n.data.isDone, topicType: n.data.topicType, linked_note_id: n.data.linked_note_id }}));
    const timer = setTimeout(() => {
      api.updateRoadmap(activeRoadmapId, cleanNodes, edges).catch(console.error);
      if (setRoadmaps) {
        setRoadmaps(prev => prev.map(r => r.id === activeRoadmapId ? { ...r, nodes: cleanNodes, edges } : r));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [nodes, edges, activeRoadmapId, setRoadmaps]);

  const onConnect = useCallback((params) => {
    const newEdges = addEdge({ 
      ...params, 
      type: 'straight', 
      animated: edgeStyle === 'animated', 
      style: { 
        stroke: 'rgba(225, 224, 204, 0.4)',
        strokeWidth: 2, 
        strokeDasharray: edgeStyle === 'dashed' ? '5,5' : '0' 
      } 
    }, edges);
    setEdges(newEdges);
  }, [edges, setEdges, edgeStyle]);

  const handleToggleStatus = (id) => {
    setNodes(nds => nds.map(node => node.id === id ? { ...node, data: { ...node.data, isDone: !node.data.isDone } } : node));
  };

  const handleEdit = async (id) => {
    const title = await promptAsync('Rename Topic', 'Enter new topic title:', '');
    if (title && title.trim()) {
      setNodes(nds => nds.map(node => node.id === id ? { ...node, data: { ...node.data, label: title.trim() } } : node));
    }
  };

  const handleDelete = (id) => {
    setNodes(nds => nds.filter(node => node.id !== id));
    setEdges(eds => eds.filter(edge => edge.source !== id && edge.target !== id));
  };

  const handleCreateRoadmap = async () => {
    const title = await promptAsync('New Roadmap', 'Enter roadmap title:', 'My Roadmap');
    if (title && title.trim()) {
      try {
        const nr = await api.createRoadmap(title.trim(), initialNodes, initialEdges);
        setRoadmaps(prev => [...prev, nr]);
        setActiveRoadmapId(nr.id);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleDeleteRoadmap = async () => {
    if (!activeRoadmapId) return;
    const ok = await confirmAsync('Delete Roadmap', 'Are you sure? This cannot be undone.');
    if (ok) {
      try {
        await api.deleteRoadmap(activeRoadmapId);
        setRoadmaps(prev => prev.filter(r => r.id !== activeRoadmapId));
        setActiveRoadmapId(roadmaps.length > 1 ? roadmaps.find(r => r.id !== activeRoadmapId).id : null);
      } catch (e) {
        console.error(e);
      }
    }
  };

  const nodesWithCallbacks = nodes.map(n => ({
    ...n,
    data: {
      ...n.data,
      onToggleStatus: handleToggleStatus,
      onEdit: handleEdit,
      onDelete: handleDelete,
      onLinkNote: (id) => setLinkModalOpen(id),
      onOpenNote: (noteId) => {
        const note = notes.find(n => n.id === noteId);
        if (note && onSelectNote) onSelectNote(noteId, note.notebook_id);
      }
    }
  }));

  const handleAddTopic = (topicType) => {
    let spawnPosition = { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100 };
    if (rfInstance) {
      const centerRect = document.querySelector('.react-flow').getBoundingClientRect();
      spawnPosition = rfInstance.screenToFlowPosition({ x: centerRect.left + centerRect.width / 2, y: centerRect.top + centerRect.height / 2 });
    }
    const newNode = {
      id: Math.random().toString(36).substring(7),
      type: 'roadmapNode',
      position: spawnPosition,
      data: { label: topicType === 'main' ? 'New Topic' : 'New Subtopic', isDone: false, topicType }
    };
    setNodes(nds => [...nds, newNode]);
  };

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden text-primary-text bg-transparent">
      {linkModalOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto">
          <div className="bg-[#111] border border-white/10 rounded-xl p-6 w-96 shadow-2xl">
            <h3 className="text-lg font-medium text-white mb-4">Link Note to Topic</h3>
            <select 
              className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-white mb-6 outline-none focus:border-primary"
              defaultValue=""
              onChange={(e) => {
                const noteId = e.target.value;
                if (noteId) {
                  setNodes(nds => nds.map(node => node.id === linkModalOpen ? { ...node, data: { ...node.data, linked_note_id: noteId } } : node));
                  setLinkModalOpen(null);
                }
              }}
            >
              <option value="" disabled>Select a note...</option>
              {notes.map(n => <option key={n.id} value={n.id}>{n.title || 'Untitled'}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setLinkModalOpen(null)} className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={nodesWithCallbacks}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setRfInstance}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{ type: 'straight' }}
        fitView
      >
        <Background color="rgba(255,255,255,0.05)" gap={20} variant="dots" />
        <Controls className="bg-[#111] border border-white/10 rounded-md overflow-hidden [&>button]:border-b [&>button]:border-white/10 [&>button]:text-gray-400 [&>button:hover]:bg-white/5 [&>button:hover]:text-white" />
        <MiniMap 
          nodeColor={(n) => n.data.isDone ? 'rgba(255,255,255,0.1)' : 'rgba(var(--color-primary), 0.5)'} 
          maskColor="rgba(0,0,0,0.5)" 
          className="border border-white/10 rounded-md bg-[#111]"
        />
        
        <Panel position="top-left" className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white flex items-center gap-1.5 text-xs font-medium bg-black/40 backdrop-blur-md border border-white/[0.04] hover:bg-white/10 px-3 py-2 rounded-xl transition-colors shadow-2xl">
              <ChevronLeft size={16} /> Back
            </button>
          )}
          
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/[0.04] rounded-xl px-3 py-1.5 shadow-2xl">
            <select
              className="bg-transparent text-white text-sm font-medium focus:outline-none max-w-[150px] truncate"
              value={activeRoadmapId || ''}
              onChange={(e) => setActiveRoadmapId(e.target.value)}
            >
              {roadmaps.length === 0 && <option value="" disabled>No Roadmaps</option>}
              {roadmaps.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <button onClick={handleCreateRoadmap} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="New Roadmap">
              <Plus size={14} />
            </button>
            <button onClick={handleDeleteRoadmap} className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors" title="Delete Roadmap" disabled={!activeRoadmapId}>
              <Trash2 size={14} />
            </button>
          </div>
        </Panel>

        <Panel position="top-right" className="flex flex-col gap-3 items-end">
          <div className="flex items-center gap-2 bg-[#111] border border-white/10 p-1.5 rounded-lg">
            {['dashed', 'solid', 'animated'].map(style => (
              <button
                key={style}
                onClick={() => setEdgeStyle(style)}
                className={`text-[10px] uppercase tracking-wider font-medium px-3 py-1.5 rounded-md transition-colors ${edgeStyle === style ? 'bg-primary text-[#111]' : 'text-gray-500 hover:text-white'}`}
              >
                {style}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleAddTopic('sub')}
              className="flex items-center gap-2 bg-[#111] border border-white/10 text-gray-300 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-colors text-xs font-medium"
            >
              <Plus size={14} /> Subtopic
            </button>
            <button 
              onClick={() => handleAddTopic('main')}
              className="flex items-center gap-2 bg-primary text-[#111] px-4 py-2 rounded-lg hover:opacity-90 transition-opacity text-xs font-bold"
            >
              <Plus size={14} /> Main Topic
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
