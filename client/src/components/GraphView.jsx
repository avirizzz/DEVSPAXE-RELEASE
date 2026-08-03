import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Network, Loader2, RefreshCw, Link2, Unlink, ZoomIn, ZoomOut, ChevronLeft } from 'lucide-react';
import * as api from '../lib/api';

/* ═══════════════════════════════════════════════
   Vector Math Utilities
   ═══════════════════════════════════════════════ */
const V = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (v, s) => ({ x: v.x * s, y: v.y * s }),
  mag: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
  norm: (v) => { const m = V.mag(v); return m < 0.001 ? { x: 0, y: 0 } : V.mul(v, 1 / m); },
  dist: (a, b) => V.mag(V.sub(a, b)),
  lerp: (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }),
};

const distToSegment = (p, a, b) => {
  const ab = V.sub(b, a);
  const l2 = ab.x * ab.x + ab.y * ab.y;
  if (l2 === 0) return V.dist(p, a);
  let t = ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2;
  t = Math.max(0, Math.min(1, t));
  return V.dist(p, { x: a.x + t * ab.x, y: a.y + t * ab.y });
};

/* ═══════════════════════════════════════════════
   Color Palette for Notebook Clusters
   ═══════════════════════════════════════════════ */
const CLUSTER_COLORS = [
  { node: '#DEDBC8', glow: 'rgba(222,219,200,0.15)', bg: 'rgba(222,219,200,0.03)', label: 'rgba(222,219,200,0.06)' },
  { node: '#7dd3fc', glow: 'rgba(125,211,252,0.15)', bg: 'rgba(125,211,252,0.03)', label: 'rgba(125,211,252,0.06)' },
  { node: '#c4b5fd', glow: 'rgba(196,181,253,0.15)', bg: 'rgba(196,181,253,0.03)', label: 'rgba(196,181,253,0.06)' },
  { node: '#86efac', glow: 'rgba(134,239,172,0.15)', bg: 'rgba(134,239,172,0.03)', label: 'rgba(134,239,172,0.06)' },
  { node: '#fca5a5', glow: 'rgba(252,165,165,0.15)', bg: 'rgba(252,165,165,0.03)', label: 'rgba(252,165,165,0.06)' },
  { node: '#fcd34d', glow: 'rgba(252,211,77,0.15)', bg: 'rgba(252,211,77,0.03)', label: 'rgba(252,211,77,0.06)' },
  { node: '#f9a8d4', glow: 'rgba(249,168,212,0.15)', bg: 'rgba(249,168,212,0.03)', label: 'rgba(249,168,212,0.06)' },
  { node: '#67e8f9', glow: 'rgba(103,232,249,0.15)', bg: 'rgba(103,232,249,0.03)', label: 'rgba(103,232,249,0.06)' },
];

/* ═══════════════════════════════════════════════
   Main GraphView Component
   ═══════════════════════════════════════════════ */
export default function GraphView({ allNotes, onSelectNote, onClose }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stats, setStats] = useState({ nodes: 0, links: 0, notebooks: 0 });
  const [tooltip, setTooltip] = useState(null); // { x, y, title, notebook, links }

  const graphRef = useRef({ nodes: [], links: [], notebooks: {} });
  const animFrameRef = useRef(null);
  const dprRef = useRef(window.devicePixelRatio || 1);

  // Camera
  const cameraRef = useRef({
    x: 0, y: 0, zoom: 1,
    targetX: 0, targetY: 0, targetZoom: 1,
    savedZoom: 1, savedX: 0, savedY: 0,
  });

  // Input state
  const mouseRef = useRef({
    clientX: 0, clientY: 0, worldX: 0, worldY: 0,
    isDown: false,
    draggedNode: null, hoveredNode: null, hoveredLink: null,
    linkingFromNode: null,
    isPanning: false, lastPanX: 0, lastPanY: 0,
  });

  // Time for animations
  const timeRef = useRef(0);

  /* ═══════ COORDINATE TRANSFORMS ═══════ */
  const screenToWorld = useCallback((sx, sy) => {
    const c = cameraRef.current;
    return { x: (sx - c.x) / c.zoom, y: (sy - c.y) / c.zoom };
  }, []);

  /* ═══════ DATA LOADING ═══════ */
  const loadGraphData = useCallback(async () => {
    try {
      const [blocks, rawNotebooks] = await Promise.all([
        api.getAllBlocksForUser(),
        api.getNotebooks(),
      ]);

      const notebookMap = {};
      const count = Math.max(rawNotebooks.length, 1);
      const layoutRadius = Math.max(400, count * 200);

      rawNotebooks.forEach((nb, i) => {
        const theta = (i / count) * 2 * Math.PI - Math.PI / 2;
        notebookMap[nb.id] = {
          id: nb.id,
          title: nb.title || 'Untitled',
          x: Math.cos(theta) * layoutRadius,
          y: Math.sin(theta) * layoutRadius,
          colorIdx: i % CLUSTER_COLORS.length,
        };
      });

      const oldNodes = {};
      graphRef.current.nodes.forEach(n => { oldNodes[n.id] = n; });

      const nodesDict = {};
      allNotes.forEach(n => {
        if (n.notebook_id && !notebookMap[n.notebook_id]) {
          notebookMap[n.notebook_id] = { id: n.notebook_id, title: 'Unknown', x: 0, y: 0, colorIdx: 0 };
        }
        const nbCenter = notebookMap[n.notebook_id] || { x: 0, y: 0 };
        const old = oldNodes[n.id];

        nodesDict[n.id] = {
          id: n.id,
          title: n.title || 'Untitled Note',
          notebook_id: n.notebook_id,
          x: old?.x ?? nbCenter.x + (Math.random() - 0.5) * 180,
          y: old?.y ?? nbCenter.y + (Math.random() - 0.5) * 180,
          vx: old?.vx ?? 0,
          vy: old?.vy ?? 0,
          mass: 1,
          linkCount: 0,
          pinned: old?.pinned ?? false,
        };
      });

      const links = [];
      const linkSet = new Set();
      blocks.forEach(block => {
        if (block.type === 'text' && block.content?.html) {
          const regex = /data-note-id="([^"]+)"/g;
          let match;
          while ((match = regex.exec(block.content.html)) !== null) {
            const targetId = match[1];
            if (nodesDict[targetId] && targetId !== block.note_id) {
              const key = [block.note_id, targetId].sort().join(':');
              if (!linkSet.has(key)) {
                linkSet.add(key);
                links.push({ source: block.note_id, target: targetId, blockId: block.id });
                nodesDict[block.note_id].linkCount++;
                nodesDict[targetId].linkCount++;
              }
            }
          }
        }
      });

      Object.values(nodesDict).forEach(n => {
        n.mass = 1 + n.linkCount * 0.4;
        n.radius = Math.max(5, 4 + Math.min(n.linkCount * 2.5, 18));
      });

      graphRef.current = {
        nodes: Object.values(nodesDict),
        links: links.map(l => ({
          source: nodesDict[l.source],
          target: nodesDict[l.target],
          blockId: l.blockId,
        })),
        notebooks: notebookMap,
      };

      setStats({
        nodes: Object.keys(nodesDict).length,
        links: links.length,
        notebooks: rawNotebooks.length,
      });
      setLoading(false);
    } catch (err) {
      console.error('Graph data load failed:', err);
      setLoading(false);
    }
  }, [allNotes]);

  useEffect(() => {
    if (allNotes.length > 0) {
      setLoading(true);
      loadGraphData();
    } else {
      setLoading(false);
    }
  }, [allNotes, loadGraphData]);

  /* ═══════ WHEEL (TRACKPAD + MOUSE) ═══════ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleWheel = (e) => {
      e.preventDefault();
      const cam = cameraRef.current;
      if (e.ctrlKey || e.metaKey) {
        const factor = 1 - e.deltaY * 0.008;
        const newZoom = Math.max(0.08, Math.min(6, cam.targetZoom * factor));
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        cam.targetX = mx - (mx - cam.targetX) * (newZoom / cam.targetZoom);
        cam.targetY = my - (my - cam.targetY) * (newZoom / cam.targetZoom);
        cam.targetZoom = newZoom;
        cam.x = cam.targetX;
        cam.y = cam.targetY;
        cam.zoom = cam.targetZoom;
      } else {
        cam.targetX -= e.deltaX;
        cam.targetY -= e.deltaY;
        cam.x = cam.targetX;
        cam.y = cam.targetY;
      }
    };
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  /* ═══════ RESIZE (HiDPI) ═══════ */
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      const w = container.clientWidth;
      const h = container.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      if (!mouseRef.current.isPanning) {
        cameraRef.current.targetX = w / 2;
        cameraRef.current.targetY = h / 2;
        cameraRef.current.x = w / 2;
        cameraRef.current.y = h / 2;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [loading]);

  /* ═══════ PHYSICS + RENDER LOOP ═══════ */
  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    /* Physics constants */
    const REPULSE = 2000;
    const SPRING = 0.004;
    const SPRING_LEN = 140;
    const CLUSTER_PULL = 0.07;
    const DAMPING = 0.82;

    const step = (timestamp) => {
      timeRef.current = timestamp;
      const dpr = dprRef.current;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      const cam = cameraRef.current;
      const mouse = mouseRef.current;
      const { nodes, links, notebooks } = graphRef.current;
      const nbList = Object.values(notebooks);

      /* Smooth camera */
      cam.x += (cam.targetX - cam.x) * 0.12;
      cam.y += (cam.targetY - cam.y) * 0.12;
      cam.zoom += (cam.targetZoom - cam.zoom) * 0.12;

      /* Auto-pan while linking near edges */
      if (mouse.linkingFromNode) {
        const edge = 60, speed = 12;
        if (mouse.clientX < edge) cam.targetX += speed;
        if (mouse.clientX > w - edge) cam.targetX -= speed;
        if (mouse.clientY < edge) cam.targetY += speed;
        if (mouse.clientY > h - edge) cam.targetY -= speed;
      }

      /* Keep world mouse pos in sync */
      const wPos = screenToWorld(mouse.clientX, mouse.clientY);
      mouse.worldX = wPos.x;
      mouse.worldY = wPos.y;

      /* ── PHYSICS ── */
      nodes.forEach(n => { n.fx = 0; n.fy = 0; });

      // Repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const diff = V.sub(nodes[i], nodes[j]);
          const d = Math.max(V.mag(diff), 1);
          if (d < 350) {
            const f = REPULSE / (d * d);
            const force = V.mul(V.norm(diff), f);
            nodes[i].fx += force.x; nodes[i].fy += force.y;
            nodes[j].fx -= force.x; nodes[j].fy -= force.y;
          }
        }
      }

      // Springs (links)
      links.forEach(l => {
        const diff = V.sub(l.target, l.source);
        const d = Math.max(V.mag(diff), 1);
        const f = SPRING * (d - SPRING_LEN);
        const force = V.mul(V.norm(diff), f);
        l.source.fx += force.x; l.source.fy += force.y;
        l.target.fx -= force.x; l.target.fy -= force.y;
      });

      // Cluster attraction
      nodes.forEach(n => {
        const nb = notebooks[n.notebook_id];
        if (nb) {
          const diff = V.sub(nb, n);
          n.fx += diff.x * CLUSTER_PULL;
          n.fy += diff.y * CLUSTER_PULL;
        }
        if (mouse.draggedNode === n) {
          n.x = mouse.worldX;
          n.y = mouse.worldY;
          n.vx = 0; n.vy = 0;
          n.pinned = true;
        } else if (!n.pinned) {
          n.vx = (n.vx + n.fx / n.mass) * DAMPING;
          n.vy = (n.vy + n.fy / n.mass) * DAMPING;
          n.x += n.vx;
          n.y += n.vy;
        }
      });

      /* ── RENDER ── */
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      const iz = 1 / cam.zoom; // inverse zoom for constant-screen-size elements

      /* Notebook cluster backgrounds */
      nbList.forEach(nb => {
        const colors = CLUSTER_COLORS[nb.colorIdx || 0];
        const clusterNodes = nodes.filter(n => n.notebook_id === nb.id);
        if (clusterNodes.length === 0) return;

        // Compute bounding circle
        let cx = 0, cy = 0;
        clusterNodes.forEach(n => { cx += n.x; cy += n.y; });
        cx /= clusterNodes.length; cy /= clusterNodes.length;
        let maxR = 0;
        clusterNodes.forEach(n => {
          const d = V.dist(n, { x: cx, y: cy });
          if (d > maxR) maxR = d;
        });
        const padding = 60;
        const r = Math.max(maxR + padding, 100);

        // Soft radial glow behind cluster
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, colors.bg);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Cluster label
        ctx.font = `bold ${Math.max(24, 60 * Math.min(1, r / 200))}px 'Almarai', sans-serif`;
        ctx.fillStyle = colors.label;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nb.title, nb.x, nb.y);
      });

      /* Hovered state computation */
      const hovered = mouse.hoveredNode;
      const hoveredLink = mouse.hoveredLink;
      const linkingFrom = mouse.linkingFromNode;
      const connectedSet = new Set();
      if (hovered && !linkingFrom) {
        connectedSet.add(hovered.id);
        links.forEach(l => {
          if (l.source.id === hovered.id) connectedSet.add(l.target.id);
          if (l.target.id === hovered.id) connectedSet.add(l.source.id);
        });
      }

      /* Linking dashed line */
      if (linkingFrom) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(linkingFrom.x, linkingFrom.y);
        ctx.lineTo(mouse.worldX, mouse.worldY);
        ctx.strokeStyle = 'rgba(222, 219, 200, 0.7)';
        ctx.setLineDash([6 * iz, 4 * iz]);
        ctx.lineWidth = 2 * iz;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      /* Draw links */
      links.forEach(l => {
        const isHL = hoveredLink === l;
        const isConnHL = hovered && !linkingFrom && (l.source.id === hovered.id || l.target.id === hovered.id);
        const isFaded = hovered && !linkingFrom && !isConnHL && !isHL;

        // Curved bezier for cross-notebook links, straight for same-notebook
        const crossNotebook = l.source.notebook_id !== l.target.notebook_id;

        ctx.beginPath();
        if (crossNotebook) {
          const mid = V.lerp(l.source, l.target, 0.5);
          const perp = V.norm({ x: -(l.target.y - l.source.y), y: l.target.x - l.source.x });
          const offset = V.dist(l.source, l.target) * 0.15;
          const cp = V.add(mid, V.mul(perp, offset));
          ctx.moveTo(l.source.x, l.source.y);
          ctx.quadraticCurveTo(cp.x, cp.y, l.target.x, l.target.y);
        } else {
          ctx.moveTo(l.source.x, l.source.y);
          ctx.lineTo(l.target.x, l.target.y);
        }

        if (isHL) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3 * iz;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 8 * iz;
        } else if (isConnHL) {
          const nb = notebooks[l.source.notebook_id];
          const c = CLUSTER_COLORS[nb?.colorIdx || 0];
          ctx.strokeStyle = c.node;
          ctx.lineWidth = 2 * iz;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        } else if (isFaded) {
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.lineWidth = 1 * iz;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        } else {
          ctx.strokeStyle = crossNotebook ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)';
          ctx.lineWidth = 1 * iz;
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
        }
        ctx.stroke();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        // Delete button on hovered link
        if (isHL) {
          const mx = (l.source.x + l.target.x) / 2;
          const my = (l.source.y + l.target.y) / 2;
          const btnR = 10 * iz;
          ctx.beginPath();
          ctx.arc(mx, my, btnR, 0, Math.PI * 2);
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 1 * iz;
          ctx.stroke();
          // × icon
          const s = 4 * iz;
          ctx.beginPath();
          ctx.moveTo(mx - s, my - s); ctx.lineTo(mx + s, my + s);
          ctx.moveTo(mx + s, my - s); ctx.lineTo(mx - s, my + s);
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5 * iz;
          ctx.stroke();
        }
      });

      /* Draw nodes */
      nodes.forEach(n => {
        const isHov = hovered === n;
        const isConn = connectedSet.has(n.id) && !linkingFrom;
        const isLinkTarget = linkingFrom && hovered === n && n !== linkingFrom;
        const isFaded = hovered && !isConn && !isHov && !linkingFrom;
        const nb = notebooks[n.notebook_id];
        const colors = CLUSTER_COLORS[nb?.colorIdx || 0];

        const r = n.radius + (isLinkTarget ? 3 : isHov ? 1 : 0);

        // Glow ring
        if (isHov || isLinkTarget) {
          const glowGrad = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r + 12 * iz);
          glowGrad.addColorStop(0, isLinkTarget ? 'rgba(34,197,94,0.3)' : colors.glow);
          glowGrad.addColorStop(1, 'transparent');
          ctx.fillStyle = glowGrad;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 12 * iz, 0, Math.PI * 2);
          ctx.fill();
        }

        // Node body
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        if (isLinkTarget) {
          ctx.fillStyle = '#22c55e';
        } else if (isFaded) {
          ctx.fillStyle = 'rgba(60,60,60,0.25)';
        } else if (isHov) {
          ctx.fillStyle = '#fff';
        } else {
          ctx.fillStyle = colors.node;
        }
        ctx.fill();

        // Border
        if (n.pinned && !isHov && !isLinkTarget) {
          ctx.strokeStyle = 'rgba(59,130,246,0.5)';
          ctx.lineWidth = 1.5 * iz;
          ctx.stroke();
        } else if (isLinkTarget) {
          ctx.strokeStyle = '#16a34a';
          ctx.lineWidth = 2 * iz;
          ctx.stroke();
        }

        // Label
        if (!isFaded || isLinkTarget) {
          const fontSize = isHov || isLinkTarget ? 12 : 10;
          ctx.font = `${isHov ? 'bold ' : ''}${fontSize}px 'Almarai', sans-serif`;
          ctx.fillStyle = isHov || isLinkTarget ? '#fff' : `rgba(${isFaded ? '80,80,80' : '200,200,190'},${isFaded ? '0.3' : '0.65'})`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(n.title, n.x, n.y + r + 5);
        }
      });

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [loading, screenToWorld]);

  /* ═══════ POINTER EVENTS ═══════ */
  const handlePointerMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const mouse = mouseRef.current;
    mouse.clientX = cx;
    mouse.clientY = cy;
    const wPos = screenToWorld(cx, cy);
    mouse.worldX = wPos.x;
    mouse.worldY = wPos.y;

    const { nodes, links } = graphRef.current;

    // Panning
    if (mouse.isPanning) {
      cameraRef.current.targetX += cx - mouse.lastPanX;
      cameraRef.current.targetY += cy - mouse.lastPanY;
      cameraRef.current.x = cameraRef.current.targetX;
      cameraRef.current.y = cameraRef.current.targetY;
      mouse.lastPanX = cx;
      mouse.lastPanY = cy;
      return;
    }

    if (!mouse.isDown) {
      // Hit-test nodes
      let hNode = null;
      const hitPad = 6 / cameraRef.current.zoom;
      for (const n of nodes) {
        if (V.dist(n, wPos) < n.radius + hitPad) { hNode = n; break; }
      }
      mouse.hoveredNode = hNode;

      // Hit-test links
      let hLink = null;
      if (!hNode && !e.shiftKey) {
        const linkPad = 8 / cameraRef.current.zoom;
        for (const l of links) {
          if (distToSegment(wPos, l.source, l.target) < linkPad) { hLink = l; break; }
        }
      }
      mouse.hoveredLink = hLink;

      // Cursor
      canvas.style.cursor = hNode ? (e.shiftKey ? 'crosshair' : 'pointer') : hLink ? 'pointer' : e.shiftKey ? 'crosshair' : 'grab';

      // Tooltip
      if (hNode) {
        const nb = graphRef.current.notebooks[hNode.notebook_id];
        setTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          title: hNode.title,
          notebook: nb?.title || '',
          links: hNode.linkCount,
          pinned: hNode.pinned,
        });
      } else {
        setTooltip(null);
      }
    } else if (mouse.linkingFromNode) {
      let hNode = null;
      const hitPad = 12 / cameraRef.current.zoom;
      for (const n of nodes) {
        if (V.dist(n, wPos) < n.radius + hitPad) { hNode = n; break; }
      }
      mouse.hoveredNode = hNode;
    }
  }, [screenToWorld]);

  const handlePointerDown = useCallback((e) => {
    const mouse = mouseRef.current;
    mouse.isDown = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    if (mouse.hoveredNode) {
      if (e.shiftKey) {
        mouse.linkingFromNode = mouse.hoveredNode;
        const cam = cameraRef.current;
        cam.savedZoom = cam.targetZoom;
        cam.savedX = cam.targetX;
        cam.savedY = cam.targetY;
        cam.targetZoom = Math.min(cam.targetZoom, 0.35);
        cam.targetX = containerRef.current.clientWidth / 2;
        cam.targetY = containerRef.current.clientHeight / 2;
      } else {
        mouse.draggedNode = mouse.hoveredNode;
        canvasRef.current.style.cursor = 'grabbing';
      }
    } else if (!mouse.hoveredLink) {
      mouse.isPanning = true;
      mouse.lastPanX = cx;
      mouse.lastPanY = cy;
      canvasRef.current.style.cursor = 'grabbing';
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    const mouse = mouseRef.current;
    mouse.isDown = false;
    mouse.isPanning = false;

    if (mouse.linkingFromNode) {
      const src = mouse.linkingFromNode;
      const tgt = mouse.hoveredNode;
      if (tgt && src !== tgt) handleCreateLink(src, tgt);
      mouse.linkingFromNode = null;
      const cam = cameraRef.current;
      cam.targetZoom = cam.savedZoom;
      cam.targetX = cam.savedX;
      cam.targetY = cam.savedY;
    }

    mouse.draggedNode = null;
    if (canvasRef.current) {
      canvasRef.current.style.cursor = mouse.hoveredNode ? 'pointer' : 'grab';
    }
  }, []);

  const handleClick = useCallback(() => {
    const mouse = mouseRef.current;
    if (mouse.hoveredLink && !mouse.linkingFromNode) {
      handleDeleteLink(mouse.hoveredLink);
    }
  }, []);

  const handleDoubleClick = useCallback(() => {
    const hov = mouseRef.current.hoveredNode;
    if (hov && onSelectNote) onSelectNote(hov.id, hov.notebook_id);
  }, [onSelectNote]);

  /* ═══════ LINK CRUD ═══════ */
  const handleCreateLink = async (source, target) => {
    if (source.id === target.id) return;
    const exists = graphRef.current.links.some(l =>
      (l.source.id === source.id && l.target.id === target.id) ||
      (l.source.id === target.id && l.target.id === source.id)
    );
    if (exists) return;

    setSyncing(true);
    try {
      const blocks = await api.getBlocks(source.id);
      const linkHtml = `<span class="internal-link" data-note-id="${target.id}" data-notebook-id="${target.notebook_id}" contenteditable="false">📎 ${target.title}</span>`;
      const textBlock = blocks.find(b => b.type === 'text');
      if (textBlock) {
        const html = (textBlock.content.html || textBlock.content.text || '') + ' ' + linkHtml;
        await api.updateBlock(textBlock.id, { content: { ...textBlock.content, html } });
      } else {
        await api.createBlock(source.id, 'text', blocks.length, { html: linkHtml, format: 'paragraph' });
      }
      await loadGraphData();
    } catch (err) { console.error('Create link failed:', err); }
    setSyncing(false);
  };

  const handleDeleteLink = async (link) => {
    setSyncing(true);
    try {
      const sourceId = link.source.id;
      const targetId = link.target.id;
      const blocks = await api.getBlocks(sourceId);
      for (const b of blocks) {
        if (b.type === 'text' && b.content?.html) {
          const re = new RegExp(`<span[^>]*class="internal-link"[^>]*data-note-id="${targetId}"[^>]*>.*?</span>`, 'g');
          if (re.test(b.content.html)) {
            await api.updateBlock(b.id, { content: { ...b.content, html: b.content.html.replace(re, '') } });
          }
        }
      }
      await loadGraphData();
    } catch (err) { console.error('Delete link failed:', err); }
    setSyncing(false);
  };

  /* ═══════ TOOLBAR ACTIONS ═══════ */
  const resetLayout = () => {
    graphRef.current.nodes.forEach(n => { n.pinned = false; });
    const c = containerRef.current;
    if (c) {
      cameraRef.current.targetX = c.clientWidth / 2;
      cameraRef.current.targetY = c.clientHeight / 2;
      cameraRef.current.targetZoom = 1;
    }
  };

  const zoomIn = () => {
    cameraRef.current.targetZoom = Math.min(6, cameraRef.current.targetZoom * 1.4);
  };
  const zoomOut = () => {
    cameraRef.current.targetZoom = Math.max(0.08, cameraRef.current.targetZoom / 1.4);
  };

  /* ═══════ RENDER ═══════ */
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#060608] relative select-none">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 pointer-events-none z-0"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(30,30,50,0.4) 0%, transparent 70%)' }} />

      {/* Header */}
      <header className="h-12 px-5 border-b border-white/[0.04] flex items-center justify-between shrink-0 bg-black/40 backdrop-blur-xl relative z-20">
        <div className="flex items-center gap-3">
          {onClose && (
            <>
              <button onClick={onClose} className="text-gray-400 hover:text-white flex items-center gap-1.5 text-xs font-medium bg-white/[0.04] hover:bg-white/10 px-2.5 py-1.5 rounded-lg transition-colors">
                <ChevronLeft size={14} /> Back
              </button>
              <div className="w-px h-4 bg-white/10 mx-1" />
            </>
          )}
          <div className="w-6 h-6 rounded-md bg-white/[0.04] flex items-center justify-center">
            <Network size={13} className="text-[#DEDBC8]" />
          </div>
          <h2 className="text-[13px] font-medium text-[#DEDBC8] tracking-tight">Second Brain</h2>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-[10px] text-gray-500 bg-white/[0.03] px-2 py-0.5 rounded-full font-mono">
              {stats.nodes} nodes
            </span>
            <span className="text-[10px] text-gray-500 bg-white/[0.03] px-2 py-0.5 rounded-full font-mono">
              {stats.links} links
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Keyboard hints */}
          <div className="hidden md:flex items-center gap-3 text-[10px] text-gray-600 mr-3">
            <span className="flex items-center gap-1">
              <kbd className="bg-white/[0.06] border border-white/[0.06] px-1.5 py-0.5 rounded text-gray-400 text-[9px]">⇧</kbd>
              <span>+ drag to link</span>
            </span>
            <span className="opacity-30">|</span>
            <span>click edge to delete</span>
            <span className="opacity-30">|</span>
            <span>dbl-click to open</span>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center bg-white/[0.03] rounded-lg border border-white/[0.04]">
            <button onClick={zoomOut}
              className="p-1.5 text-gray-500 hover:text-white transition-colors">
              <ZoomOut size={13} />
            </button>
            <div className="w-px h-4 bg-white/[0.06]" />
            <button onClick={zoomIn}
              className="p-1.5 text-gray-500 hover:text-white transition-colors">
              <ZoomIn size={13} />
            </button>
          </div>

          <button onClick={resetLayout}
            className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] px-2.5 py-1.5 rounded-lg transition-all border border-white/[0.04] hover:border-white/[0.08]">
            <RefreshCw size={11} /> Reset
          </button>
        </div>
      </header>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        {/* Loading / Syncing pill */}
        {(loading || syncing) && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-4 py-1.5 bg-black/60 border border-white/[0.06] rounded-full text-[11px] text-[#DEDBC8] backdrop-blur-md shadow-2xl">
            <Loader2 size={11} className="animate-spin" />
            {syncing ? 'Syncing changes…' : 'Mapping connections…'}
          </div>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute z-30 pointer-events-none"
            style={{ left: tooltip.x + 14, top: tooltip.y - 10 }}
          >
            <div className="bg-[#111113] border border-white/[0.08] rounded-lg px-3 py-2 shadow-2xl min-w-[140px]">
              <p className="text-[12px] font-medium text-white truncate max-w-[200px]">{tooltip.title}</p>
              {tooltip.notebook && (
                <p className="text-[10px] text-gray-500 mt-0.5">{tooltip.notebook}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-white/[0.04]">
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Link2 size={9} /> {tooltip.links} link{tooltip.links !== 1 ? 's' : ''}
                </span>
                {tooltip.pinned && (
                  <span className="text-[10px] text-blue-400">📌 Pinned</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && stats.nodes === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
              <Network size={28} className="text-gray-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-300 mb-1">No notes yet</h3>
            <p className="text-xs text-gray-600 max-w-[240px]">
              Create some notes and link them with <kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px]">[[</kbd> to see your knowledge graph come alive.
            </p>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-10 block focus:outline-none"
          tabIndex={0}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        />
      </div>
    </div>
  );
}
