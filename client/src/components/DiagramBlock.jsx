import React, { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Trash2, ChevronLeft, ChevronRight, Pencil, Square, Circle, Type as TypeIcon, Eraser, ArrowUpRight, RotateCcw, Play, Pause, LayoutTemplate, MousePointer2 } from 'lucide-react';
import { useDialog } from './DialogProvider';
import { simulateSorting, simulateBinarySearch, simulateTreeTraversal } from '../lib/simulator';

// =============================================
// DIAGRAM TEMPLATE DEFINITIONS
// =============================================
const DIAGRAM_TEMPLATES = {
  stack: {
    label: 'Stack',
    description: 'LIFO data structure',
    defaultData: { items: ['TOP →', '', '', '', 'BOTTOM →'], title: 'Stack' }
  },
  queue: {
    label: 'Queue',
    description: 'FIFO data structure',
    defaultData: { items: ['FRONT →', '', '', '', '← REAR'], title: 'Queue' }
  },
  array: {
    label: 'Array',
    description: 'Indexed collection',
    defaultData: { items: ['0', '1', '2', '3', '4', '5', '6', '7'], title: 'Array' }
  },
  linkedlist: {
    label: 'Linked List',
    description: 'Sequential node chain',
    defaultData: { nodes: [{ val: 'HEAD', next: true }, { val: '', next: true }, { val: '', next: true }, { val: 'NULL', next: false }], title: 'Linked List' }
  },

  graph: {
    label: 'Graph',
    description: 'Nodes and edges',
    defaultData: { nodes: ['A', 'B', 'C', 'D', 'E'], edges: 'A-B, B-C, C-D, A-D, D-E', title: 'Graph' }
  },
  slidingwindow: {
    label: 'Sliding Window',
    description: 'Window over array',
    defaultData: { items: ['1', '3', '5', '7', '2', '4', '6'], windowStart: 1, windowEnd: 3, title: 'Sliding Window' }
  },
  twopointers: {
    label: 'Two Pointers',
    description: 'L/R pointer technique',
    defaultData: { items: ['1', '2', '3', '4', '5', '6', '7'], left: 0, right: 6, title: 'Two Pointers' }
  },
  heap: {
    label: 'Heap',
    description: 'Priority queue tree',
    defaultData: { nodes: ['', '', '', '', '', '', ''], title: 'Min Heap' }
  },
  hashmap: {
    label: 'Hash Map',
    description: 'Key-value pairs',
    defaultData: { entries: [{ key: 'name', val: 'alice' }, { key: 'age', val: '25' }], title: 'Hash Map' }
  },
  matrix: {
    label: 'Matrix / Grid',
    description: '2D array structure',
    defaultData: { 
      rows: 3, 
      cols: 3, 
      cells: [
        ['0', '1', '0'], 
        ['1', '1', '1'], 
        ['0', '0', '0']
      ], 
      title: 'Matrix' 
    }
  },
  segmenttree: {
    label: 'Segment Tree',
    description: 'Array intervals tree',
    defaultData: { nodes: ['16', '4', '12', '1', '3', '5', '7'], intervals: ['[0,3]', '[0,1]', '[2,3]', '[0]', '[1]', '[2]', '[3]'], title: 'Segment Tree' }
  },
  intervals: {
    label: 'Intervals (Greedy)',
    description: 'Timeline scheduling',
    defaultData: { intervals: [{ start: 1, end: 4, label: 'A', color: '#3b82f6' }, { start: 3, end: 6, label: 'B', color: '#ef4444' }], minVal: 0, maxVal: 8, title: 'Merge Intervals' }
  },
  recursiontree: {
    label: 'Recursion Tree',
    description: 'Backtracking states',
    defaultData: { 
      root: 'solve(0)', 
      left: 'solve(1)', right: 'solve(2)', 
      leftLeft: 'solve(3)', leftRight: 'solve(4)', rightLeft: 'solve(5)', rightRight: 'solve(6)',
      edgeLeft: 'forward', edgeRight: 'forward', edgeLeftLeft: 'forward', edgeLeftRight: 'backtrack', edgeRightLeft: 'backtrack', edgeRightRight: 'forward',
      title: 'Recursion Tree'
    }
  },
  dptable: {
    label: 'DP Table',
    description: 'Matrix with transitions',
    defaultData: { 
      rows: 3, cols: 4, 
      cells: [['0', '0', '0', '0'], ['0', '1', '1', '1'], ['0', '1', '2', '2']], 
      arrows: [{ fromR: 1, fromC: 1, toR: 2, toC: 2 }],
      title: 'DP Table'
    }
  },
  freestyle: {
    label: 'Freestyle',
    description: 'Free-form drawing canvas',
    defaultData: { strokes: [], shapes: [], labels: [], title: 'Freestyle' }
  },
  binarysearch: {
    label: 'Binary Search',
    description: 'Divide and conquer',
    defaultData: { items: ['1', '3', '5', '7', '9', '11', '15', '19'], left: 0, right: 7, mid: 3, title: 'Binary Search' }
  },
  sorting: {
    label: 'Sorting',
    description: 'Bar chart visualizer',
    defaultData: { items: [30, 10, 50, 20, 40, 60], comparing: [1, 3], sorted: [], pivot: -1, title: 'Sorting' }
  },
  trie: {
    label: 'Trie (Prefix)',
    description: 'Character prefix tree',
    defaultData: { root: 'root', children: [{ char: 'c', isWord: false, children: [{ char: 'a', isWord: false, children: [{ char: 't', isWord: true, children: [] }] }] }], title: 'Trie' }
  },
  pathfinding: {
    label: 'Grid Pathfinding',
    description: 'BFS/DFS maze solver',
    defaultData: { rows: 4, cols: 5, start: { r: 0, c: 0 }, end: { r: 3, c: 4 }, walls: [{ r: 1, c: 1 }, { r: 1, c: 2 }], path: [], visited: [], title: 'Pathfinding' }
  },
  tree: {
    label: 'Tree (Generic)',
    description: 'Binary tree visualization',
    defaultData: { nodes: ['1', '2', '3', '4', '5', '', '6'], currentNode: -1, visited: [], title: 'Binary Tree' }
  }
};

export default function DiagramBlock({ block, onUpdate, readOnly = false }) {
  const { promptAsync } = useDialog();
  const diagramType = block.content?.diagramType || 'stack';
  const rawData = block.content?.data;
  
  // Handle snapshots array (backwards compatible with old single 'data' objects)
  let snapshots = block.content?.snapshots || [];
  if (snapshots.length === 0) {
    snapshots = [rawData || DIAGRAM_TEMPLATES[diagramType]?.defaultData || {}];
  }
  
  const currentIdx = block.content?.currentSnapshot ?? 0;
  const currentData = snapshots[currentIdx] || snapshots[0];

  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (isPlaying) {
      if (currentIdx < snapshots.length - 1) {
        const timer = setTimeout(() => {
          onUpdate({ content: { ...block.content, currentSnapshot: currentIdx + 1 } });
        }, 600);
        return () => clearTimeout(timer);
      } else {
        setTimeout(() => setIsPlaying(false), 0);
      }
    }
  }, [isPlaying, currentIdx, snapshots.length, block.content, onUpdate]);

  const updateData = useCallback((newData) => {
    const newSnapshots = [...snapshots];
    newSnapshots[currentIdx] = { ...currentData, ...newData };
    onUpdate({ content: { ...block.content, snapshots: newSnapshots, currentSnapshot: currentIdx } });
  }, [block.content, snapshots, currentIdx, currentData, onUpdate]);

  const setDiagramType = (type) => {
    const template = DIAGRAM_TEMPLATES[type];
    onUpdate({ content: { diagramType: type, snapshots: [{ ...template.defaultData }], currentSnapshot: 0 } });
  };

  const addSnapshot = () => {
    const newSnapshots = [...snapshots];
    newSnapshots.splice(currentIdx + 1, 0, JSON.parse(JSON.stringify(currentData)));
    onUpdate({ content: { ...block.content, snapshots: newSnapshots, currentSnapshot: currentIdx + 1 } });
  };
  
  const deleteSnapshot = () => {
    if (snapshots.length <= 1) return;
    const newSnapshots = snapshots.filter((_, i) => i !== currentIdx);
    const newIdx = Math.max(0, currentIdx - 1);
    onUpdate({ content: { ...block.content, snapshots: newSnapshots, currentSnapshot: newIdx } });
  };
  
  const setSnapshot = (idx) => {
    if (idx >= 0 && idx < snapshots.length) {
      onUpdate({ content: { ...block.content, currentSnapshot: idx } });
    }
  };

  const handleSimulate = async () => {
    if (diagramType === 'sorting') {
      const choice = await promptAsync("Choose Sorting Algorithm", "1: Bubble Sort\n2: Selection Sort\n3: Insertion Sort\n4: Quick Sort", "1", "e.g. 1");
      if (!choice) return;
      const algos = { '1': 'bubble', '2': 'selection', '3': 'insertion', '4': 'quick' };
      const algo = algos[choice.trim()] || 'bubble';
      
      const input = await promptAsync("Sorting Input", "Enter comma-separated numbers to sort:", "", "e.g. 5, 2, 8, 1");
      if (!input) return;
      const items = input.split(',').map(n => parseInt(n.trim()) || 0);
      const snaps = simulateSorting(items, algo);
      onUpdate({ content: { ...block.content, snapshots: snaps, currentSnapshot: 0 } });
      setIsPlaying(true);
    } else if (diagramType === 'binarysearch') {
      const input = await promptAsync("Binary Search Input", "Enter comma-separated sorted numbers:", "", "e.g. 1, 3, 5, 7, 9");
      if (!input) return;
      const target = await promptAsync("Target Number", "Enter target number to search for:", "", "e.g. 5");
      if (!target) return;
      const items = input.split(',').map(n => n.trim());
      const snaps = simulateBinarySearch(items, target);
      onUpdate({ content: { ...block.content, snapshots: snaps, currentSnapshot: 0 } });
      setIsPlaying(true);
    } else if (diagramType === 'tree') {
      const input = await promptAsync("Tree Input", "Enter level-order binary tree (comma-separated, use 'null' for empty):", "", "e.g. 1, 2, 3, null, 5");
      if (!input) return;
      const algo = await promptAsync("Algorithm", "Algorithm? (dfs or bfs)", "dfs", "dfs");
      if (!algo) return;
      const items = input.split(',').map(n => n.trim() === 'null' ? '' : n.trim());
      const snaps = simulateTreeTraversal(items, algo.toLowerCase());
      onUpdate({ content: { ...block.content, snapshots: snaps, currentSnapshot: 0 } });
      setIsPlaying(true);
    } else {
      window.alert("Simulation is currently supported for Sorting, Binary Search, and Tree diagrams.");
    }
  };

  return (
    <div className="rounded-xl border border-app-border bg-[#0d0d0d] overflow-hidden group transition-all hover:border-app-border-strong">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-bg border-b border-app-border">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Diagram</span>
          {readOnly ? (
            <span className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5">
              {DIAGRAM_TEMPLATES[diagramType]?.label || 'Diagram'}
            </span>
          ) : (
            <DiagramTypeSelector current={diagramType} onChange={setDiagramType} />
          )}
          {readOnly ? (
            block.content?.title ? <span className="text-xs text-gray-400 ml-2">{block.content.title}</span> : null
          ) : (
            <input
              type="text"
              placeholder="Name this block..."
              value={block.content?.title || ''}
              onChange={(e) => onUpdate({ content: { ...block.content, title: e.target.value } })}
              className="bg-transparent border-none outline-none text-xs text-gray-400 placeholder-gray-600 ml-2 w-32 focus:text-gray-200 transition-colors"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          {['sorting', 'binarysearch', 'tree'].includes(diagramType) && (
            <button onClick={handleSimulate} className="text-[10px] px-2 py-1 rounded border border-primary/50 text-primary hover:bg-primary/10 transition-colors font-bold mr-2">
              🪄 Simulate
            </button>
          )}
          <input
            className="bg-transparent text-xs text-right text-gray-400 outline-none placeholder-gray-600 max-w-[150px]"
            value={currentData.title || ''}
            onChange={(e) => updateData({ title: e.target.value })}
            placeholder="Title..."
          />
        </div>
      </div>

      {/* Diagram Renderer */}
      <div className="p-6 w-full min-w-0 overflow-auto custom-scrollbar flex flex-col items-center justify-start min-h-[200px]">
        <div className="w-full my-auto flex flex-col items-center">
          {diagramType === 'stack' && <StackDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'queue' && <QueueDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'array' && <ArrayDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'linkedlist' && <LinkedListDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'tree' && <TreeDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'graph' && <GraphDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'slidingwindow' && <SlidingWindowDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'twopointers' && <TwoPointersDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'heap' && <HeapDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'hashmap' && <HashMapDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'matrix' && <MatrixDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'segmenttree' && <SegmentTreeDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'intervals' && <IntervalsDiagram data={currentData} updateData={updateData} />}
        {diagramType === 'recursiontree' && <RecursionTreeDiagram data={currentData} updateData={updateData} />}
          {diagramType === 'dptable' && <DPTableDiagram data={currentData} updateData={updateData} />}
          {diagramType === 'binarysearch' && <BinarySearchDiagram data={currentData} updateData={updateData} />}
          {diagramType === 'sorting' && <SortingDiagram data={currentData} updateData={updateData} />}
          {diagramType === 'trie' && <TrieDiagram data={currentData} updateData={updateData} />}

          {diagramType === 'pathfinding' && <PathfindingDiagram data={currentData} updateData={updateData} />}
          {diagramType === 'freestyle' && <FreestyleDiagram data={currentData} updateData={updateData} />}
        </div>
      </div>

      {/* Timeline Controls */}
      <div className="border-t border-app-border bg-sidebar-bg px-3 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 rounded text-primary hover:bg-primary/20 bg-primary/10 transition-colors mr-2"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
          </button>
          <button 
            onClick={() => setSnapshot(currentIdx - 1)} 
            disabled={currentIdx === 0}
            className="p-1 rounded text-gray-500 hover:text-white hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-gray-400 font-mono">Step {currentIdx + 1} of {snapshots.length}</span>
          <button 
            onClick={() => setSnapshot(currentIdx + 1)} 
            disabled={currentIdx === snapshots.length - 1}
            className="p-1 rounded text-gray-500 hover:text-white hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex-1 flex items-center gap-2 max-w-xs relative">
          <input 
            type="range" 
            min={0} 
            max={Math.max(0, snapshots.length - 1)} 
            value={currentIdx} 
            onChange={(e) => setSnapshot(Number(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            disabled={snapshots.length <= 1}
          />
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
             <button 
              onClick={addSnapshot}
              className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-gray-400 hover:text-primary border border-app-border-strong rounded hover:bg-surface-hover transition-colors"
            >
              <Plus size={12} /> Add Step
            </button>
            <button 
              onClick={deleteSnapshot}
              disabled={snapshots.length <= 1}
              className="flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold tracking-wider text-gray-400 hover:text-red-400 border border-app-border-strong rounded hover:bg-red-500/10 transition-colors disabled:opacity-30"
            >
              <Trash2 size={12} /> Delete Step
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// DIAGRAM TYPE SELECTOR
// =============================================
function DiagramTypeSelector({ current, onChange }) {
  const [open, setOpen] = useState(false);
  const currentTemplate = DIAGRAM_TEMPLATES[current];

  const groups = {
    'Basic Data Structures': ['array', 'stack', 'queue', 'linkedlist', 'hashmap', 'matrix'],
    'Trees & Graphs': ['heap', 'tree', 'graph', 'segmenttree', 'recursiontree', 'trie'],
    'Algorithms': ['binarysearch', 'sorting', 'slidingwindow', 'twopointers', 'intervals', 'dptable', 'pathfinding'],
    'Other': ['freestyle']
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary px-3 py-1.5 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        {currentTemplate?.label || 'Select Diagram Type'}
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 bg-surface-bg border border-app-border-strong rounded-xl shadow-2xl py-2 z-50 min-w-[240px] max-h-[300px] overflow-y-auto overscroll-contain custom-scrollbar">
            {Object.entries(groups).map(([groupName, keys]) => (
              <div key={groupName} className="mb-2 last:mb-0">
                <div className="px-3 py-1 text-[9px] font-bold text-gray-500 uppercase tracking-wider">{groupName}</div>
                {keys.map(key => {
                  const tmpl = DIAGRAM_TEMPLATES[key];
                  if (!tmpl) return null;
                  return (
                    <button
                      key={key}
                      onClick={() => { onChange(key); setOpen(false); }}
                      className={`w-full px-4 py-2 text-left hover:bg-surface-hover flex flex-col transition-colors group ${current === key ? 'bg-primary/5' : ''}`}
                    >
                      <span className={`text-xs font-medium transition-colors ${current === key ? 'text-primary' : 'text-gray-300 group-hover:text-white'}`}>{tmpl.label}</span>
                      <span className={`text-[10px] transition-colors mt-0.5 ${current === key ? 'text-primary/70' : 'text-gray-600 group-hover:text-gray-400'}`}>{tmpl.description}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================
// EDITABLE CELL
// =============================================
function EditableCell({ value, onChange, className = '', style = {} }) {
  return (
    <input
      className={`bg-transparent text-center outline-none text-primary-text text-xs placeholder-gray-600 focus:placeholder-gray-500 ${className}`}
      style={{ width: Math.max(30, (value?.length || 2) * 8 + 12), ...style }}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="·"
    />
  );
}

// =============================================
// STACK
// =============================================
function StackDiagram({ data, updateData }) {
  const items = data.items || ['', '', '', '', ''];
  const updateItem = (i, val) => {
    const next = [...items];
    next[i] = val;
    updateData({ items: next });
  };
  const addItem = () => updateData({ items: ['', ...items] });
  const removeItem = () => items.length > 1 && updateData({ items: items.slice(1) });

  return (
    <div className="flex flex-col items-center gap-0">
      <div className="flex gap-2 mb-3">
        <button onClick={addItem} className="text-[10px] text-gray-500 hover:text-primary px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">+ Push</button>
        <button onClick={removeItem} className="text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">− Pop</button>
      </div>
      <div className="flex items-start gap-3">
        {/* Stack visual */}
        <div className="flex flex-col items-center gap-0">
          {items.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[9px] text-gray-600 font-mono w-4 text-right shrink-0">{items.length - 1 - i}</span>
              <div className={`border border-app-border-strong px-6 py-2 w-36 text-center transition-colors ${
                i === 0 ? 'bg-primary/10 border-primary/30 rounded-t-lg' : ''
              } ${i === items.length - 1 ? 'rounded-b-lg' : ''}`}>
                <EditableCell value={item} onChange={(v) => updateItem(i, v)} />
              </div>
            </div>
          ))}
        </div>
        {/* Side labels */}
        <div className="flex flex-col justify-between h-full py-1" style={{ minHeight: items.length * 36 }}>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-primary">← TOP</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-gray-500">← BOTTOM</span>
          </div>
        </div>
      </div>
      <div className="mt-3 text-[10px] text-gray-600 font-mono">LIFO · size = {items.length}</div>
    </div>
  );
}

// =============================================
// QUEUE
// =============================================
function QueueDiagram({ data, updateData }) {
  const items = data.items || ['', '', '', '', ''];
  const updateItem = (i, val) => {
    const next = [...items];
    next[i] = val;
    updateData({ items: next });
  };
  const enqueue = () => updateData({ items: [...items, ''] });
  const dequeue = () => items.length > 1 && updateData({ items: items.slice(1) });

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex gap-2">
        <button onClick={enqueue} className="text-[10px] text-gray-500 hover:text-primary px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">+ Enqueue</button>
        <button onClick={dequeue} className="text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">− Dequeue</button>
      </div>
      {/* Direction arrow */}
      <div className="flex items-center gap-2 w-full justify-center">
        <span className="text-[10px] font-bold text-green-400">DEQUEUE ←</span>
        <div className="flex-1 max-w-[200px] h-px bg-gradient-to-r from-green-500/30 via-white/10 to-blue-500/30" />
        <span className="text-[10px] font-bold text-blue-400">→ ENQUEUE</span>
      </div>
      <div className="flex flex-col items-center gap-1 w-full">
        <div className="w-full overflow-x-auto py-4 px-4 custom-scrollbar">
          <div className="flex items-center gap-0 w-max mx-auto">
            {items.map((item, i) => (
              <div key={i} className="flex flex-col items-center shrink-0">
              <div className={`border border-app-border-strong px-3 py-2 text-center min-w-[40px] transition-colors ${
                i === 0 ? 'rounded-l-lg bg-green-500/10 border-green-500/20' : ''
              } ${i === items.length - 1 ? 'rounded-r-lg bg-blue-500/10 border-blue-500/20' : ''}`}>
                <EditableCell value={item} onChange={(v) => updateItem(i, v)} />
              </div>
              <span className="text-[9px] text-gray-600 mt-1 font-mono">{i}</span>
            </div>
            ))}
          </div>
        </div>
        {/* Labels below */}
        <div className="flex justify-between w-full max-w-sm px-4 mt-1">
          <span className="text-[9px] font-bold text-green-400">FRONT</span>
          <span className="text-[9px] font-bold text-blue-400">REAR</span>
        </div>
      </div>
      <div className="text-[10px] text-gray-600 font-mono">FIFO · size = {items.length}</div>
    </div>
  );
}

// =============================================
// ARRAY
// =============================================
function ArrayDiagram({ data, updateData }) {
  const items = data.items || ['', '', '', '', '', '', '', ''];
  const updateItem = (i, val) => {
    const next = [...items];
    next[i] = val;
    updateData({ items: next });
  };
  const addItem = () => updateData({ items: [...items, ''] });
  const removeItem = () => items.length > 1 && updateData({ items: items.slice(0, -1) });

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="flex gap-2 mb-1">
        <button onClick={addItem} className="text-[10px] text-gray-500 hover:text-primary px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">+ Add</button>
        <button onClick={removeItem} className="text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">− Remove</button>
      </div>
      <div className="w-full overflow-x-auto py-4 px-4 custom-scrollbar">
        <div className="flex items-center w-max mx-auto">
          <span className="text-gray-500 text-lg mr-1 font-mono shrink-0">[</span>
          <div className="flex items-end gap-0">
            {items.map((item, i) => (
              <div key={i} className="flex flex-col items-center shrink-0">
                <div className={`border border-app-border-strong px-3 py-2 text-center min-w-[38px] bg-surface-bg transition-colors hover:bg-white/[0.03] ${
                  i === 0 ? 'rounded-l' : '' } ${i === items.length - 1 ? 'rounded-r' : ''}`}>
                  <EditableCell value={item} onChange={(v) => updateItem(i, v)} />
                </div>
                <span className="text-[9px] text-gray-600 mt-1 font-mono">{i}</span>
              </div>
            ))}
          </div>
          <span className="text-gray-500 text-lg ml-1 font-mono shrink-0">]</span>
        </div>
      </div>
      <div className="text-[10px] text-gray-600 font-mono">length = {items.length} · O(1) access</div>
    </div>
  );
}

// =============================================
// LINKED LIST
// =============================================
function LinkedListDiagram({ data, updateData }) {
  const nodes = data.nodes || [{ val: 'HEAD', next: true }, { val: '', next: true }, { val: 'NULL', next: false }];
  const updateNode = (i, val) => {
    const next = [...nodes];
    next[i] = { ...next[i], val };
    updateData({ nodes: next });
  };
  const addNode = () => {
    const next = [...nodes];
    next.splice(next.length - 1, 0, { val: '', next: true });
    updateData({ nodes: next });
  };
  const removeNode = () => {
    if (nodes.length > 2) {
      const next = [...nodes];
      next.splice(next.length - 2, 1);
      updateData({ nodes: next });
    }
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      <div className="flex gap-2">
        <button onClick={addNode} className="text-[10px] text-gray-500 hover:text-primary px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">+ Add Node</button>
        <button onClick={removeNode} className="text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">− Remove</button>
      </div>
      {/* Head pointer */}
      <div className="w-full overflow-x-auto py-2 px-4 custom-scrollbar">
        <div className="flex items-center gap-0 w-max mx-auto">
          {nodes.map((node, i) => (
            <div key={i} className="flex items-center shrink-0">
            <div className={`border border-app-border-strong rounded-lg flex overflow-hidden transition-colors h-[42px] ${
              i === 0 ? 'bg-primary/10 border-primary/20' : 
              !node.next ? 'bg-red-500/5 border-red-500/10' : 'bg-surface-bg'}`}>
              <div className="px-3 h-full flex flex-col items-center justify-center border-r border-app-border-strong">
                <div className="text-[8px] text-gray-600 leading-none mb-0.5">data</div>
                <EditableCell value={node.val} onChange={(v) => updateNode(i, v)} />
              </div>
              <div className="px-3 h-full flex flex-col items-center justify-center">
                <div className="text-[8px] text-gray-600 leading-none mb-0.5">next</div>
                <span className="text-gray-500 text-xs leading-none mt-0.5">{node.next ? '•' : '∅'}</span>
              </div>
            </div>
            {node.next && (
              <svg width="24" height="16" className="shrink-0">
                <line x1="2" y1="8" x2="18" y2="8" stroke="#E1E0CC" strokeWidth="1.5" />
                <polygon points="18,4 24,8 18,12" fill="#E1E0CC" />
              </svg>
            )}
          </div>
        ))}
        </div>
      </div>
      <div className="text-[10px] text-gray-600 font-mono">nodes = {nodes.length} · O(n) search</div>
    </div>
  );
}



// =============================================
// GRAPH
// =============================================
function GraphDiagram({ data, updateData }) {
  const nodes = data.nodes || ['A', 'B', 'C', 'D', 'E'];
  const edges = data.edges || '';

  const updateNode = (i, val) => {
    const next = [...nodes];
    next[i] = val;
    updateData({ nodes: next });
  };
  const addNode = () => updateData({ nodes: [...nodes, ''] });
  const removeNode = () => nodes.length > 2 && updateData({ nodes: nodes.slice(0, -1) });

  // Arrange nodes in a circle
  const cx = 150, cy = 130, r = 90;
  const positions = nodes.map((_, i) => {
    const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  // Parse edges
  const parsedEdges = edges.split(',').map(e => e.trim()).filter(Boolean).map(e => {
    const parts = e.split('-');
    const from = nodes.indexOf(parts[0]?.trim());
    const to = nodes.indexOf(parts[1]?.trim());
    return { from, to };
  }).filter(e => e.from >= 0 && e.to >= 0);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-wrap justify-center gap-2">
        <button onClick={addNode} className="text-[10px] text-gray-500 hover:text-primary px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">+ Node</button>
        <button onClick={removeNode} className="text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">− Node</button>
        <button onClick={() => updateData({ directed: !data.directed })} className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${data.directed ? 'text-primary border-primary/30 bg-primary/10' : 'text-gray-500 border-app-border hover:text-primary'}`}>
          {data.directed ? 'Directed' : 'Undirected'}
        </button>
      </div>
      <svg width="300" height="260" className="overflow-visible">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#E1E0CC" opacity="0.4" />
          </marker>
        </defs>
        {/* Edges */}
        {parsedEdges.map((e, i) => (
          <line key={i} x1={positions[e.from]?.x} y1={positions[e.from]?.y} x2={positions[e.to]?.x} y2={positions[e.to]?.y} stroke="#E1E0CC" strokeWidth="1.5" opacity="0.25" markerEnd={data.directed ? "url(#arrowhead)" : ""} />
        ))}
        {/* Nodes */}
        {nodes.map((node, i) => (
          <g key={i}>
            <circle cx={positions[i].x} cy={positions[i].y} r="22" fill="#111" stroke="#E1E0CC" strokeWidth="1.5" opacity="0.6" />
            <foreignObject x={positions[i].x - 16} y={positions[i].y - 9} width="32" height="18">
              <input
                className="w-full h-full bg-transparent text-center text-[11px] text-primary-text outline-none font-mono"
                value={node}
                onChange={(e) => updateNode(i, e.target.value)}
              />
            </foreignObject>
          </g>
        ))}
      </svg>
      <div className="w-full max-w-xs">
        <label className="text-[10px] text-gray-500 block mb-1">Edges (e.g. A-B, B-C)</label>
        <input
          className="w-full bg-surface-bg border border-app-border rounded-lg px-3 py-1.5 text-xs text-primary-text outline-none focus:border-primary/30 transition-colors font-mono"
          value={edges}
          onChange={(e) => updateData({ edges: e.target.value })}
          placeholder="A-B, B-C, C-D"
        />
      </div>
      <div className="text-[10px] text-gray-600 font-mono">V = {nodes.length} · E = {parsedEdges.length}</div>
    </div>
  );
}

// =============================================
// SLIDING WINDOW
// =============================================
function SlidingWindowDiagram({ data, updateData }) {
  const items = data.items || ['1', '2', '3', '4', '5', '6', '7'];
  const ws = data.windowStart ?? 1;
  const we = data.windowEnd ?? 3;

  const updateItem = (i, val) => {
    const next = [...items];
    next[i] = val;
    updateData({ items: next });
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex gap-2">
        <button onClick={() => updateData({ windowStart: Math.max(0, ws - 1), windowEnd: Math.max(we - 1, Math.max(0, ws - 1)) })} className="text-[10px] text-gray-500 hover:text-primary px-2 py-0.5 rounded border border-app-border transition-colors">← Slide</button>
        <button onClick={() => updateData({ windowStart: Math.min(items.length - 1, ws + 1), windowEnd: Math.min(items.length - 1, we + 1) })} className="text-[10px] text-gray-500 hover:text-primary px-2 py-0.5 rounded border border-app-border transition-colors">Slide →</button>
        <button onClick={() => updateData({ windowEnd: Math.min(items.length - 1, we + 1) })} className="text-[10px] text-gray-500 hover:text-blue-400 px-2 py-0.5 rounded border border-app-border transition-colors">Expand</button>
        <button onClick={() => updateData({ windowEnd: Math.max(ws, we - 1) })} className="text-[10px] text-gray-500 hover:text-orange-400 px-2 py-0.5 rounded border border-app-border transition-colors">Shrink</button>
      </div>
      <div className="w-full overflow-x-auto py-4 px-4 custom-scrollbar">
        <div className="flex flex-col items-start md:items-center gap-1 w-max mx-auto">
          {/* Window bracket top */}
          <div className="flex items-end gap-0 w-full">
          {items.map((_, i) => (
            <div key={i} className="min-w-[40px] h-4 flex items-end justify-center shrink-0">
              {i === ws && <div className="text-[9px] font-bold text-primary">WINDOW</div>}
            </div>
          ))}
        </div>
        {/* Window bracket */}
        <div className="flex items-end gap-0">
          {items.map((_, i) => {
            const inWindow = i >= ws && i <= we;
            return (
              <div key={i} className="min-w-[40px] flex justify-center shrink-0" style={{ height: 4 }}>
                {inWindow && (
                  <div className={`h-full bg-primary/40 w-full ${
                    i === ws ? 'rounded-tl-sm border-l-2 border-t-2 border-primary/60' : ''
                  } ${i === we ? 'rounded-tr-sm border-r-2 border-t-2 border-primary/60' : ''} ${
                    inWindow && i !== ws && i !== we ? 'border-t-2 border-primary/60' : ''}`} />
                )}
              </div>
            );
          })}
        </div>
        {/* Cells */}
        <div className="flex items-end gap-0">
          {items.map((item, i) => {
            const inWindow = i >= ws && i <= we;
            return (
              <div key={i} className="flex flex-col items-center shrink-0">
                <div className={`border px-3 py-2 text-center min-w-[40px] transition-colors ${inWindow ? 'bg-primary/10 border-primary/30' : 'bg-surface-bg border-app-border-strong'}`}>
                  <EditableCell value={item} onChange={(v) => updateItem(i, v)} />
                </div>
                <span className="text-[9px] text-gray-600 mt-1 font-mono">{i}</span>
              </div>
            );
          })}
        </div>
        </div>
      </div>
      <div className="flex items-center gap-4 text-[10px] text-gray-500 font-mono">
        <span>window[<span className="text-primary">{ws}</span>..<span className="text-primary">{we}</span>]</span>
        <span>·</span>
        <span>size = <span className="text-primary">{we - ws + 1}</span></span>
      </div>
    </div>
  );
}

// =============================================
// TWO POINTERS
// =============================================
function TwoPointersDiagram({ data, updateData }) {
  const items = data.items || ['1', '2', '3', '4', '5', '6', '7'];
  const left = data.left ?? 0;
  const right = data.right ?? items.length - 1;

  const updateItem = (i, val) => {
    const next = [...items];
    next[i] = val;
    updateData({ items: next });
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex gap-2">
        <button onClick={() => updateData({ left: Math.min(right, left + 1) })} className="text-[10px] text-green-400 hover:text-green-300 px-2 py-0.5 rounded border border-app-border transition-colors">L →</button>
        <button onClick={() => updateData({ left: Math.max(0, left - 1) })} className="text-[10px] text-green-400 hover:text-green-300 px-2 py-0.5 rounded border border-app-border transition-colors">← L</button>
        <button onClick={() => updateData({ right: Math.min(items.length - 1, right + 1) })} className="text-[10px] text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded border border-app-border transition-colors">R →</button>
        <button onClick={() => updateData({ right: Math.max(left, right - 1) })} className="text-[10px] text-blue-400 hover:text-blue-300 px-2 py-0.5 rounded border border-app-border transition-colors">← R</button>
      </div>
      <div className="w-full overflow-x-auto py-4 px-4 custom-scrollbar">
        <div className="flex flex-col items-start md:items-center gap-0 w-max mx-auto">
          {/* Pointer arrows */}
          <div className="flex items-end gap-0 w-full">
          {items.map((_, i) => (
            <div key={i} className="min-w-[40px] h-6 flex flex-col items-center justify-end shrink-0">
              {i === left && (
                <>
                  <span className="text-[10px] text-green-400 font-bold font-mono leading-none">L</span>
                  <svg width="12" height="8"><polygon points="6,8 0,0 12,0" fill="#4ade80" /></svg>
                </>
              )}
              {i === right && i !== left && (
                <>
                  <span className="text-[10px] text-blue-400 font-bold font-mono leading-none">R</span>
                  <svg width="12" height="8"><polygon points="6,8 0,0 12,0" fill="#60a5fa" /></svg>
                </>
              )}
              {i === left && i === right && (
                <>
                  <span className="text-[9px] text-yellow-400 font-bold font-mono leading-none">L=R</span>
                  <svg width="12" height="8"><polygon points="6,8 0,0 12,0" fill="#facc15" /></svg>
                </>
              )}
            </div>
          ))}
        </div>
        {/* Cells */}
        <div className="flex items-end gap-0">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col items-center shrink-0">
              <div className={`border px-3 py-2 text-center min-w-[40px] transition-colors ${
                i === left && i === right ? 'bg-yellow-500/10 border-yellow-500/30' :
                i === left ? 'bg-green-500/10 border-green-500/30' : 
                i === right ? 'bg-blue-500/10 border-blue-500/30' :
                (i > left && i < right) ? 'bg-white/[0.03] border-app-border-strong' :
                'bg-surface-bg border-app-border-strong'
              }`}>
                <EditableCell value={item} onChange={(v) => updateItem(i, v)} />
              </div>
              <span className="text-[9px] text-gray-600 mt-1 font-mono">{i}</span>
            </div>
          ))}
        </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] font-mono">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> L = {left}</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> R = {right}</span>
        <span className="text-gray-600">· gap = {right - left}</span>
      </div>
    </div>
  );
}

// =============================================
// HEAP (as array-backed tree)
// =============================================
function HeapDiagram({ data, updateData }) {
  const nodes = data.nodes || ['', '', '', '', '', '', ''];
  const updateNode = (i, val) => {
    const next = [...nodes];
    next[i] = val;
    updateData({ nodes: next });
  };
  const addNode = () => updateData({ nodes: [...nodes, ''] });
  const removeNode = () => nodes.length > 1 && updateData({ nodes: nodes.slice(0, -1) });

  // Display as tree
  const levels = [];
  let idx = 0;
  let levelSize = 1;
  while (idx < nodes.length) {
    levels.push(nodes.slice(idx, idx + levelSize));
    idx += levelSize;
    levelSize *= 2;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2">
        <button onClick={addNode} className="text-[10px] text-gray-500 hover:text-primary px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">+ Add Node</button>
        <button onClick={removeNode} className="text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">− Remove</button>
      </div>
      {/* Tree display */}
      <div className="flex flex-col items-center gap-3">
        {levels.map((level, li) => (
          <div key={li} className="flex flex-col items-center">
            {li > 0 && <div className="text-[8px] text-gray-700 mb-1">Level {li}</div>}
            <div className="flex items-center justify-center" style={{ gap: `${Math.max(8, 64 / (li + 1))}px` }}>
              {level.map((val, vi) => {
                const globalIdx = (Math.pow(2, li) - 1) + vi;
                const parentIdx = Math.floor((globalIdx - 1) / 2);
                return (
                  <div key={vi} className="flex flex-col items-center">
                    <div className={`border border-app-border-strong rounded-full w-11 h-11 flex items-center justify-center transition-colors ${
                      li === 0 ? 'bg-primary/10 border-primary/30' : 'bg-surface-bg hover:bg-white/[0.03]'}`}>
                      <EditableCell value={val} onChange={(v) => updateNode(globalIdx, v)} className="w-7 text-[10px]" />
                    </div>
                    <span className="text-[8px] text-gray-600 mt-0.5 font-mono">[{globalIdx}]</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {/* Array representation */}
      <div className="flex flex-col items-center gap-1 mt-1">
        <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Array Representation</div>
        <div className="flex items-center">
          <span className="text-gray-500 text-sm mr-1 font-mono">[</span>
          {nodes.map((n, i) => (
            <span key={i} className="text-[10px] font-mono text-gray-400">
              {n || '·'}{i < nodes.length - 1 ? ', ' : ''}
            </span>
          ))}
          <span className="text-gray-500 text-sm ml-1 font-mono">]</span>
        </div>
      </div>
      <div className="text-[10px] text-gray-600 font-mono">parent(i) = ⌊(i-1)/2⌋ · children = 2i+1, 2i+2</div>
    </div>
  );
}

// =============================================
// HASH MAP
// =============================================
function HashMapDiagram({ data, updateData }) {
  const entries = data.entries || [{ key: '', val: '' }];
  
  const updateEntry = (i, field, val) => {
    const next = [...entries];
    next[i] = { ...next[i], [field]: val };
    updateData({ entries: next });
  };
  const addEntry = () => updateData({ entries: [...entries, { key: '', val: '' }] });
  const removeEntry = () => entries.length > 1 && updateData({ entries: entries.slice(0, -1) });

  // Simple hash for visual
  const simpleHash = (str) => {
    let h = 0;
    for (let i = 0; i < (str || '').length; i++) h = (h * 31 + (str || '').charCodeAt(i)) & 0xff;
    return h % entries.length;
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-2">
        <button onClick={addEntry} className="text-[10px] text-gray-500 hover:text-primary px-2 py-0.5 rounded border border-app-border transition-colors">+ Add Pair</button>
        <button onClick={removeEntry} className="text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded border border-app-border transition-colors">− Remove</button>
      </div>
      <div className="flex flex-col gap-0 border border-app-border-strong rounded-lg overflow-hidden bg-surface-bg">
        <div className="flex bg-primary/10 border-b border-app-border-strong">
          <div className="w-12 text-center text-[9px] font-bold text-gray-500 py-1.5 border-r border-app-border-strong/50">HASH</div>
          <div className="w-28 text-center text-[10px] font-bold text-primary py-1.5 border-r border-app-border-strong/50">KEY</div>
          <div className="w-28 text-center text-[10px] font-bold text-primary py-1.5">VALUE</div>
        </div>
        {entries.map((entry, i) => (
          <div key={i} className="flex border-b last:border-b-0 border-app-border-strong/50 group hover:bg-white/[0.02] transition-colors">
            <div className="w-12 border-r border-app-border-strong/50 p-2 flex justify-center">
              <span className="text-[9px] text-gray-600 font-mono">{entry.key ? simpleHash(entry.key) : i}</span>
            </div>
            <div className="w-28 border-r border-app-border-strong/50 p-2 flex justify-center">
              <EditableCell value={entry.key} onChange={(v) => updateEntry(i, 'key', v)} className="font-mono" />
            </div>
            <div className="w-28 p-2 flex justify-center">
              <EditableCell value={entry.val} onChange={(v) => updateEntry(i, 'val', v)} />
            </div>
          </div>
        ))}
      </div>
      <div className="text-[10px] text-gray-600 font-mono">entries = {entries.length} · O(1) avg lookup</div>
    </div>
  );
}

// =============================================
// MATRIX / GRID
// =============================================
function MatrixDiagram({ data, updateData }) {
  const rows = data.rows ?? 3;
  const cols = data.cols ?? 3;
  const cells = data.cells || Array(rows).fill(Array(cols).fill(''));

  const updateCell = (r, c, val) => {
    const next = cells.map(row => [...row]);
    next[r][c] = val;
    updateData({ cells: next });
  };

  const addRow = () => updateData({ rows: rows + 1, cells: [...cells, Array(cols).fill('')] });
  const removeRow = () => { if (rows > 1) updateData({ rows: rows - 1, cells: cells.slice(0, -1) }); };
  const addCol = () => updateData({ cols: cols + 1, cells: cells.map(row => [...row, '']) });
  const removeCol = () => { if (cols > 1) updateData({ cols: cols - 1, cells: cells.map(row => row.slice(0, -1)) }); };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap gap-2 justify-center">
        <button onClick={addRow} className="text-[10px] text-gray-500 hover:text-green-400 px-2 py-0.5 rounded border border-app-border transition-colors">+ Row</button>
        <button onClick={removeRow} className="text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded border border-app-border transition-colors">− Row</button>
        <button onClick={addCol} className="text-[10px] text-gray-500 hover:text-blue-400 px-2 py-0.5 rounded border border-app-border transition-colors">+ Col</button>
        <button onClick={removeCol} className="text-[10px] text-gray-500 hover:text-orange-400 px-2 py-0.5 rounded border border-app-border transition-colors">− Col</button>
      </div>
      <div className="flex flex-col gap-0">
        {/* Column indices */}
        <div className="flex">
          <div className="w-6" /> {/* spacer for row indices */}
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="w-10 text-center text-[8px] text-gray-600 font-mono m-[1px]">{c}</div>
          ))}
        </div>
        {/* Grid with row indices */}
        <div className="flex">
          <div className="flex flex-col">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="w-6 h-10 flex items-center justify-center text-[8px] text-gray-600 font-mono m-[1px]">{r}</div>
            ))}
          </div>
          <div className="border border-app-border-strong bg-surface-bg rounded p-0.5">
            {cells.map((row, r) => (
              <div key={r} className="flex gap-0">
                {row.map((val, c) => (
                  <div key={c} className="border border-app-border-strong w-10 h-10 flex items-center justify-center m-[1px] hover:bg-white/[0.03] transition-colors">
                    <EditableCell value={val} onChange={(v) => updateCell(r, c, v)} className="w-8 text-[10px]" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="text-[10px] text-gray-600 font-mono">{rows} × {cols} Matrix</div>
    </div>
  );
}

// =============================================
// SEGMENT TREE
// =============================================
function SegmentTreeDiagram({ data, updateData }) {
  const nodes = data.nodes || ['16', '4', '12', '1', '3', '5', '7'];
  const intervals = data.intervals || ['[0,3]', '[0,1]', '[2,3]', '[0]', '[1]', '[2]', '[3]'];
  
  const updateNode = (i, val) => {
    const next = [...nodes]; next[i] = val; updateData({ nodes: next });
  };
  const updateInterval = (i, val) => {
    const next = [...intervals]; next[i] = val; updateData({ intervals: next });
  };

  const renderNode = (i) => (
    <div className="flex flex-col items-center">
      <div className={`border rounded-lg w-14 h-14 flex flex-col items-center justify-center transition-colors ${
        i === 0 ? 'bg-primary/10 border-primary/30' : 
        i >= 3 ? 'bg-blue-500/5 border-blue-500/15' : 'bg-surface-bg border-app-border-strong'}`}>
        <EditableCell value={nodes[i]} onChange={(v) => updateNode(i, v)} className="w-10 font-bold" />
        <EditableCell value={intervals[i]} onChange={(v) => updateInterval(i, v)} className="w-10 text-[8px] text-gray-500" />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px] text-gray-500 mb-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-primary/30 inline-block" /> Root (aggregate)</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500/20 inline-block" /> Leaf (array element)</span>
      </div>
      <div className="flex flex-col items-center">
        {renderNode(0)}
        <div className="w-px h-4 bg-white/10" />
      </div>
      <div className="flex items-start gap-16 relative">
        <div className="absolute top-0 left-1/4 right-1/4 h-px bg-white/10" />
        <div className="flex flex-col items-center">
          <div className="w-px h-4 bg-white/10" />
          {renderNode(1)}
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-start gap-6 relative">
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-white/10" />
            <div className="flex flex-col items-center">
              <div className="w-px h-3 bg-white/10" />
              {renderNode(3)}
            </div>
            <div className="flex flex-col items-center">
              <div className="w-px h-3 bg-white/10" />
              {renderNode(4)}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-px h-4 bg-white/10" />
          {renderNode(2)}
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-start gap-6 relative">
            <div className="absolute top-0 left-1/4 right-1/4 h-px bg-white/10" />
            <div className="flex flex-col items-center">
              <div className="w-px h-3 bg-white/10" />
              {renderNode(5)}
            </div>
            <div className="flex flex-col items-center">
              <div className="w-px h-3 bg-white/10" />
              {renderNode(6)}
            </div>
          </div>
        </div>
      </div>
      <div className="text-[10px] text-gray-600 font-mono mt-2">query/update O(log n) · build O(n)</div>
    </div>
  );
}

// =============================================
// INTERVALS (GREEDY)
// =============================================
function IntervalsDiagram({ data, updateData }) {
  const intervals = data.intervals || [];
  const minVal = data.minVal ?? 0;
  const maxVal = data.maxVal ?? 10;
  const range = Math.max(1, maxVal - minVal);
  
  const updateInterval = (i, field, val) => {
    const next = [...intervals];
    next[i] = { ...next[i], [field]: field === 'label' || field === 'color' ? val : Number(val) };
    updateData({ intervals: next });
  };
  const addInterval = () => updateData({ intervals: [...intervals, { start: minVal, end: Math.min(maxVal, minVal + 2), label: String.fromCharCode(65 + intervals.length), color: ['#3b82f6','#ef4444','#22c55e','#f59e0b','#a855f7','#ec4899'][intervals.length % 6] }] });
  const removeInterval = (idx) => updateData({ intervals: intervals.filter((_, i) => i !== idx) });

  return (
    <div className="flex flex-col w-full max-w-lg gap-4">
      <div className="flex gap-2 justify-center flex-wrap">
        <button onClick={addInterval} className="text-[10px] text-gray-500 hover:text-primary px-2 py-0.5 rounded border border-app-border transition-colors">+ Add Interval</button>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-[10px] text-gray-600">Range:</span>
          <input type="number" value={minVal} onChange={e => updateData({ minVal: Number(e.target.value) })} className="w-10 bg-surface-bg border border-app-border rounded text-[10px] text-center text-primary-text outline-none" />
          <span className="text-[10px] text-gray-500">to</span>
          <input type="number" value={maxVal} onChange={e => updateData({ maxVal: Number(e.target.value) })} className="w-10 bg-surface-bg border border-app-border rounded text-[10px] text-center text-primary-text outline-none" />
        </div>
      </div>

      <div className="relative w-full">
        {/* Ruler */}
        <div className="flex justify-between px-1 mb-1">
          {Array.from({ length: Math.min(range + 1, 20) }).map((_, i) => {
            const val = minVal + Math.round(i * range / Math.min(range, 19));
            return (
              <div key={i} className="flex flex-col items-center" style={{ width: 0 }}>
                <span className="text-[8px] text-gray-500 font-mono">{val}</span>
              </div>
            );
          })}
        </div>
        
        {/* Timeline ruler line */}
        <div className="h-px bg-white/20 w-full mb-1" />
        
        {/* Interval tracks */}
        <div className="flex flex-col gap-1.5 w-full bg-white/[0.015] rounded-lg border border-white/5 py-3 px-1 min-h-[60px]">
          {intervals.length === 0 && (
            <div className="text-[10px] text-gray-600 text-center py-4">Click "+ Add Interval" to get started</div>
          )}
          {intervals.map((inv, i) => {
            const leftPercent = Math.max(0, Math.min(100, ((inv.start - minVal) / range) * 100));
            const widthPercent = Math.max(2, Math.min(100 - leftPercent, ((inv.end - inv.start) / range) * 100));
            
            return (
              <div key={i} className="h-7 w-full relative group">
                <div 
                  className="absolute h-full rounded-md flex items-center justify-between px-2 opacity-85 hover:opacity-100 transition-all hover:shadow-lg hover:shadow-current/10"
                  style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, backgroundColor: inv.color || '#3b82f6' }}
                >
                  <span className="text-[10px] text-white font-bold drop-shadow-md truncate">{inv.label}</span>
                  <span className="text-[9px] text-white/70 font-mono drop-shadow-md shrink-0 ml-1">{inv.start}-{inv.end}</span>
                </div>
                {/* Edit controls on hover */}
                <div className="absolute right-0 -top-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                  <div className="bg-[#1a1a1a] border border-app-border-strong rounded-lg px-2 py-1 flex items-center gap-1.5 pointer-events-auto shadow-xl">
                    <input type="number" value={inv.start} onChange={e => updateInterval(i, 'start', e.target.value)} className="w-8 bg-transparent text-[10px] text-center text-primary-text outline-none border-b border-white/10" />
                    <span className="text-[10px] text-gray-500">→</span>
                    <input type="number" value={inv.end} onChange={e => updateInterval(i, 'end', e.target.value)} className="w-8 bg-transparent text-[10px] text-center text-primary-text outline-none border-b border-white/10" />
                    <input type="color" value={inv.color || '#3b82f6'} onChange={e => updateInterval(i, 'color', e.target.value)} className="w-4 h-4 p-0 border-0 rounded cursor-pointer" />
                    <button onClick={() => removeInterval(i)} className="text-red-400 hover:text-red-300 transition-colors"><Trash2 size={10} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="text-[10px] text-gray-600 font-mono text-center">{intervals.length} intervals · hover to edit</div>
    </div>
  );
}

// =============================================
// RECURSION TREE
// =============================================
const RecursionEdge = ({ type, onClick, isLeft }) => {
  const isBacktrack = type === 'backtrack';
  return (
    <div className="absolute inset-0 w-full h-full z-0 pointer-events-none">
      <svg width="100%" height="100%" className="absolute inset-0 overflow-visible" preserveAspectRatio="none">
        {isLeft ? (
          <>
            <line x1="50%" y1="0" x2="25%" y2="100%" stroke="transparent" strokeWidth="20" className="pointer-events-auto cursor-pointer" onClick={onClick} title="Click to toggle" />
            <line x1="50%" y1="0" x2="25%" y2="100%" stroke={isBacktrack ? '#ef4444' : '#22c55e'} strokeWidth="2.5" strokeDasharray={isBacktrack ? '6,4' : 'none'} className="pointer-events-none" />
          </>
        ) : (
          <>
            <line x1="50%" y1="0" x2="75%" y2="100%" stroke="transparent" strokeWidth="20" className="pointer-events-auto cursor-pointer" onClick={onClick} title="Click to toggle" />
            <line x1="50%" y1="0" x2="75%" y2="100%" stroke={isBacktrack ? '#ef4444' : '#22c55e'} strokeWidth="2.5" strokeDasharray={isBacktrack ? '6,4' : 'none'} className="pointer-events-none" />
          </>
        )}
      </svg>
    </div>
  );
};

function RecursionTreeDiagram({ data, updateData }) {
  const update = (field, val) => updateData({ [field]: val });
  const toggleEdge = (field) => {
    const current = data[field];
    update(field, current === 'forward' ? 'backtrack' : 'forward');
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px] mb-2 bg-surface-bg px-3 py-1.5 rounded-lg border border-app-border">
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 bg-green-500 inline-block rounded" />
          <span className="text-green-400">Forward</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-5 h-0.5 bg-red-500 inline-block rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #ef4444 0, #ef4444 3px, transparent 3px, transparent 5px)' }} />
          <span className="text-red-400">Backtrack</span>
        </span>
        <span className="text-gray-600">Click edge to toggle</span>
      </div>
      {/* Root */}
      <div className="flex flex-col items-center">
        <div className="border border-primary/30 bg-primary/10 rounded-lg px-3 py-2 flex items-center justify-center">
          <EditableCell value={data.root} onChange={(v) => update('root', v)} className="w-20 font-mono text-[11px]" />
        </div>
        <div className="w-px h-4 bg-transparent" />
      </div>
      {/* Level 1 */}
      <div className="flex items-start gap-16 relative">
        <RecursionEdge type={data.edgeLeft} onClick={() => toggleEdge('edgeLeft')} isLeft={true} />
        <RecursionEdge type={data.edgeRight} onClick={() => toggleEdge('edgeRight')} isLeft={false} />
        
        <div className="flex flex-col items-center z-10 pt-4">
          <div className="border border-app-border-strong bg-surface-bg rounded-lg px-3 py-2 flex items-center justify-center">
            <EditableCell value={data.left} onChange={(v) => update('left', v)} className="w-20 font-mono text-[11px]" />
          </div>
          
          <div className="w-px h-4 bg-transparent" />
          {/* Level 2 Left */}
          <div className="flex items-start gap-2 relative">
            <RecursionEdge type={data.edgeLeftLeft} onClick={() => toggleEdge('edgeLeftLeft')} isLeft={true} />
            <RecursionEdge type={data.edgeLeftRight} onClick={() => toggleEdge('edgeLeftRight')} isLeft={false} />
            <div className="flex flex-col items-center z-10 pt-4">
              <div className="border border-app-border-strong bg-surface-bg rounded-lg px-2 py-1.5 flex items-center justify-center">
                <EditableCell value={data.leftLeft} onChange={(v) => update('leftLeft', v)} className="w-16 text-[10px] font-mono" />
              </div>
            </div>
            <div className="flex flex-col items-center z-10 pt-4">
              <div className="border border-app-border-strong bg-surface-bg rounded-lg px-2 py-1.5 flex items-center justify-center">
                <EditableCell value={data.leftRight} onChange={(v) => update('leftRight', v)} className="w-16 text-[10px] font-mono" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center z-10 pt-4">
          <div className="border border-app-border-strong bg-surface-bg rounded-lg px-3 py-2 flex items-center justify-center">
            <EditableCell value={data.right} onChange={(v) => update('right', v)} className="w-20 font-mono text-[11px]" />
          </div>
          
          <div className="w-px h-4 bg-transparent" />
          {/* Level 2 Right */}
          <div className="flex items-start gap-2 relative">
            <RecursionEdge type={data.edgeRightLeft} onClick={() => toggleEdge('edgeRightLeft')} isLeft={true} />
            <RecursionEdge type={data.edgeRightRight} onClick={() => toggleEdge('edgeRightRight')} isLeft={false} />
            <div className="flex flex-col items-center z-10 pt-4">
              <div className="border border-app-border-strong bg-surface-bg rounded-lg px-2 py-1.5 flex items-center justify-center">
                <EditableCell value={data.rightLeft} onChange={(v) => update('rightLeft', v)} className="w-16 text-[10px] font-mono" />
              </div>
            </div>
            <div className="flex flex-col items-center z-10 pt-4">
              <div className="border border-app-border-strong bg-surface-bg rounded-lg px-2 py-1.5 flex items-center justify-center">
                <EditableCell value={data.rightRight} onChange={(v) => update('rightRight', v)} className="w-16 text-[10px] font-mono" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// DP TABLE
// =============================================
function DPTableDiagram({ data, updateData }) {
  const rows = data.rows ?? 3;
  const cols = data.cols ?? 4;
  const cells = data.cells || Array(rows).fill(Array(cols).fill(''));
  const arrows = data.arrows || [];

  const [mode, setMode] = useState('edit'); // 'edit' | 'draw'
  const [addingArrow, setAddingArrow] = useState(null); // { r, c }

  const updateCell = (r, c, val) => {
    const next = cells.map(row => [...row]);
    next[r][c] = val;
    updateData({ cells: next });
  };

  const addRow = () => updateData({ rows: rows + 1, cells: [...cells, Array(cols).fill('')] });
  const removeRow = () => rows > 1 && updateData({ rows: rows - 1, cells: cells.slice(0, -1) });
  const addCol = () => updateData({ cols: cols + 1, cells: cells.map(row => [...row, '']) });
  const removeCol = () => cols > 1 && updateData({ cols: cols - 1, cells: cells.map(row => row.slice(0, -1)) });

  const handleCellClick = (r, c) => {
    if (mode === 'edit') return;
    if (!addingArrow) {
      setAddingArrow({ r, c });
    } else {
      if (addingArrow.r !== r || addingArrow.c !== c) {
        updateData({ arrows: [...arrows, { fromR: addingArrow.r, fromC: addingArrow.c, toR: r, toC: c }] });
      }
      setAddingArrow(null);
    }
  };

  const removeArrow = (idx) => {
    updateData({ arrows: arrows.filter((_, i) => i !== idx) });
  };

  const clearArrows = () => {
    updateData({ arrows: [] });
    setAddingArrow(null);
  };

  const cellW = 44;
  const cellH = 44;
  const headerH = 18;
  const headerW = 22;
  const svgW = cols * cellW;
  const svgH = rows * cellH;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap gap-2 justify-center items-center">
        <button onClick={addRow} className="text-[10px] text-gray-500 hover:text-green-400 px-2 py-0.5 rounded border border-app-border transition-colors">+ Row</button>
        <button onClick={removeRow} className="text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded border border-app-border transition-colors">− Row</button>
        <button onClick={addCol} className="text-[10px] text-gray-500 hover:text-blue-400 px-2 py-0.5 rounded border border-app-border transition-colors">+ Col</button>
        <button onClick={removeCol} className="text-[10px] text-gray-500 hover:text-orange-400 px-2 py-0.5 rounded border border-app-border transition-colors">− Col</button>
        
        <div className="flex items-center bg-[#111] rounded-lg border border-white/5 ml-2 p-0.5">
          <button onClick={() => {setMode('edit'); setAddingArrow(null);}} className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${mode==='edit' ? 'bg-primary text-black font-bold' : 'text-gray-500 hover:text-gray-300'}`}>Edit</button>
          <button onClick={() => setMode('draw')} className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${mode==='draw' ? 'bg-[#a855f7] text-white font-bold' : 'text-gray-500 hover:text-gray-300'}`}>Draw Arrows</button>
        </div>
        {arrows.length > 0 && (
          <button onClick={clearArrows} className="text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded border border-app-border transition-colors">Clear Arrows</button>
        )}
      </div>

      {mode === 'draw' && (
        <div className="text-[10px] bg-[#a855f7]/10 border border-[#a855f7]/20 text-[#a855f7] px-3 py-1.5 rounded-lg font-mono">
          {addingArrow ? `Source: [${addingArrow.r}, ${addingArrow.c}] → Click target cell` : 'Click source cell to start drawing an arrow'}
        </div>
      )}

      <div className="flex flex-col">
        {/* Column headers */}
        <div className="flex" style={{ paddingLeft: headerW }}>
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="text-[8px] text-gray-600 font-mono text-center" style={{ width: cellW }}>{c}</div>
          ))}
        </div>
        
        <div className="flex">
          {/* Row headers */}
          <div className="flex flex-col">
            {Array.from({ length: rows }).map((_, r) => (
              <div key={r} className="text-[8px] text-gray-600 font-mono flex items-center justify-center" style={{ width: headerW, height: cellH }}>{r}</div>
            ))}
          </div>

          <div className="relative border border-app-border-strong bg-surface-bg rounded" style={{ width: svgW + 4, height: svgH + 4 }}>
            <div className="absolute top-[2px] left-[2px] flex flex-col gap-0 z-10">
              {cells.map((row, r) => (
                <div key={r} className="flex gap-0">
                  {row.map((val, c) => (
                    <div 
                      key={c} 
                      className={`border border-app-border-strong flex items-center justify-center relative transition-colors ${
                        mode === 'draw' ? 'cursor-pointer hover:bg-white/10' : ''
                      } ${addingArrow?.r === r && addingArrow?.c === c ? 'bg-[#a855f7]/20 ring-1 ring-[#a855f7]' : ''} ${
                        r === 0 || c === 0 ? 'bg-white/[0.02]' : ''}`}
                      style={{ width: cellW, height: cellH }}
                      onClick={() => handleCellClick(r, c)}
                    >
                      <EditableCell value={val} onChange={(v) => updateCell(r, c, v)} className={`w-8 text-[10px] ${mode === 'draw' ? 'pointer-events-none' : ''}`} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <svg className="absolute top-[2px] left-[2px] pointer-events-none z-20" width={svgW} height={svgH}>
              <defs>
                <marker id="dp-arrowhead" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
                  <polygon points="0 0, 6 2, 0 4" fill="#a855f7" />
                </marker>
              </defs>
              {arrows.map((arr, i) => {
                const startX = arr.fromC * cellW + cellW / 2;
                const startY = arr.fromR * cellH + cellH / 2;
                const endX = arr.toC * cellW + cellW / 2;
                const endY = arr.toR * cellH + cellH / 2;
                
                const dx = endX - startX;
                const dy = endY - startY;
                const midX = startX + dx / 2 - dy * 0.15;
                const midY = startY + dy / 2 + dx * 0.15;

                return (
                  <g key={i} className="pointer-events-auto cursor-pointer" onClick={() => removeArrow(i)}>
                    <path 
                      d={`M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`} 
                      fill="none" 
                      stroke="#a855f7" 
                      strokeWidth="2"
                      strokeDasharray="4,2"
                      markerEnd="url(#dp-arrowhead)"
                      className="hover:stroke-red-500 hover:stroke-[3px] transition-all"
                    />
                    <circle cx={midX} cy={midY} r="6" fill="transparent" />
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
      <div className="text-[10px] text-gray-600 font-mono">{rows} × {cols} · {arrows.length} transition{arrows.length !== 1 ? 's' : ''} · click arrow to delete</div>
    </div>
  );
}



// =============================================
// FREESTYLE CANVAS
// =============================================
const CANVAS_COLORS = ['#DEDBC8', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ffffff', '#6b7280'];

function FreestyleDiagram({ data, updateData }) {
  const { promptAsync } = useDialog();
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('pen'); // pen | rect | circle | arrow | text | eraser | select
  const [color, setColor] = useState('#DEDBC8');
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedShapeIdx, setSelectedShapeIdx] = useState(null);
  const drawStateRef = useRef({ startX: 0, startY: 0, points: [], dragOffsetX: 0, dragOffsetY: 0 });

  const strokes = data.strokes || [];
  const shapes = data.shapes || [];
  const labels = data.labels || [];

  const insertTemplate = (type) => {
    setShowTemplates(false);
    const cx = 360; // canvas width / 2
    const cy = 200; // canvas height / 2
    
    let newShapes = [...shapes];
    let newLabels = [...labels];
    let newStrokes = [...strokes];

    if (type === 'array') {
      for(let i=0; i<5; i++) {
        newShapes.push({ type: 'rect', x: cx - 100 + i*40, y: cy - 20, w: 40, h: 40, color, width: lineWidth });
        newLabels.push({ text: String(i), x: cx - 100 + i*40 + 16, y: cy - 20 + 24, color });
      }
    } else if (type === 'stack') {
      for(let i=0; i<4; i++) {
        newShapes.push({ type: 'rect', x: cx - 30, y: cy - 60 + i*30, w: 60, h: 30, color, width: lineWidth });
      }
      newLabels.push({ text: 'TOP', x: cx - 70, y: cy - 60 + 20, color });
    } else if (type === 'queue') {
      for(let i=0; i<4; i++) {
        newShapes.push({ type: 'rect', x: cx - 80 + i*40, y: cy - 20, w: 40, h: 40, color, width: lineWidth });
      }
    } else if (type === 'llnode') {
      newShapes.push({ type: 'rect', x: cx - 40, y: cy - 20, w: 80, h: 40, color, width: lineWidth });
      newStrokes.push({ points: [{x: cx, y: cy - 20}, {x: cx, y: cy + 20}], color, width: lineWidth });
      newShapes.push({ type: 'arrow', x: cx + 40, y: cy, w: 40, h: 0, color, width: lineWidth });
    } else if (type === 'treenode') {
      newShapes.push({ type: 'circle', x: cx - 20, y: cy - 20, w: 40, h: 40, color, width: lineWidth });
      newShapes.push({ type: 'arrow', x: cx - 14, y: cy + 14, w: -20, h: 30, color, width: lineWidth });
      newShapes.push({ type: 'arrow', x: cx + 14, y: cy + 14, w: 20, h: 30, color, width: lineWidth });
    } else if (type === 'graphnode') {
      newShapes.push({ type: 'circle', x: cx - 20, y: cy - 20, w: 40, h: 40, color, width: lineWidth });
      newLabels.push({ text: 'A', x: cx - 4, y: cy + 4, color });
    }

    updateData({ shapes: newShapes, labels: newLabels, strokes: newStrokes });
  };

  // Redraw everything
  const redraw = useCallback((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);

    // Draw strokes
    strokes.forEach(s => {
      if (!s.points || s.points.length < 2) return;
      ctx.strokeStyle = s.color || '#DEDBC8';
      ctx.lineWidth = s.width || 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      for (let i = 1; i < s.points.length; i++) {
        ctx.lineTo(s.points[i].x, s.points[i].y);
      }
      ctx.stroke();
    });

    // Draw shapes
    shapes.forEach((s, idx) => {
      const isSelected = idx === selectedShapeIdx;
      ctx.strokeStyle = isSelected ? '#d4c94a' : (s.color || '#DEDBC8');
      ctx.lineWidth = isSelected ? (s.width || 2) + 1 : (s.width || 2);
      ctx.lineCap = 'round';
      if (isSelected) {
        ctx.shadowColor = '#d4c94a';
        ctx.shadowBlur = 8;
      }
      if (s.type === 'rect') {
        ctx.strokeRect(s.x, s.y, s.w, s.h);
      } else if (s.type === 'circle') {
        const rx = Math.abs(s.w) / 2;
        const ry = Math.abs(s.h) / 2;
        ctx.beginPath();
        ctx.ellipse(s.x + s.w / 2, s.y + s.h / 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (s.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.w, s.y + s.h);
        ctx.stroke();
        const angle = Math.atan2(s.h, s.w);
        const headLen = 12;
        ctx.beginPath();
        ctx.moveTo(s.x + s.w, s.y + s.h);
        ctx.lineTo(s.x + s.w - headLen * Math.cos(angle - Math.PI / 6), s.y + s.h - headLen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(s.x + s.w, s.y + s.h);
        ctx.lineTo(s.x + s.w - headLen * Math.cos(angle + Math.PI / 6), s.y + s.h - headLen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    });

    // Draw labels
    labels.forEach(l => {
      ctx.fillStyle = l.color || '#DEDBC8';
      ctx.font = '13px Almarai, sans-serif';
      ctx.fillText(l.text, l.x, l.y);
    });
  }, [strokes, shapes, labels, selectedShapeIdx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    redraw(ctx, canvas.width, canvas.height);
  }, [redraw]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handlePointerDown = async (e) => {
    const pos = getPos(e);
    drawStateRef.current = { startX: pos.x, startY: pos.y, points: [pos], dragOffsetX: 0, dragOffsetY: 0 };

    // SELECT/MOVE tool: hit-test shapes, pick the closest one
    if (tool === 'select') {
      const HIT_RADIUS = 24;
      let found = null;
      for (let i = shapes.length - 1; i >= 0; i--) {
        const s = shapes[i];
        const cx = s.x + (s.w || 0) / 2;
        const cy = s.y + (s.h || 0) / 2;
        if (Math.hypot(cx - pos.x, cy - pos.y) < Math.max(HIT_RADIUS, Math.abs(s.w || 0) / 2 + 10, Math.abs(s.h || 0) / 2 + 10)) {
          found = i;
          break;
        }
      }
      setSelectedShapeIdx(found);
      if (found !== null) {
        drawStateRef.current.dragOffsetX = pos.x - shapes[found].x;
        drawStateRef.current.dragOffsetY = pos.y - shapes[found].y;
        setIsDrawing(true);
      }
      return;
    }

    if (tool === 'text') {
      const text = await promptAsync('Add Text', 'Enter label text:', '', 'Label...');
      if (text) {
        updateData({ labels: [...labels, { x: pos.x, y: pos.y, text, color }] });
      }
      return;
    }

    if (tool === 'eraser') {
      // Remove any stroke/shape/label near the click
      const threshold = 20;
      const newStrokes = strokes.filter(s => {
        return !s.points?.some(p => Math.hypot(p.x - pos.x, p.y - pos.y) < threshold);
      });
      const newShapes = shapes.filter(s => {
        const cx = s.x + (s.w || 0) / 2;
        const cy = s.y + (s.h || 0) / 2;
        return Math.hypot(cx - pos.x, cy - pos.y) > threshold;
      });
      const newLabels = labels.filter(l => Math.hypot(l.x - pos.x, l.y - pos.y) > threshold);
      updateData({ strokes: newStrokes, shapes: newShapes, labels: newLabels });
      return;
    }

    setIsDrawing(true);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    const canvas = canvasRef.current;

    // MOVE selected shape
    if (tool === 'select' && selectedShapeIdx !== null) {
      const { dragOffsetX, dragOffsetY } = drawStateRef.current;
      const newShapes = shapes.map((s, i) => {
        if (i !== selectedShapeIdx) return s;
        return { ...s, x: pos.x - dragOffsetX, y: pos.y - dragOffsetY };
      });
      updateData({ shapes: newShapes });
      return;
    }

    if (tool === 'pen') {
      drawStateRef.current.points.push(pos);
      // Live preview
      const pts = drawStateRef.current.points;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else {
      // Preview shapes by redrawing
      redraw(ctx, canvas.width, canvas.height);
      const { startX, startY } = drawStateRef.current;
      const w = pos.x - startX;
      const h = pos.y - startY;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash([5, 5]);
      if (tool === 'rect') {
        ctx.strokeRect(startX, startY, w, h);
      } else if (tool === 'circle') {
        ctx.beginPath();
        ctx.ellipse(startX + w / 2, startY + h / 2, Math.abs(w) / 2, Math.abs(h) / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (tool === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (tool === 'select') return; // shape already saved live during move

    if (tool === 'pen') {
      const newStroke = { points: drawStateRef.current.points, color, width: lineWidth };
      updateData({ strokes: [...strokes, newStroke] });
    } else {
      const pos = getPos(e);
      const { startX, startY } = drawStateRef.current;
      const newShape = {
        type: tool, x: startX, y: startY,
        w: pos.x - startX, h: pos.y - startY,
        color, width: lineWidth
      };
      updateData({ shapes: [...shapes, newShape] });
    }
  };

  const handleClear = () => {
    updateData({ strokes: [], shapes: [], labels: [] });
  };

  const handleUndo = () => {
    if (strokes.length > 0) {
      updateData({ strokes: strokes.slice(0, -1) });
    } else if (shapes.length > 0) {
      updateData({ shapes: shapes.slice(0, -1) });
    } else if (labels.length > 0) {
      updateData({ labels: labels.slice(0, -1) });
    }
  };

  const tools = [
    { id: 'select', icon: MousePointer2, tip: 'Select & Move' },
    { id: 'pen', icon: Pencil, tip: 'Pen' },
    { id: 'rect', icon: Square, tip: 'Rectangle' },
    { id: 'circle', icon: Circle, tip: 'Circle' },
    { id: 'arrow', icon: ArrowUpRight, tip: 'Arrow' },
    { id: 'text', icon: TypeIcon, tip: 'Text Label' },
    { id: 'eraser', icon: Eraser, tip: 'Eraser' },
  ];

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {/* Tool buttons */}
        <div className="flex items-center gap-0.5 bg-[#111] rounded-lg p-1 border border-white/5">
          {tools.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`p-1.5 rounded-md transition-all ${tool === t.id ? 'bg-primary/20 text-primary' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
              title={t.tip}
            >
              <t.icon size={14} />
            </button>
          ))}
        </div>

        {/* Color palette */}
        <div className="flex items-center gap-1 bg-[#111] rounded-lg p-1 border border-white/5">
          {CANVAS_COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        {/* Stroke width */}
        <div className="flex items-center gap-1.5 bg-[#111] rounded-lg px-2 py-1 border border-white/5">
          {[1, 2, 4].map(w => (
            <button
              key={w}
              onClick={() => setLineWidth(w)}
              className={`flex items-center justify-center w-6 h-6 rounded transition-colors ${lineWidth === w ? 'bg-white/10 text-primary' : 'text-gray-500 hover:text-gray-300'}`}
              title={`Width ${w}`}
            >
              <div className="rounded-full bg-current" style={{ width: w + 2, height: w + 2 }} />
            </button>
          ))}
        </div>

        {/* Undo / Clear */}
        <div className="flex items-center gap-0.5 bg-[#111] rounded-lg p-1 border border-white/5">
          <button onClick={handleUndo} className="p-1.5 rounded-md text-gray-500 hover:text-gray-300 hover:bg-white/5 transition-colors" title="Undo">
            <RotateCcw size={14} />
          </button>
          <button onClick={handleClear} className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Clear All">
            <Trash2 size={14} />
          </button>
        </div>

        {/* Templates */}
        <div className="relative">
          <button 
            onClick={() => setShowTemplates(!showTemplates)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#111] border border-white/5 rounded-lg text-xs font-medium text-gray-400 hover:text-gray-200 transition-colors"
          >
            <LayoutTemplate size={14} /> Templates <ChevronDown size={12} />
          </button>
          {showTemplates && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowTemplates(false)} />
              <div className="absolute top-full mt-1 right-0 w-36 bg-[#1a1a1a] border border-white/10 rounded-lg shadow-xl z-50 py-1 flex flex-col">
                <button onClick={() => insertTemplate('array')} className="text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors">Array</button>
                <button onClick={() => insertTemplate('stack')} className="text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors">Stack</button>
                <button onClick={() => insertTemplate('queue')} className="text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors">Queue</button>
                <button onClick={() => insertTemplate('llnode')} className="text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors">Linked List Node</button>
                <button onClick={() => insertTemplate('treenode')} className="text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors">Tree Node</button>
                <button onClick={() => insertTemplate('graphnode')} className="text-left px-3 py-1.5 text-xs text-gray-300 hover:bg-white/5 transition-colors">Graph Node</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={720}
        height={400}
        className="bg-[#0a0a0a] rounded-xl border border-white/5 w-full"
        style={{ maxWidth: 720, touchAction: 'none', cursor: tool === 'select' ? 'default' : 'crosshair' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={() => { if (isDrawing) handlePointerUp({ clientX: 0, clientY: 0 }); }}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      />
    </div>
  );
}

// =============================================
// BINARY SEARCH
// =============================================
function BinarySearchDiagram({ data, updateData }) {
  const update = (field, val) => updateData({ [field]: val });
  
  const moveLeft = (dir) => update('left', Math.max(0, Math.min(data.items.length - 1, data.left + dir)));
  const moveRight = (dir) => update('right', Math.max(0, Math.min(data.items.length - 1, data.right + dir)));
  const calcMid = () => update('mid', Math.floor((data.left + data.right) / 2));
  
  const updateItem = (i, val) => {
    const newItems = [...data.items];
    newItems[i] = val;
    update('items', newItems);
  };
  const addItem = () => update('items', [...data.items, '']);
  const removeItem = () => update('items', data.items.slice(0, -1));

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Controls */}
      <div className="flex items-center gap-6 text-[10px] font-mono bg-surface-bg px-4 py-2 rounded-xl border border-app-border">
        <div className="flex items-center gap-2">
          <span className="text-green-400 font-bold">L:</span>
          <button onClick={() => moveLeft(-1)} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 rounded">{'<'}</button>
          <span>{data.left}</span>
          <button onClick={() => moveLeft(1)} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 rounded">{'>'}</button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-bold">M:</span>
          <button onClick={calcMid} className="px-2 py-0.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded border border-yellow-500/20">Calc</button>
          <span>{data.mid}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-400 font-bold">R:</span>
          <button onClick={() => moveRight(-1)} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 rounded">{'<'}</button>
          <span>{data.right}</span>
          <button onClick={() => moveRight(1)} className="px-1.5 py-0.5 bg-white/5 hover:bg-white/10 rounded">{'>'}</button>
        </div>
      </div>

      <div className="w-full overflow-x-auto py-8 px-4 custom-scrollbar">
        <div className="flex items-center justify-center gap-1 w-max mx-auto relative">
          {data.items.map((item, i) => {
            const isL = i === data.left;
            const isR = i === data.right;
            const isM = i === data.mid;
            const outOfBounds = i < data.left || i > data.right;
            
            let bg = 'bg-surface-bg';
            let border = 'border-app-border-strong';
            if (isM) { bg = 'bg-yellow-500/20'; border = 'border-yellow-500/50'; }
            else if (isL) { bg = 'bg-green-500/20'; border = 'border-green-500/50'; }
            else if (isR) { bg = 'bg-blue-500/20'; border = 'border-blue-500/50'; }
            else if (!outOfBounds) { bg = 'bg-white/5'; border = 'border-white/20'; }

            return (
              <div key={i} className={`flex flex-col items-center shrink-0 transition-opacity duration-300 ${outOfBounds ? 'opacity-30' : 'opacity-100'}`}>
                {/* Top Pointers */}
                <div className="h-6 mb-1 flex items-end justify-center gap-0.5">
                  {isL && <div className="text-[10px] font-bold text-green-400 font-mono">L↓</div>}
                  {isM && <div className="text-[10px] font-bold text-yellow-400 font-mono">M↓</div>}
                  {isR && <div className="text-[10px] font-bold text-blue-400 font-mono">R↓</div>}
                </div>
                
                <div className={`border px-3 py-2 text-center min-w-[44px] transition-colors ${bg} ${border}`}>
                  <EditableCell value={item} onChange={(v) => updateItem(i, v)} />
                </div>
                <span className="text-[9px] text-gray-500 mt-1 font-mono">{i}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button onClick={addItem} className="text-[10px] text-gray-500 hover:text-primary transition-colors">+ Element</button>
        <button onClick={removeItem} className="text-[10px] text-gray-500 hover:text-red-400 transition-colors">− Element</button>
      </div>
    </div>
  );
}

// =============================================
// SORTING VISUALIZER
// =============================================
function SortingDiagram({ data, updateData }) {
  const update = (field, val) => updateData({ [field]: val });
  
  const updateItem = (i, val) => {
    const newItems = [...data.items];
    newItems[i] = parseInt(val) || 0;
    update('items', newItems);
  };
  
  const maxVal = Math.max(...data.items, 1);
  
  const toggleComparing = (i) => {
    let comp = [...(data.comparing || [])];
    if (comp.includes(i)) comp = comp.filter(x => x !== i);
    else if (comp.length < 2) comp.push(i);
    else { comp.shift(); comp.push(i); }
    update('comparing', comp);
  };

  const toggleSorted = (i) => {
    let sorted = [...(data.sorted || [])];
    if (sorted.includes(i)) sorted = sorted.filter(x => x !== i);
    else sorted.push(i);
    update('sorted', sorted);
  };

  const swapComparing = () => {
    const comp = data.comparing || [];
    if (comp.length !== 2) return;
    const newItems = [...data.items];
    const temp = newItems[comp[0]];
    newItems[comp[0]] = newItems[comp[1]];
    newItems[comp[1]] = temp;
    updateData({ items: newItems, comparing: [] });
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="flex items-center gap-4 text-[9px] font-mono mb-6 bg-surface-bg px-4 py-2 rounded-xl border border-app-border">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500/80" /> Comparing (Click 2)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500/80" /> Pivot (Dbl Click)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500/80" /> Sorted (Shift+Click)</span>
        <div className="w-px h-4 bg-app-border-strong mx-1" />
        <button onClick={swapComparing} disabled={(data.comparing||[]).length !== 2} className="px-2 py-1 bg-white/5 hover:bg-white/10 disabled:opacity-30 rounded transition-colors text-primary font-bold">Swap Selected</button>
      </div>

      <div className="w-full overflow-x-auto py-4 custom-scrollbar">
        <div className="flex items-end justify-center gap-2 w-max mx-auto h-[160px] pb-6">
          {data.items.map((val, i) => {
            const isComparing = (data.comparing || []).includes(i);
            const isSorted = (data.sorted || []).includes(i);
            const isPivot = data.pivot === i;
            
            let bg = 'bg-white/20';
            if (isComparing) bg = 'bg-red-500/80 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
            else if (isPivot) bg = 'bg-yellow-500/80 shadow-[0_0_15px_rgba(234,179,8,0.4)]';
            else if (isSorted) bg = 'bg-green-500/80 shadow-[0_0_15px_rgba(34,197,94,0.4)]';

            const heightPct = Math.max((val / maxVal) * 100, 10);
            
            return (
              <div key={i} className="flex flex-col justify-end items-center gap-2 shrink-0 group h-full relative">
                <input 
                  type="text" 
                  value={val} 
                  onChange={(e) => updateItem(i, e.target.value)}
                  className="w-8 text-center bg-transparent text-[10px] font-mono text-gray-400 group-hover:text-white outline-none"
                />
                <div 
                  className={`w-6 rounded-t-sm transition-all cursor-pointer hover:opacity-80 ${bg}`}
                  style={{ height: `${heightPct}%` }}
                  onClick={(e) => {
                    if (e.shiftKey) toggleSorted(i);
                    else toggleComparing(i);
                  }}
                  onDoubleClick={() => update('pivot', isPivot ? -1 : i)}
                />
                <span className="text-[9px] text-gray-600 font-mono absolute -bottom-4">{i}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="flex items-center gap-2 mt-4 text-[10px] font-mono text-gray-500">
        <button onClick={() => update('items', [...data.items, Math.floor(Math.random() * 100)])} className="hover:text-primary">+ Random Bar</button>
        <button onClick={() => update('items', data.items.slice(0, -1))} className="hover:text-red-400">− Remove Bar</button>
      </div>
    </div>
  );
}

// =============================================
// TRIE / PREFIX TREE
// =============================================
function TrieDiagram({ data, updateData }) {
  // A simple recursive tree editor
  // Node: { char: 'a', isWord: false, children: [] }
  
  const updateNode = (path, field, val) => {
    const newData = JSON.parse(JSON.stringify(data));
    let curr = newData;
    for (const p of path) {
      curr = curr.children[p];
    }
    curr[field] = val;
    updateData(newData);
  };

  const addChild = (path) => {
    const newData = JSON.parse(JSON.stringify(data));
    let curr = newData;
    for (const p of path) {
      curr = curr.children[p];
    }
    curr.children = curr.children || [];
    curr.children.push({ char: '?', isWord: false, children: [] });
    updateData(newData);
  };
  
  const removeChild = (path, childIndex) => {
    const newData = JSON.parse(JSON.stringify(data));
    let curr = newData;
    for (const p of path) {
      curr = curr.children[p];
    }
    curr.children.splice(childIndex, 1);
    updateData(newData);
  };

  const renderNode = (node, path, isRoot = false) => {
    return (
      <div className="flex flex-col items-center relative" key={path.join('-')}>
        {/* Node Circle */}
        <div className="relative group z-10 flex items-center justify-center">
          <div 
            onClick={() => !isRoot && updateNode(path, 'isWord', !node.isWord)}
            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors cursor-pointer ${
              node.isWord ? 'border-green-500 bg-green-500/10 text-green-400 font-bold shadow-[0_0_10px_rgba(34,197,94,0.2)]' : 
              isRoot ? 'border-primary/50 bg-primary/10 text-primary w-auto px-3 rounded-xl font-bold' : 
              'border-app-border-strong bg-surface-bg text-primary-text'
            }`}
          >
            {isRoot ? 'Root' : (
              <input 
                type="text" 
                maxLength={1} 
                value={node.char} 
                onChange={(e) => updateNode(path, 'char', e.target.value)} 
                className="w-full h-full bg-transparent text-center outline-none" 
              />
            )}
          </div>
          {/* Controls */}
          <div className="absolute left-full ml-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-surface-bg border border-app-border rounded px-1 py-0.5 pointer-events-auto shadow-xl z-50">
            <button onClick={() => addChild(path)} className="text-[9px] text-gray-400 hover:text-green-400">+</button>
            {!isRoot && <button onClick={() => removeChild(path.slice(0, -1), path[path.length - 1])} className="text-[9px] text-gray-400 hover:text-red-400">×</button>}
          </div>
        </div>

        {/* Children Layout */}
        {(node.children && node.children.length > 0) && (
          <div className="flex items-start gap-6 pt-6 relative mt-1">
            {/* Horizontal connection line */}
            <div className="absolute top-0 left-[50%] right-[50%] h-px bg-app-border-strong -translate-x-[50%] w-[calc(100%-1.5rem)] ml-[0.75rem]" style={{ 
              width: node.children.length === 1 ? '0' : 'calc(100% - 24px)', // approximation
              left: '12px', right: '12px' 
            }} />
            
            {/* Vertical drop from parent */}
            <div className="absolute -top-1 left-1/2 w-px h-3 bg-app-border-strong -translate-x-1/2" />

            {node.children.map((child, i) => (
              <div key={i} className="relative flex flex-col items-center">
                {/* Vertical drop to child */}
                <div className="absolute -top-6 left-1/2 w-px h-6 bg-app-border-strong -translate-x-1/2" />
                {renderNode(child, [...path, i], false)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full overflow-x-auto py-8 custom-scrollbar">
      <div className="w-max mx-auto min-w-[300px]">
        {renderNode(data, [], true)}
      </div>
      <div className="text-center mt-6 text-[10px] text-gray-500 font-mono">
        Click node to toggle isWord (green) · Hover node to add/remove
      </div>
    </div>
  );
}

// =============================================
// GRID PATHFINDING
// =============================================
function PathfindingDiagram({ data, updateData }) {
  const update = (field, val) => updateData({ [field]: val });
  
  const [paintMode, setPaintMode] = useState('wall'); // wall, start, end, path, visited
  
  const isMatch = (pos, r, c) => pos && pos.r === r && pos.c === c;
  const isWall = (r, c) => data.walls?.some(w => w.r === r && w.c === c);
  const isPath = (r, c) => data.path?.some(p => p.r === r && p.c === c);
  const isVisited = (r, c) => data.visited?.some(v => v.r === r && v.c === c);

  const toggleCell = (r, c) => {
    const cell = {r, c};
    let walls = [...(data.walls || [])];
    let path = [...(data.path || [])];
    let visited = [...(data.visited || [])];
    
    // Remove from all sets first to avoid duplicates
    walls = walls.filter(w => w.r !== r || w.c !== c);
    path = path.filter(p => p.r !== r || p.c !== c);
    visited = visited.filter(v => v.r !== r || v.c !== c);

    if (paintMode === 'start') { update('start', cell); return; }
    if (paintMode === 'end') { update('end', cell); return; }
    if (paintMode === 'wall' && !isWall(r, c)) walls.push(cell);
    if (paintMode === 'path' && !isPath(r, c)) path.push(cell);
    if (paintMode === 'visited' && !isVisited(r, c)) visited.push(cell);

    updateData({ ...data, walls, path, visited });
  };

  const addRow = () => update('rows', data.rows + 1);
  const addCol = () => update('cols', data.cols + 1);
  const removeRow = () => update('rows', Math.max(1, data.rows - 1));
  const removeCol = () => update('cols', Math.max(1, data.cols - 1));

  const modes = [
    { id: 'wall', label: 'Wall', color: 'bg-gray-600' },
    { id: 'start', label: 'Start', color: 'bg-green-500' },
    { id: 'end', label: 'End', color: 'bg-red-500' },
    { id: 'visited', label: 'Visited', color: 'bg-blue-500/30 border-blue-500' },
    { id: 'path', label: 'Path', color: 'bg-yellow-400' },
    { id: 'erase', label: 'Erase', color: 'bg-surface-bg border-dashed' }
  ];

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex flex-wrap items-center justify-center gap-2 bg-surface-bg px-4 py-2 rounded-xl border border-app-border">
        {modes.map(m => (
          <button 
            key={m.id}
            onClick={() => setPaintMode(m.id)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${paintMode === m.id ? 'bg-primary/20 text-primary font-bold' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <div className={`w-3 h-3 rounded-sm border border-app-border ${m.color}`} />
            <span className="text-[10px]">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="w-full overflow-x-auto custom-scrollbar pb-4">
        <div className="flex flex-col gap-1 w-max mx-auto p-4 bg-surface-bg/50 rounded-xl border border-app-border">
          {Array.from({ length: data.rows }).map((_, r) => (
            <div key={r} className="flex gap-1">
              {Array.from({ length: data.cols }).map((_, c) => {
                const isS = isMatch(data.start, r, c);
                const isE = isMatch(data.end, r, c);
                const isW = isWall(r, c);
                const isP = isPath(r, c);
                const isV = isVisited(r, c);

                let bgClass = 'bg-surface-bg border-app-border-strong hover:border-gray-500';
                let icon = '';

                if (isS) { bgClass = 'bg-green-500 border-green-600 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)] z-10'; icon = 'S'; }
                else if (isE) { bgClass = 'bg-red-500 border-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)] z-10'; icon = 'E'; }
                else if (isW) { bgClass = 'bg-gray-700 border-gray-600 shadow-inner'; }
                else if (isP) { bgClass = 'bg-yellow-400 border-yellow-500 text-black shadow-[0_0_10px_rgba(250,204,21,0.3)] z-0'; icon = '•'; }
                else if (isV) { bgClass = 'bg-blue-500/20 border-blue-500/50 text-blue-400'; }

                return (
                  <div 
                    key={c}
                    onPointerDown={() => toggleCell(r, c)}
                    onPointerEnter={(e) => e.buttons === 1 && toggleCell(r, c)}
                    className={`w-10 h-10 border rounded transition-all cursor-crosshair flex items-center justify-center font-bold font-mono text-sm select-none ${bgClass}`}
                  >
                    {icon}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3 text-[10px]">
        <button onClick={addRow} className="text-gray-500 hover:text-green-400 px-2 py-1 rounded border border-app-border">+ Row</button>
        <button onClick={removeRow} className="text-gray-500 hover:text-red-400 px-2 py-1 rounded border border-app-border">− Row</button>
        <button onClick={addCol} className="text-gray-500 hover:text-blue-400 px-2 py-1 rounded border border-app-border">+ Col</button>
        <button onClick={removeCol} className="text-gray-500 hover:text-orange-400 px-2 py-1 rounded border border-app-border">− Col</button>
      </div>
    </div>
  );
}

// =============================================
// TREE (GENERIC BINARY TREE)
// =============================================
function TreeDiagram({ data, updateData }) {
  const nodes = data.nodes || ['1', '2', '3', '4', '5', '', '6'];
  const visited = data.visited || [];
  const currentNode = data.currentNode !== undefined ? data.currentNode : -1;

  const updateNode = (i, val) => {
    const next = [...nodes];
    next[i] = val;
    updateData({ nodes: next });
  };
  const addNode = () => updateData({ nodes: [...nodes, ''] });
  const removeNode = () => nodes.length > 1 && updateData({ nodes: nodes.slice(0, -1) });

  // Display as tree
  const levels = [];
  let idx = 0;
  let levelSize = 1;
  while (idx < nodes.length) {
    levels.push(nodes.slice(idx, idx + levelSize));
    idx += levelSize;
    levelSize *= 2;
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="flex gap-2 bg-surface-bg px-4 py-2 rounded-xl border border-app-border">
        <button onClick={addNode} className="text-[10px] text-gray-500 hover:text-primary px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">+ Add Node</button>
        <button onClick={removeNode} className="text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded border border-app-border hover:border-app-border-strong transition-colors">− Remove</button>
      </div>

      <div className="flex items-center gap-4 text-[9px] font-mono mb-2">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" /> Current Node</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500/80" /> Visited</span>
      </div>

      <div className="flex flex-col items-center gap-6 w-full overflow-x-auto custom-scrollbar pb-6">
        {levels.map((level, li) => (
          <div key={li} className="flex flex-col items-center">
            {li > 0 && <div className="text-[8px] text-gray-700 mb-1">Level {li}</div>}
            <div className="flex items-center justify-center relative" style={{ gap: `${Math.max(8, 64 / (li + 1))}px` }}>
              {level.map((val, vi) => {
                const globalIndex = Math.pow(2, li) - 1 + vi;
                const isCurrent = globalIndex === currentNode;
                const isVisited = visited.includes(globalIndex);
                const isEmpty = val === '' || val === null;

                let bgClass = isEmpty ? 'bg-transparent border-dashed border-gray-600' : 'bg-surface-bg border-app-border-strong';
                if (isCurrent) bgClass = 'bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.4)]';
                else if (isVisited) bgClass = 'bg-blue-500/20 border-blue-500/50';

                return (
                  <div key={vi} className="flex flex-col items-center gap-1 relative z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${bgClass}`}>
                      <input
                        className="w-full h-full bg-transparent text-center text-xs outline-none font-mono text-primary-text"
                        value={val || ''}
                        onChange={(e) => updateNode(globalIndex, e.target.value)}
                        placeholder="null"
                      />
                    </div>
                    <div className="text-[8px] text-gray-600 font-mono absolute -bottom-3">{globalIndex}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
