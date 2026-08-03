import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import * as api from '../lib/api';
import TextBlock from '../components/TextBlock';
import CodeBlock from '../components/CodeBlock';
import DiagramBlock from '../components/DiagramBlock';

export default function PublicNote() {
  const { noteId } = useParams();
  const [note, setNote] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPublicData = async () => {
      try {
        const noteData = await api.getPublicNote(noteId);
        setNote(noteData);
        const blocksData = await api.getPublicBlocks(noteId);
        setBlocks(blocksData);
      } catch (err) {
        console.error(err);
        setError("Note not found, or it is not public.");
      } finally {
        setLoading(false);
      }
    };
    fetchPublicData();
  }, [noteId]);

  if (loading) {
    return (
      <div className="flex h-screen bg-app-bg text-primary-text items-center justify-center">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="flex h-screen bg-app-bg text-primary-text items-center justify-center flex-col gap-4">
        <AlertCircle size={48} className="text-red-500" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-gray-500">{error}</p>
        <Link to="/" className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm">
          Return Home
        </Link>
      </div>
    );
  }

  // Local state update only - no API calls to save
  const handleBlockUpdate = (blockId, updates) => {
    setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, ...updates } : b));
  };

  return (
    <div className="flex flex-col h-screen bg-app-bg text-primary-text overflow-hidden selection:bg-primary/30 relative">
      <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none" />
      
      {/* Header */}
      <header className="h-14 px-6 border-b border-app-border flex items-center justify-between shrink-0 bg-black/80 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 mr-4">
            <span className="text-primary font-serif italic font-bold text-lg leading-none">note.dev</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-sm font-medium text-primary-text ml-2">{note.title}</h1>
        </div>
        <div className="text-xs text-gray-500">
          Shared by {note.profiles?.email || 'Anonymous'}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 relative z-10 pointer-events-auto">
        <div className="max-w-3xl mx-auto space-y-4 pb-20">
          {blocks.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-12">This note has no content.</p>
          ) : (
            blocks.map((block) => {
              if (block.type === 'code') {
                return (
                  <div key={block.id}>
                    <CodeBlock block={block} onUpdate={(updates) => handleBlockUpdate(block.id, updates)} />
                  </div>
                );
              }
              
              if (block.type === 'diagram') {
                return (
                  <div key={block.id}>
                    <DiagramBlock block={block} onUpdate={(updates) => handleBlockUpdate(block.id, updates)} />
                  </div>
                );
              }

              return (
                <div key={block.id}>
                  <TextBlock block={block} onUpdate={(updates) => handleBlockUpdate(block.id, updates)} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
