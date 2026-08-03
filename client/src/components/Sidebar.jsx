import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Code2, Plus, Search, Folder, FolderOpen, FileText, LogOut,
  ChevronRight, ChevronLeft, ChevronDown, MoreHorizontal, Trash2, Edit3,
  Moon, Sun, FolderPlus, FilePlus, ArrowRightLeft, X, PanelLeftClose, PanelLeftOpen, LayoutGrid, Network, Settings
} from 'lucide-react';
import * as api from '../lib/api';

function MiniCalendarClock({ collapsed }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (collapsed) {
    return (
      <div className="p-3 border-t border-app-border flex flex-col items-center gap-1 shrink-0">
        <span className="text-[10px] font-mono text-primary rotate-90 my-4 whitespace-nowrap">
          {time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </span>
      </div>
    );
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const year = time.getFullYear();
  const month = time.getMonth();
  const today = time.getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  const grid = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let i = 1; i <= daysInMonth; i++) grid.push(i);

  return (
    <div className="flex flex-col gap-2 p-3 border-t border-app-border shrink-0 bg-sidebar-bg">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-primary-text">{monthNames[month]} {year}</span>
        <span className="text-xs font-mono text-primary">{time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {days.map((d, i) => <div key={`h-${i}`} className="text-[8px] text-gray-500 font-bold">{d}</div>)}
        {grid.map((d, i) => (
          <div key={`d-${i}`} className={`text-[9px] py-0.5 rounded ${d === today ? 'bg-primary text-black font-bold' : 'text-gray-400'}`}>
            {d || ''}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({
  session,
  theme,
  toggleTheme,
  subjects,
  setSubjects,
  activeSubjectId,
  setActiveSubjectId,
  notebooks,
  setNotebooks,
  activeNotebookId,
  setActiveNotebookId,
  activeNoteId,
  setActiveNoteId,
  notes,
  setNotes,
  onLogout,
  onSearchResults,
  collapsed,
  onToggleCollapse,
  onGoHome,
  viewMode,
  onViewModeChange,
  roadmaps,
  setRoadmaps,
  activeRoadmapId,
  setActiveRoadmapId
}) {
  const [expandedNotebooks, setExpandedNotebooks] = useState({});
  const [notebookNotes, setNotebookNotes] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [moveModal, setMoveModal] = useState(null);
  const editRef = useRef(null);

  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [sharedNotes, setSharedNotes] = useState([]);
  const [expandedShared, setExpandedShared] = useState(true);



  async function loadData() {
    try {
      const subData = await api.getSubjects();
      setSubjects(subData);
      const nbData = await api.getNotebooks();
      setNotebooks(nbData);
      
      try {
        const sharedData = await api.getSharedNotes();
        setSharedNotes(sharedData);
      } catch (err) {
        console.error('Failed to load shared notes:', err);
      }
      
      // Auto-expand first subject if exists
      if (subData.length > 0 && Object.keys(expandedSubjects).length === 0) {
        setExpandedSubjects(prev => ({ ...prev, [subData[0].id]: true }));
      } else if (nbData.length > 0 && Object.keys(expandedNotebooks).length === 0) {
        toggleNotebook(nbData[0].id);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  }

  useEffect(() => {
    // Avoid setState in effect warning by deferring slightly if needed
    // or ignore the warning, but using a timeout is safe
    setTimeout(() => {
      loadData();
    }, 0);
  }, []);

  async function toggleNotebook(notebookId) {
    setExpandedNotebooks(prev => {
      const next = { ...prev, [notebookId]: !prev[notebookId] };
      return next;
    });
    setActiveNotebookId(notebookId);
    // Load notes for this notebook if not already loaded
    if (!notebookNotes[notebookId]) {
      try {
        const data = await api.getNotes(notebookId);
        setNotebookNotes(prev => ({ ...prev, [notebookId]: data }));
        if (notebookId === activeNotebookId) {
          setNotes(data);
        }
      } catch (err) {
        console.error('Failed to load notes:', err);
      }
    } else {
      setNotes(notebookNotes[notebookId]);
    }
  }

  async function handleSelectNotebook(notebookId) {
    setActiveNotebookId(notebookId);
    setExpandedNotebooks(prev => ({ ...prev, [notebookId]: true }));
    try {
      const data = await api.getNotes(notebookId);
      setNotebookNotes(prev => ({ ...prev, [notebookId]: data }));
      setNotes(data);
    } catch (err) {
      console.error('Failed to load notes:', err);
    }
  }

  async function handleCreateSubject() {
    try {
      const sub = await api.createSubject('New Subject');
      setSubjects(prev => [...prev, sub]);
      setEditingId(sub.id);
      setEditingValue(sub.title);
      setExpandedSubjects(prev => ({ ...prev, [sub.id]: true }));
    } catch (err) {
      console.error('Failed to create subject:', err);
    }
  };

  const handleCreateNotebook = async (subjectId = null) => {
    try {
      const nb = await api.createNotebook('New Notebook', subjectId);
      setNotebooks(prev => [...prev, nb]);
      setEditingId(nb.id);
      setEditingValue(nb.title);
      setExpandedNotebooks(prev => ({ ...prev, [nb.id]: true }));
      setActiveNotebookId(nb.id);
      setNotebookNotes(prev => ({ ...prev, [nb.id]: [] }));
      setNotes([]);
      if (subjectId) {
        setExpandedSubjects(prev => ({ ...prev, [subjectId]: true }));
      }
    } catch (err) {
      console.error('Failed to create notebook:', err);
    }
  };

  const handleCreateNote = async (notebookId) => {
    try {
      const note = await api.createNote(notebookId);
      const updated = [...(notebookNotes[notebookId] || []), note];
      setNotebookNotes(prev => ({ ...prev, [notebookId]: updated }));
      if (notebookId === activeNotebookId) setNotes(updated);
      setActiveNoteId(note.id);
      setEditingId(note.id);
      setEditingValue(note.title);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleRenameSubmit = async () => {
    if (!editingId || !editingValue.trim()) {
      setEditingId(null);
      return;
    }
    try {
      // Check if it's a subject, notebook, or note
      const isSubject = subjects.some(s => s.id === editingId);
      const isNotebook = notebooks.some(nb => nb.id === editingId);
      const isRoadmap = roadmaps.some(r => r.id === editingId);
      if (isSubject) {
        await api.renameSubject(editingId, editingValue.trim());
        setSubjects(prev => prev.map(s => s.id === editingId ? { ...s, title: editingValue.trim() } : s));
      } else if (isNotebook) {
        await api.renameNotebook(editingId, editingValue.trim());
        setNotebooks(prev => prev.map(nb => nb.id === editingId ? { ...nb, title: editingValue.trim() } : nb));
      } else if (isRoadmap) {
        await api.renameRoadmap(editingId, editingValue.trim());
        setRoadmaps(prev => prev.map(r => r.id === editingId ? { ...r, title: editingValue.trim() } : r));
      } else {
        await api.renameNote(editingId, editingValue.trim());
        // Update in notebookNotes
        for (const [nbId, notesList] of Object.entries(notebookNotes)) {
          const idx = notesList.findIndex(n => n.id === editingId);
          if (idx !== -1) {
            const updated = [...notesList];
            updated[idx] = { ...updated[idx], title: editingValue.trim() };
            setNotebookNotes(prev => ({ ...prev, [nbId]: updated }));
            if (nbId === activeNotebookId) setNotes(updated);
            break;
          }
        }
      }
    } catch (err) {
      console.error('Rename failed:', err);
    }
    setEditingId(null);
  };

  const handleDelete = async (id, type) => {
    try {
      if (type === 'subject') {
        await api.deleteSubject(id);
        setSubjects(prev => prev.filter(s => s.id !== id));
        // Notebooks with this subject_id might cascade delete depending on SQL
        // We can just reload data
        loadData();
      } else if (type === 'roadmap') {
        await api.deleteRoadmap(id);
        setRoadmaps(prev => prev.map(r => r).filter(r => r.id !== id));
        if (activeRoadmapId === id) setActiveRoadmapId(null);
      } else if (type === 'notebook') {
        await api.deleteNotebook(id);
        setNotebooks(prev => prev.filter(nb => nb.id !== id));
        if (activeNotebookId === id) {
          setActiveNotebookId(null);
          setActiveNoteId(null);
          setNotes([]);
        }
        const newNotebookNotes = { ...notebookNotes };
        delete newNotebookNotes[id];
        setNotebookNotes(newNotebookNotes);
      } else {
        await api.deleteNote(id);
        for (const [nbId, notesList] of Object.entries(notebookNotes)) {
          const idx = notesList.findIndex(n => n.id === id);
          if (idx !== -1) {
            const updated = notesList.filter(n => n.id !== id);
            setNotebookNotes(prev => ({ ...prev, [nbId]: updated }));
            if (nbId === activeNotebookId) setNotes(updated);
            break;
          }
        }
        if (activeNoteId === id) setActiveNoteId(null);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setContextMenu(null);
  };

  const handleMoveNote = async (noteId, targetNotebookId) => {
    try {
      await api.moveNote(noteId, targetNotebookId);
      // Remove from old notebook
      for (const [nbId, notesList] of Object.entries(notebookNotes)) {
        const idx = notesList.findIndex(n => n.id === noteId);
        if (idx !== -1) {
          const movedNote = notesList[idx];
          const updated = notesList.filter(n => n.id !== noteId);
          setNotebookNotes(prev => ({ ...prev, [nbId]: updated }));
          if (nbId === activeNotebookId) setNotes(updated);
          // Add to new notebook
          const targetNotes = notebookNotes[targetNotebookId] || [];
          const newTargetNotes = [...targetNotes, { ...movedNote, notebook_id: targetNotebookId }];
          setNotebookNotes(prev => ({ ...prev, [targetNotebookId]: newTargetNotes }));
          break;
        }
      }
    } catch (err) {
      console.error('Move failed:', err);
    }
    setMoveModal(null);
  };

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setTimeout(() => {
        setSearchResults(null);
        if (onSearchResults) onSearchResults(null);
      }, 0);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await api.searchNotes(searchQuery);
        setSearchResults(results);
        onSearchResults && onSearchResults(results);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (editRef.current) editRef.current.focus();
  }, [editingId]);

  const renderNotebook = (nb) => (
    <div key={nb.id}>
      <div
        className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs cursor-pointer group transition-colors whitespace-nowrap ${
          activeNotebookId === nb.id ? 'bg-white/5 text-primary' : 'text-gray-400 hover:text-primary-text hover:bg-surface-hover'
        }`}
        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ id: nb.id, type: 'notebook', x: e.clientX, y: e.clientY }); }}
      >
        {!collapsed && (
          <button onClick={() => toggleNotebook(nb.id)} className="shrink-0 p-0.5">
            {expandedNotebooks[nb.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
        
        {expandedNotebooks[nb.id] && !collapsed ? <FolderOpen size={14} className="shrink-0" onClick={() => collapsed && handleSelectNotebook(nb.id)} /> : <Folder size={14} className="shrink-0" onClick={() => collapsed && handleSelectNotebook(nb.id)} title={nb.title} />}
        
        {!collapsed && editingId === nb.id ? (
          <input
            ref={editRef}
            className="flex-1 bg-transparent border-b border-primary/50 outline-none text-primary-text text-xs ml-1 min-w-[100px]"
            value={editingValue}
            onChange={(e) => setEditingValue(e.target.value)}
            onBlur={handleRenameSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
          />
        ) : (
          !collapsed && <span className="truncate flex-1 ml-1" onClick={() => handleSelectNotebook(nb.id)}>{nb.title}</span>
        )}
        
        {!collapsed && (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
          <button onClick={(e) => { e.stopPropagation(); handleCreateNote(nb.id); }} className="p-0.5 hover:text-primary" title="New Note">
            <FilePlus size={12} />
          </button>
          <button onClick={async (e) => { 
            e.stopPropagation(); 
            const nr = await api.createRoadmap('New Roadmap', nb.subject_id, nb.id);
            if(setRoadmaps) setRoadmaps(prev => [...prev, nr]);
            setActiveRoadmapId(nr.id);
            setActiveNotebookId(nb.id);
            onViewModeChange('roadmap');
          }} className="p-0.5 hover:text-primary" title="New Roadmap">
            <LayoutGrid size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setContextMenu({ id: nb.id, type: 'notebook', x: e.clientX, y: e.clientY }); }} className="p-0.5 hover:text-primary">
            <MoreHorizontal size={12} />
          </button>
        </div>
        )}
      </div>

      {/* Notes inside notebook */}
      {expandedNotebooks[nb.id] && !collapsed && (
        <div className="ml-5 mt-0.5 space-y-0.5">
          {(notebookNotes[nb.id] || []).map(note => (
            <div
              key={note.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer group transition-colors ${
                activeNoteId === note.id ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-500 hover:text-primary-text hover:bg-surface-hover border border-transparent'
              }`}
              onClick={() => { setActiveNotebookId(nb.id); setActiveNoteId(note.id); onViewModeChange('editor'); }}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ id: note.id, type: 'note', notebookId: nb.id, x: e.clientX, y: e.clientY }); }}
            >
              <FileText size={12} className="shrink-0" />
              {editingId === note.id ? (
                <input
                  ref={editRef}
                  className="flex-1 bg-transparent border-b border-primary/50 outline-none text-primary-text text-xs"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                />
              ) : (
                <span className="truncate flex-1">{note.title}</span>
              )}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                <button onClick={(e) => { e.stopPropagation(); setContextMenu({ id: note.id, type: 'note', notebookId: nb.id, x: e.clientX, y: e.clientY }); }} className="p-0.5 hover:text-primary">
                  <MoreHorizontal size={12} />
                </button>
              </div>
            </div>
          ))}
          {(roadmaps || []).filter(r => r.notebook_id === nb.id).map(r => (
            <div
              key={r.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer group transition-colors ${
                activeRoadmapId === r.id && viewMode === 'roadmap' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-500 hover:text-primary-text hover:bg-surface-hover border border-transparent'
              }`}
              onClick={() => { setActiveRoadmapId(r.id); setActiveNotebookId(nb.id); setActiveNoteId(null); onViewModeChange('roadmap'); }}
              onContextMenu={(e) => { e.preventDefault(); setContextMenu({ id: r.id, type: 'roadmap', x: e.clientX, y: e.clientY }); }}
            >
              <LayoutGrid size={12} className="shrink-0" />
              {editingId === r.id ? (
                <input
                  ref={editRef}
                  className="flex-1 bg-transparent border-b border-primary/50 outline-none text-primary-text text-xs"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onBlur={handleRenameSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                />
              ) : (
                <span className="truncate flex-1">{r.title}</span>
              )}
              <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                <button onClick={(e) => { e.stopPropagation(); setContextMenu({ id: r.id, type: 'roadmap', x: e.clientX, y: e.clientY }); }} className="p-0.5 hover:text-primary">
                  <MoreHorizontal size={12} />
                </button>
              </div>
            </div>
          ))}
          {(notebookNotes[nb.id] || []).length === 0 && (
            <button onClick={() => handleCreateNote(nb.id)} className="w-full text-left text-xs text-gray-600 hover:text-gray-400 px-2 py-1 transition-colors">
              + Add a note
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <aside className={`${collapsed ? 'w-14' : 'w-[280px]'} bg-sidebar-bg backdrop-blur-xl border-r border-app-border flex flex-col transition-all duration-300 shrink-0 h-full overflow-hidden`}>
      {/* Header */}
      <div className={`h-14 px-3 flex items-center border-b border-app-border shrink-0 whitespace-nowrap ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden cursor-pointer" onClick={onGoHome}>
            <div className="flex items-center gap-2 px-1 py-1">
              <div className="w-48 h-10 overflow-hidden flex items-center justify-center">
                <img src="/logo.png" alt="Logo" className="w-[220px] max-w-none mix-blend-screen" />
              </div>
            </div>
          </div>
        )}
        {!collapsed && (
          <div className="flex items-center gap-1">
            <button onClick={toggleTheme} className="p-1.5 rounded-md hover:bg-surface-hover transition-colors text-gray-500 hover:text-white" title="Toggle Theme">
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            <button onClick={onToggleCollapse} className="p-1.5 rounded-md hover:bg-surface-hover transition-colors text-gray-500 hover:text-white" title="Collapse Sidebar">
              <PanelLeftClose size={14} />
            </button>
          </div>
        )}
        {collapsed && (
          <button onClick={onToggleCollapse} className="p-1.5 rounded-md hover:bg-surface-hover transition-colors text-gray-500 hover:text-white" title="Expand Sidebar">
            <PanelLeftOpen size={16} />
          </button>
        )}
      </div>

      {/* Search */}
      {!collapsed && (
        <div className="p-3 shrink-0">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              className="w-full bg-surface-bg border border-app-border rounded-lg pl-8 pr-3 py-2 text-xs text-primary-text placeholder-gray-600 focus:outline-none focus:border-primary/30 transition-colors"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {collapsed && (
        <div className="p-2 flex justify-center shrink-0 border-b border-app-border">
          <button className="p-2 text-gray-500 hover:text-white rounded-lg hover:bg-surface-hover" title="Search (Expand to use)">
            <Search size={16} />
          </button>
        </div>
      )}

      {/* View Toggles */}
      {!collapsed && (
        <div className="px-3 pb-2 shrink-0 flex gap-2">
          
          <button
            onClick={() => onViewModeChange && onViewModeChange(viewMode === 'graph' ? 'editor' : 'graph')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${
              viewMode === 'graph'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] border border-transparent'
            }`}
          >
            <Network size={12} /> Graph
          </button>
        </div>
      )}
      {collapsed && (
        <div className="px-2 pb-2 shrink-0 flex flex-col items-center gap-2">
          
          <button
            onClick={() => onViewModeChange && onViewModeChange(viewMode === 'graph' ? 'editor' : 'graph')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'graph' ? 'text-primary bg-primary/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            title="Graph View"
          >
            <Network size={14} />
          </button>
        </div>
      )}

      {/* Search Results */}
      {searchResults && !collapsed && (
        <div className="px-3 pb-3 shrink-0">
          <div className="bg-surface-bg border border-app-border rounded-lg p-2 max-h-40 overflow-y-auto">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 px-1">Search Results ({searchResults.length})</p>
            {searchResults.length === 0 ? (
              <p className="text-xs text-gray-600 px-1">No results found</p>
            ) : (
              searchResults.map(r => (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveNotebookId(r.notebook_id);
                    setActiveNoteId(r.id);
                    handleSelectNotebook(r.notebook_id);
                    setSearchQuery('');
                    if (onViewModeChange) onViewModeChange('editor');
                  }}
                  className="w-full text-left px-2 py-1.5 text-xs rounded-md hover:bg-surface-hover text-gray-300 flex items-center gap-2 transition-colors"
                >
                  <FileText size={12} className="text-gray-500 shrink-0" />
                  <div className="truncate">
                    <span className="text-primary-text">{r.title}</span>
                    {r.notebook_title && <span className="text-gray-600 ml-1">in {r.notebook_title}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Subjects & Notebooks */}
      <div className="flex-1 overflow-y-auto py-2 min-h-0 overflow-x-hidden">
        {activeSubjectId ? (
          <>
            <div className={`px-4 mb-2 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
              {!collapsed && (
                <div className="flex items-center gap-2 overflow-hidden">
                  <button onClick={() => setActiveSubjectId(null)} className="text-gray-500 hover:text-white shrink-0" title="Back to All Subjects">
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-[10px] font-bold text-primary tracking-wider uppercase truncate">
                    {subjects.find(s => s.id === activeSubjectId)?.title || 'Subject'}
                  </span>
                </div>
              )}
              {!collapsed && (
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleCreateNotebook(activeSubjectId)} className="text-gray-500 hover:text-primary transition-colors" title="New Notebook in Subject">
                    <FolderPlus size={14} />
                  </button>
                  <button onClick={async (e) => { 
                    e.stopPropagation(); 
                    const nr = await api.createRoadmap('New Roadmap', activeSubjectId, null);
                    if(setRoadmaps) setRoadmaps(prev => [...prev, nr]);
                    setActiveRoadmapId(nr.id);
                    onViewModeChange('roadmap');
                  }} className="text-gray-500 hover:text-primary transition-colors" title="New Roadmap in Subject">
                    <LayoutGrid size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="px-2 space-y-1">
              {notebooks.filter(nb => nb.subject_id === activeSubjectId).map(nb => renderNotebook(nb))}
              {(roadmaps || []).filter(r => r.subject_id === activeSubjectId && !r.notebook_id).map(r => (
                <div
                  key={r.id}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs cursor-pointer group transition-colors ${
                    activeRoadmapId === r.id && viewMode === 'roadmap' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-400 hover:text-primary-text hover:bg-surface-hover border border-transparent'
                  }`}
                  onClick={() => { setActiveRoadmapId(r.id); setActiveNoteId(null); onViewModeChange('roadmap'); }}
                  onContextMenu={(e) => { e.preventDefault(); setContextMenu({ id: r.id, type: 'roadmap', x: e.clientX, y: e.clientY }); }}
                >
                  <LayoutGrid size={14} className="shrink-0" />
                  {editingId === r.id ? (
                    <input
                      ref={editRef}
                      className="flex-1 bg-transparent border-b border-primary/50 outline-none text-primary-text text-xs"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={handleRenameSubmit}
                      onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
                    />
                  ) : (
                    <span className="truncate flex-1">{r.title}</span>
                  )}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
                    <button onClick={(e) => { e.stopPropagation(); setContextMenu({ id: r.id, type: 'roadmap', x: e.clientX, y: e.clientY }); }} className="p-0.5 hover:text-primary">
                      <MoreHorizontal size={12} />
                    </button>
                  </div>
                </div>
              ))}
              {notebooks.filter(nb => nb.subject_id === activeSubjectId).length === 0 && !collapsed && (
                <button onClick={() => handleCreateNotebook(activeSubjectId)} className="w-full text-left text-xs text-gray-600 hover:text-gray-400 px-4 py-1 transition-colors">
                  + Add a notebook
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className={`px-4 mb-2 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
              {!collapsed && <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Uncategorized</span>}
              {!collapsed && (
                <div className="flex items-center gap-2">
                  <button onClick={() => handleCreateNotebook()} className="text-gray-500 hover:text-primary transition-colors" title="New Notebook">
                    <FolderPlus size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="px-2 space-y-1">
              {notebooks.filter(nb => !nb.subject_id).map(nb => renderNotebook(nb))}
              {!collapsed && notebooks.filter(nb => !nb.subject_id).length === 0 && (
                 <div className="text-center text-[10px] text-gray-600 mt-4 px-2">
                   Select a subject from the Home page.
                 </div>
              )}
            </div>
          </>
        )}

        {/* Shared Notes Section */}
        {sharedNotes.length > 0 && (
          <div className="mt-4">
            <div 
              className={`px-4 py-1.5 flex items-center justify-between cursor-pointer group hover:bg-surface-hover ${collapsed ? 'justify-center' : ''}`}
              onClick={() => setExpandedShared(!expandedShared)}
            >
              {!collapsed && (
                <div className="flex items-center gap-2 text-gray-500 group-hover:text-gray-300 transition-colors">
                  {expandedShared ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="text-[10px] font-bold tracking-wider uppercase">Shared With Me</span>
                </div>
              )}
              {collapsed && <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">S</span>}
            </div>
            
            {expandedShared && (
              <div className="px-2 space-y-1">
                {sharedNotes.map(note => (
                  <div
                    key={note.id}
                    className={`flex items-center gap-2 pl-6 pr-4 py-1.5 rounded-md text-xs cursor-pointer group transition-colors ${
                      activeNoteId === note.id ? 'bg-primary/20 text-primary border border-primary/30' : 'text-gray-400 hover:text-white hover:bg-surface-hover border border-transparent'
                    }`}
                    onClick={() => { setActiveNoteId(note.id); onViewModeChange('editor'); }}
                  >
                    <FileText size={12} className="shrink-0" />
                    <span className="truncate flex-1">{note.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/30 text-gray-500 capitalize">{note.collaborator_role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <MiniCalendarClock collapsed={collapsed} />

      <div className="p-3 border-t border-app-border shrink-0 flex items-center justify-between">
        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-medium truncate text-primary-text">{session?.user?.email}</span>
          </div>
        )}
        <div className={`flex items-center gap-1 ${collapsed ? 'w-full flex-col' : ''}`}>
          <button onClick={() => onViewModeChange('settings')} className="p-2 text-gray-500 hover:text-white rounded-md hover:bg-white/[0.05] transition-colors" title="Settings">
            <Settings size={16} />
          </button>
          <button onClick={onLogout} className="p-2 text-gray-500 hover:text-red-400 rounded-md hover:bg-white/[0.05] transition-colors" title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 bg-surface-hover border border-app-border-strong rounded-lg shadow-2xl py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-surface-hover flex items-center gap-2 transition-colors"
              onClick={() => { setEditingId(contextMenu.id); setEditingValue(''); setContextMenu(null); }}
            >
              <Edit3 size={12} /> Rename
            </button>
            {contextMenu.type === 'note' && (
              <button
                className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-surface-hover flex items-center gap-2 transition-colors"
                onClick={() => { setMoveModal({ noteId: contextMenu.id, fromNotebookId: contextMenu.notebookId }); setContextMenu(null); }}
              >
                <ArrowRightLeft size={12} /> Move to...
              </button>
            )}
            <div className="border-t border-app-border my-1" />
            <button
              className="w-full px-3 py-2 text-xs text-left text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
              onClick={() => handleDelete(contextMenu.id, contextMenu.type)}
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </>
      )}

      {/* Move Note Modal */}
      {moveModal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={() => setMoveModal(null)}>
            <div className="bg-surface-hover border border-app-border-strong rounded-2xl p-6 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-primary-text mb-4">Move note to...</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {notebooks.filter(nb => nb.id !== moveModal.fromNotebookId).map(nb => (
                  <button
                    key={nb.id}
                    onClick={() => handleMoveNote(moveModal.noteId, nb.id)}
                    className="w-full px-3 py-2 text-xs text-left text-gray-300 hover:bg-surface-hover rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Folder size={14} /> {nb.title}
                  </button>
                ))}
              </div>
              <button onClick={() => setMoveModal(null)} className="mt-4 text-xs text-gray-500 hover:text-gray-300 transition-colors">Cancel</button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
