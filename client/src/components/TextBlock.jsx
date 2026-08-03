import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Type, Bold, Italic, List, Code, Underline, Link2 } from 'lucide-react';

export default function TextBlock({ block, onUpdate, allNotes = [], onLinkClick }) {
  const contentRef = useRef(null);
  const format = block.content?.format || 'paragraph';
  const [linkQuery, setLinkQuery] = useState(null); // { query: string, caretRect: {top,left} } or null
  const [linkResults, setLinkResults] = useState([]);
  const [linkSelectedIdx, setLinkSelectedIdx] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      const currentHtml = contentRef.current.innerHTML;
      const newHtml = block.content?.html ?? block.content?.text ?? '';
      if (currentHtml !== newHtml && document.activeElement !== contentRef.current) {
        contentRef.current.innerHTML = newHtml;
      }
    }
  }, [block.content?.html, block.content?.text]);

  const handleInput = () => {
    if (contentRef.current) {
      onUpdate({ content: { ...block.content, html: contentRef.current.innerHTML } });
    }
    detectLinkTrigger();
  };

  // Detect [[ trigger
  const detectLinkTrigger = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !sel.focusNode) {
      setLinkQuery(null);
      return;
    }

    const node = sel.focusNode;
    if (node.nodeType !== Node.TEXT_NODE) {
      setLinkQuery(null);
      return;
    }

    const text = node.textContent;
    const cursorPos = sel.focusOffset;
    const before = text.slice(0, cursorPos);

    // Find the last [[ that doesn't have a closing ]]
    const lastOpen = before.lastIndexOf('[[');
    if (lastOpen === -1) {
      setLinkQuery(null);
      return;
    }

    const afterOpen = before.slice(lastOpen + 2);
    if (afterOpen.includes(']]')) {
      setLinkQuery(null);
      return;
    }

    const query = afterOpen;

    // Get caret position for dropdown placement
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = contentRef.current?.getBoundingClientRect() || { top: 0, left: 0 };

    setLinkQuery({
      query,
      top: rect.bottom - containerRect.top + 4,
      left: rect.left - containerRect.left,
      textNode: node,
      openIdx: lastOpen,
    });
    setLinkSelectedIdx(0);
  }, []);

  // Filter notes by query
  useEffect(() => {
    if (!linkQuery) {
      setLinkResults([]);
      return;
    }
    const q = linkQuery.query.toLowerCase();
    const filtered = allNotes
      .filter(n => n.title?.toLowerCase().includes(q))
      .slice(0, 6);
    setLinkResults(filtered);
    setLinkSelectedIdx(0);
  }, [linkQuery, allNotes]);

  // Handle keyboard in link picker
  const handleKeyDown = (e) => {
    if (!linkQuery || linkResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setLinkSelectedIdx(prev => Math.min(prev + 1, linkResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setLinkSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && linkQuery) {
      e.preventDefault();
      insertLink(linkResults[linkSelectedIdx]);
    } else if (e.key === 'Escape') {
      setLinkQuery(null);
    }
  };

  const insertLink = (note) => {
    if (!note || !linkQuery) return;

    const { textNode, openIdx } = linkQuery;
    const sel = window.getSelection();
    const cursorPos = sel.focusOffset;

    // Replace [[query with the link span
    const before = textNode.textContent.slice(0, openIdx);
    const after = textNode.textContent.slice(cursorPos);

    // Create elements
    const beforeNode = document.createTextNode(before);
    const afterNode = document.createTextNode(after);

    const linkSpan = document.createElement('span');
    linkSpan.className = 'internal-link';
    linkSpan.setAttribute('data-note-id', note.id);
    linkSpan.setAttribute('data-notebook-id', note.notebook_id || '');
    linkSpan.contentEditable = 'false';
    linkSpan.textContent = `📎 ${note.title}`;

    const parent = textNode.parentNode;
    parent.insertBefore(beforeNode, textNode);
    parent.insertBefore(linkSpan, textNode);
    parent.insertBefore(afterNode, textNode);
    parent.removeChild(textNode);

    // Move cursor after the link
    const range = document.createRange();
    range.setStartAfter(linkSpan);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);

    setLinkQuery(null);
    handleInput();
  };

  // Handle clicking on internal links
  const handleClick = (e) => {
    const linkEl = e.target.closest('.internal-link');
    if (linkEl && onLinkClick) {
      const noteId = linkEl.getAttribute('data-note-id');
      const notebookId = linkEl.getAttribute('data-notebook-id');
      if (noteId) {
        onLinkClick(noteId, notebookId);
      }
    }
  };

  const handleFormatChange = (newFormat) => {
    onUpdate({ content: { ...block.content, format: newFormat } });
  };

  const execCommand = (cmd, arg = null) => {
    document.execCommand(cmd, false, arg);
    handleInput();
  };

  const insertCode = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const content = range.extractContents();
    
    const codeNode = document.createElement('code');
    codeNode.className = "bg-white/10 text-primary px-1.5 py-0.5 rounded font-mono text-[0.9em] mx-0.5";
    if (content.childNodes.length === 0) {
      codeNode.textContent = "code";
    } else {
      codeNode.appendChild(content);
    }
    range.insertNode(codeNode);
    
    range.setStartAfter(codeNode);
    range.setEndAfter(codeNode);
    selection.removeAllRanges();
    selection.addRange(range);
    
    handleInput();
  };

  const getTextClass = () => {
    switch (format) {
      case 'heading1': return 'text-3xl font-bold';
      case 'heading2': return 'text-2xl font-bold';
      case 'heading3': return 'text-xl font-semibold';
      case 'bullet': return 'text-sm pl-6 relative before:content-["•"] before:absolute before:left-2 before:text-primary';
      default: return 'text-sm';
    }
  };

  return (
    <div className="group rounded-xl border border-transparent hover:border-app-border transition-all relative">
      {/* Format toolbar */}
      <div className="absolute -top-8 left-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-surface-hover border border-app-border-strong rounded-lg px-1 py-0.5 z-10 shadow-lg">
        <button onClick={() => handleFormatChange('paragraph')} className={`p-1 rounded text-xs transition-colors ${format === 'paragraph' ? 'text-primary bg-white/5' : 'text-gray-500 hover:text-gray-300'}`} title="Paragraph"><Type size={12} /></button>
        <button onClick={() => handleFormatChange('heading1')} className={`p-1 rounded text-xs font-bold transition-colors ${format === 'heading1' ? 'text-primary bg-white/5' : 'text-gray-500 hover:text-gray-300'}`} title="Heading 1">H1</button>
        <button onClick={() => handleFormatChange('heading2')} className={`p-1 rounded text-xs font-bold transition-colors ${format === 'heading2' ? 'text-primary bg-white/5' : 'text-gray-500 hover:text-gray-300'}`} title="Heading 2">H2</button>
        <button onClick={() => handleFormatChange('heading3')} className={`p-1 rounded text-xs font-bold transition-colors ${format === 'heading3' ? 'text-primary bg-white/5' : 'text-gray-500 hover:text-gray-300'}`} title="Heading 3">H3</button>
        <button onClick={() => handleFormatChange('bullet')} className={`p-1 rounded text-xs transition-colors ${format === 'bullet' ? 'text-primary bg-white/5' : 'text-gray-500 hover:text-gray-300'}`} title="Bullet List"><List size={12} /></button>
        
        <div className="w-px h-4 bg-white/10 mx-0.5" />
        
        <button onMouseDown={(e) => { e.preventDefault(); execCommand('bold'); }} className="p-1 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-surface-hover transition-colors" title="Bold"><Bold size={12} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); execCommand('italic'); }} className="p-1 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-surface-hover transition-colors" title="Italic"><Italic size={12} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); execCommand('underline'); }} className="p-1 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-surface-hover transition-colors" title="Underline"><Underline size={12} /></button>
        <button onMouseDown={(e) => { e.preventDefault(); insertCode(); }} className="p-1 rounded text-xs text-gray-500 hover:text-gray-300 hover:bg-surface-hover transition-colors" title="Inline Code"><Code size={12} /></button>
      </div>

      <div className="relative">
        <div
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onClick={handleClick}
          className={`w-full bg-transparent text-primary-text outline-none px-3 py-2 min-h-[2rem] leading-relaxed cursor-text empty-placeholder ${getTextClass()}`}
          placeholder="Start typing... (use [[ to link notes)"
          style={{ minHeight: '2rem' }}
        />

        {/* Internal Link Dropdown */}
        {linkQuery && linkResults.length > 0 && (
          <div
            className="absolute z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[220px] max-h-[200px] overflow-y-auto"
            style={{ top: linkQuery.top, left: Math.min(linkQuery.left, 300) }}
          >
            <div className="px-3 py-1.5 text-[9px] text-gray-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Link2 size={10} /> Link to note
            </div>
            {linkResults.map((note, i) => (
              <button
                key={note.id}
                onMouseDown={(e) => { e.preventDefault(); insertLink(note); }}
                className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors ${
                  i === linkSelectedIdx ? 'bg-primary/10 text-primary' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <span className="text-gray-500">📎</span>
                <span className="truncate">{note.title || 'Untitled Note'}</span>
              </button>
            ))}
          </div>
        )}

        {linkQuery && linkResults.length === 0 && linkQuery.query.length > 0 && (
          <div
            className="absolute z-50 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl p-3 min-w-[180px]"
            style={{ top: linkQuery.top, left: Math.min(linkQuery.left, 300) }}
          >
            <p className="text-xs text-gray-500">No matching notes found</p>
          </div>
        )}
      </div>
    </div>
  );
}
