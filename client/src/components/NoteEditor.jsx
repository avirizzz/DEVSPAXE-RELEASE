import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Type, Code2, GitMerge, Trash2, GripVertical,
  ChevronUp, ChevronDown, Loader2, FileText, Share2, Check, Globe, LayoutGrid, Network, Terminal, UserPlus, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import * as api from '../lib/api';
import TextBlock from './TextBlock';
import CodeBlock from './CodeBlock';
import DiagramBlock from './DiagramBlock';
import PseudocodeBlock from './PseudocodeBlock';
import ImageBlock from './ImageBlock';
import { Image as ImageIcon } from 'lucide-react';

export default function NoteEditor({ noteId, noteTitle, notebookTitle, isPublic, onTitleChange, onPrivacyChange, allNotes = [], onNavigateToNote, viewMode, onViewModeChange }) {
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // saved | saving | error
  const [title, setTitle] = useState(noteTitle || 'Untitled Note');
  const [showBlockMenu, setShowBlockMenu] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Collaborator states
  const [collaborators, setCollaborators] = useState([]);
  const [collabEmail, setCollabEmail] = useState('');
  const [collabRole, setCollabRole] = useState('editor');
  const [collabError, setCollabError] = useState('');
  
  const saveTimerRef = useRef(null);
  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;

  // Load blocks when note changes
  useEffect(() => {
    if (!noteId) return;
    setLoading(true);
    setTitle(noteTitle || 'Untitled Note');
    api.getBlocks(noteId)
      .then(data => {
        setBlocks(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load blocks:', err);
        setLoading(false);
      });
  }, [noteId, noteTitle]);

  // Real-time Collaboration Subscription
  useEffect(() => {
    if (!noteId) return;
    
    const channel = supabase.channel(`note-${noteId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocks', filter: `note_id=eq.${noteId}` },
        (payload) => {
          setBlocks(currentBlocks => {
            if (payload.eventType === 'INSERT') {
              if (!currentBlocks.find(b => b.id === payload.new.id)) {
                return [...currentBlocks, payload.new].sort((a, b) => a.order_index - b.order_index);
              }
            } else if (payload.eventType === 'UPDATE') {
              return currentBlocks.map(b => b.id === payload.new.id ? payload.new : b).sort((a, b) => a.order_index - b.order_index);
            } else if (payload.eventType === 'DELETE') {
              return currentBlocks.filter(b => b.id !== payload.old.id);
            }
            return currentBlocks;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [noteId]);

  // Autosave debounce
  const scheduleSave = useCallback((blockId, updates) => {
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.updateBlock(blockId, updates);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Autosave failed:', err);
        setSaveStatus('error');
      }
    }, 800);
  }, []);

  const handleBlockUpdate = useCallback((blockId, updates) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updates } : b));
    scheduleSave(blockId, updates);
  }, [scheduleSave]);

  const handleAddBlock = async (type, language = null) => {
    setShowBlockMenu(false);
    const orderIndex = blocks.length;
    let content = {};
    if (type === 'text') content = { text: '', format: 'paragraph' };
    if (type === 'code') content = { text: '' };
    if (type === 'diagram') content = { diagramType: 'stack', data: { items: ['TOP →', '', '', '', 'BOTTOM →'], title: 'Stack' } };
    if (type === 'image') content = { url: '', align: 'center', scale: 100, caption: '', title: '' };

    try {
      const newBlock = await api.createBlock(noteId, type, orderIndex, content, language || (type === 'code' ? 'javascript' : null));
      setBlocks(prev => [...prev, newBlock]);
    } catch (err) {
      console.error('Failed to create block:', err);
    }
  };

  const handleDeleteBlock = async (blockId) => {
    try {
      await api.deleteBlock(blockId);
      setBlocks(prev => prev.filter(b => b.id !== blockId));
    } catch (err) {
      console.error('Failed to delete block:', err);
    }
  };

  const handleMoveBlock = async (blockId, direction) => {
    const idx = blocks.findIndex(b => b.id === blockId);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= blocks.length) return;
    
    const newBlocks = [...blocks];
    [newBlocks[idx], newBlocks[newIdx]] = [newBlocks[newIdx], newBlocks[idx]];
    setBlocks(newBlocks);
    
    try {
      await api.reorderBlocks(noteId, newBlocks.map(b => b.id));
    } catch (err) {
      console.error('Failed to reorder blocks:', err);
    }
  };

  const handleTitleChange = async (newTitle) => {
    setTitle(newTitle);
    setSaveStatus('saving');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await api.renameNote(noteId, newTitle);
        onTitleChange && onTitleChange(newTitle);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to save title:', err);
        setSaveStatus('error');
      }
    }, 800);
  };

  const handleTogglePrivacy = async () => {
    try {
      const newStatus = !isPublic;
      await api.toggleNotePrivacy(noteId, newStatus);
      onPrivacyChange && onPrivacyChange(newStatus);
    } catch (err) {
      console.error('Failed to toggle privacy:', err);
    }
  };

  const shareUrl = `${window.location.origin}/share/${noteId}`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Fetch collaborators
  useEffect(() => {
    if (showShareModal && noteId) {
      api.getCollaborators(noteId)
        .then(data => setCollaborators(data))
        .catch(err => console.error(err));
    }
  }, [showShareModal, noteId]);

  const handleAddCollaborator = async (e) => {
    e.preventDefault();
    if (!collabEmail) return;
    try {
      setCollabError('');
      const newCollab = await api.addCollaborator(noteId, collabEmail, collabRole);
      setCollaborators(prev => [...prev, newCollab]);
      setCollabEmail('');
    } catch (err) {
      setCollabError(err.message || 'Failed to add collaborator');
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    try {
      await api.removeCollaborator(noteId, userId);
      setCollaborators(prev => prev.filter(c => c.user_id !== userId));
    } catch (err) {
      console.error('Failed to remove collaborator:', err);
    }
  };

  if (!noteId) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 relative">
      <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none" />
      
      {/* Editor Header */}
      <header className="h-14 px-6 border-b border-app-border flex items-center justify-between shrink-0 bg-black/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2 text-sm">
          {notebookTitle && <span className="text-gray-600 text-xs">{notebookTitle}</span>}
          {notebookTitle && <span className="text-gray-700">/</span>}
          <input
            className="bg-transparent text-primary-text text-sm font-medium outline-none min-w-[100px] placeholder-gray-600"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Note title..."
          />
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggles */}
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
            <button
              onClick={() => onViewModeChange && onViewModeChange('roadmap')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'roadmap' ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white'}`}
              title="Open Roadmap View"
            >
              <LayoutGrid size={12} /> Roadmap
            </button>
            <button
              onClick={() => onViewModeChange && onViewModeChange('graph')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${viewMode === 'graph' ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white'}`}
              title="Open Graph View"
            >
              <Network size={12} /> Graph
            </button>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowShareModal(!showShareModal)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${isPublic ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-white/5 text-gray-400 hover:text-white border border-transparent hover:border-app-border-strong'}`}
            >
              {isPublic ? <Globe size={14} /> : <Share2 size={14} />}
              Share
            </button>
            {showShareModal && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowShareModal(false)} />
                <div className="absolute top-full right-0 mt-2 w-80 bg-surface-hover border border-app-border-strong rounded-xl shadow-2xl p-4 z-50">
                  <h4 className="text-primary-text font-medium mb-1">Share to Web</h4>
                  <p className="text-xs text-gray-500 mb-4">Anyone with the link can view this note and run its code.</p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-300">Public Access</span>
                    <button 
                      onClick={handleTogglePrivacy}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPublic ? 'bg-primary' : 'bg-gray-600'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-app-bg transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  {isPublic && (
                    <div className="flex items-center gap-2 mb-6">
                      <input 
                        readOnly 
                        value={shareUrl} 
                        className="flex-1 bg-app-bg border border-app-border-strong rounded px-2 py-1.5 text-[10px] text-gray-400 font-mono outline-none"
                      />
                      <button 
                        onClick={handleCopyLink}
                        className="p-1.5 bg-white/10 hover:bg-white/20 rounded text-primary-text transition-colors"
                      >
                        {copied ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
                      </button>
                    </div>
                  )}

                  <hr className="border-app-border mb-4" />

                  <h4 className="text-primary-text font-medium mb-1">Collaborators</h4>
                  <p className="text-xs text-gray-500 mb-4">Invite others to view or edit this note.</p>
                  
                  <form onSubmit={handleAddCollaborator} className="flex flex-col gap-2 mb-4">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        placeholder="Email address..."
                        value={collabEmail}
                        onChange={(e) => setCollabEmail(e.target.value)}
                        className="flex-1 bg-app-bg border border-app-border-strong rounded px-2 py-1.5 text-xs text-primary-text outline-none focus:border-primary/50"
                      />
                      <select 
                        value={collabRole}
                        onChange={(e) => setCollabRole(e.target.value)}
                        className="bg-app-bg border border-app-border-strong rounded px-2 py-1.5 text-xs text-primary-text outline-none"
                      >
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={!collabEmail}
                      className="flex items-center justify-center gap-2 w-full bg-primary/20 text-primary border border-primary/30 rounded py-1.5 text-xs font-medium hover:bg-primary/30 disabled:opacity-50 transition-colors"
                    >
                      <UserPlus size={14} /> Add Collaborator
                    </button>
                    {collabError && <p className="text-red-400 text-xs mt-1">{collabError}</p>}
                  </form>

                  {collaborators.length > 0 && (
                    <div className="space-y-2 mt-4 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                      {collaborators.map(c => (
                        <div key={c.user_id} className="flex items-center justify-between bg-black/20 p-2 rounded border border-app-border">
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-primary-text truncate">{c.profiles?.email}</span>
                            <span className="text-[10px] text-gray-500 capitalize">{c.role}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveCollaborator(c.user_id)}
                            className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                            title="Remove collaborator"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-gray-500 border-l border-app-border-strong pl-3">
            {saveStatus === 'saving' && <><Loader2 size={12} className="animate-spin" /> Saving...</>}
            {saveStatus === 'saved' && <><div className="w-1.5 h-1.5 rounded-full bg-green-500" /> Saved</>}
            {saveStatus === 'error' && <><div className="w-1.5 h-1.5 rounded-full bg-red-500" /> Error</>}
          </div>
        </div>
      </header>

      {/* Editor Content */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10">
        <div className="max-w-3xl mx-auto space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {blocks.map((block, i) => (
                <div key={block.id} className="group relative">
                  {/* Block Controls */}
                  <div className="absolute -left-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-0.5 z-10">
                    <button
                      onClick={() => handleMoveBlock(block.id, 'up')}
                      disabled={i === 0}
                      className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button className="p-0.5 text-gray-600 cursor-grab">
                      <GripVertical size={12} />
                    </button>
                    <button
                      onClick={() => handleMoveBlock(block.id, 'down')}
                      disabled={i === blocks.length - 1}
                      className="p-0.5 text-gray-600 hover:text-gray-300 disabled:opacity-30 transition-colors"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="absolute -right-10 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-600 hover:text-red-400 z-10"
                    title="Delete block"
                  >
                    <Trash2 size={12} />
                  </button>

                  {/* Block Content */}
                  {block.type === 'text' && (
                    <TextBlock
                      block={block}
                      onUpdate={(updates) => handleBlockUpdate(block.id, updates)}
                      allNotes={allNotes}
                      onLinkClick={onNavigateToNote}
                    />
                  )}
                  {block.type === 'code' && (
                    <CodeBlock block={block} allBlocks={blocks} onUpdate={(updates) => handleBlockUpdate(block.id, updates)} />
                  )}
                  {block.type === 'diagram' && (
                    <DiagramBlock block={block} onUpdate={(updates) => handleBlockUpdate(block.id, updates)} />
                  )}
                  {block.type === 'pseudocode' && (
                    <PseudocodeBlock block={block} onUpdate={(updates) => handleBlockUpdate(block.id, updates)} />
                  )}
                  {block.type === 'image' && (
                    <ImageBlock block={block} onUpdate={(updates) => handleBlockUpdate(block.id, updates)} />
                  )}
                </div>
              ))}

              {/* Add Block Button */}
              <div className="flex justify-center pt-4 relative">
                <div className="relative">
                  <button
                    onClick={() => setShowBlockMenu(!showBlockMenu)}
                    className="flex items-center gap-2 px-4 py-2 text-xs text-gray-500 hover:text-primary border border-dashed border-app-border-strong hover:border-primary/30 rounded-xl transition-all"
                  >
                    <Plus size={14} /> Add block
                  </button>

                  {showBlockMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowBlockMenu(false)} />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-surface-hover border border-app-border-strong rounded-xl shadow-2xl py-2 px-1 z-50 flex gap-1 min-w-[280px]">
                        <button
                          onClick={() => handleAddBlock('text')}
                          className="flex-1 flex flex-col items-center gap-1.5 px-3 py-3 text-gray-300 hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
                        >
                          <Type size={18} />
                          <span className="text-[10px] font-medium">Text</span>
                        </button>
                        <button
                          onClick={() => handleAddBlock('code')}
                          className="flex-1 flex flex-col items-center gap-1.5 px-3 py-3 text-gray-300 hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
                        >
                          <Code2 size={18} />
                          <span className="text-[10px] font-medium">Code</span>
                        </button>
                        <button
                          onClick={() => handleAddBlock('diagram')}
                          className="flex-1 flex flex-col items-center gap-1.5 px-3 py-3 text-gray-300 hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
                        >
                          <GitMerge size={18} />
                          <span className="text-[10px] font-medium">Diagram</span>
                        </button>
                        <button
                          onClick={() => handleAddBlock('pseudocode')}
                          className="flex-1 flex flex-col items-center gap-1.5 px-3 py-3 text-gray-300 hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
                        >
                          <Terminal size={18} />
                          <span className="text-[10px] font-medium">Pseudocode</span>
                        </button>
                        <button
                          onClick={() => handleAddBlock('image')}
                          className="flex-1 flex flex-col items-center gap-1.5 px-3 py-3 text-gray-300 hover:text-primary hover:bg-surface-hover rounded-lg transition-colors"
                        >
                          <ImageIcon size={18} />
                          <span className="text-[10px] font-medium">Image</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Empty state for new notes */}
              {blocks.length === 0 && !loading && (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-sm mb-4">This note is empty. Add your first block to start.</p>
                  <div className="flex justify-center gap-3">
                    <button onClick={() => handleAddBlock('text')} className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 border border-app-border-strong rounded-lg hover:border-primary/30 hover:text-primary transition-all">
                      <Type size={14} /> Text
                    </button>
                    <button onClick={() => handleAddBlock('code')} className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 border border-app-border-strong rounded-lg hover:border-primary/30 hover:text-primary transition-all">
                      <Code2 size={14} /> Code
                    </button>
                    <button onClick={() => handleAddBlock('diagram')} className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 border border-app-border-strong rounded-lg hover:border-primary/30 hover:text-primary transition-all">
                      <GitMerge size={14} /> Diagram
                    </button>
                    <button onClick={() => handleAddBlock('pseudocode')} className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 border border-app-border-strong rounded-lg hover:border-primary/30 hover:text-primary transition-all">
                      <Terminal size={14} /> Pseudocode
                    </button>
                    <button onClick={() => handleAddBlock('image')} className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 border border-app-border-strong rounded-lg hover:border-primary/30 hover:text-primary transition-all">
                      <ImageIcon size={14} /> Image
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
