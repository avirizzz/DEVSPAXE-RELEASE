import React, { useRef, useState, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';

const SYMBOLS = [
  { label: '←', title: 'Assignment' },
  { label: '≠', title: 'Not Equal' },
  { label: '≤', title: 'Less or Equal' },
  { label: '≥', title: 'Greater or Equal' },
  { label: '∑', title: 'Sum' },
  { label: '∏', title: 'Product' },
  { label: '√', title: 'Square Root' },
  { label: '∞', title: 'Infinity' },
  { label: '∈', title: 'Element Of' },
  { label: '∉', title: 'Not Element Of' },
  { label: '∩', title: 'Intersection' },
  { label: '∪', title: 'Union' },
  { label: '∴', title: 'Therefore' },
  { label: 'AND', title: 'Logical AND' },
  { label: 'OR', title: 'Logical OR' },
  { label: 'NOT', title: 'Logical NOT' },
  { label: '→', title: 'Right Arrow' },
];

export default function PseudocodeBlock({ block, onUpdate, readOnly = false }) {
  const code = block.content?.text || '';
  const editorRef = useRef(null);

  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme('pseudocode-theme', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#111111',
        'editor.lineHighlightBackground': '#1a1a1a',
      }
    });
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value) => {
    onUpdate({ content: { ...block.content, text: value } });
  };

  const insertSymbol = (symbol) => {
    if (editorRef.current) {
      const editor = editorRef.current;
      const selection = editor.getSelection();
      
      const textToInsert = symbol === 'AND' || symbol === 'OR' || symbol === 'NOT' ? ` ${symbol} ` : symbol;

      editor.executeEdits('pseudocode-toolbar', [
        {
          range: selection,
          text: textToInsert,
          forceMoveMarkers: true
        }
      ]);
      editor.focus();
    }
  };

  return (
    <div className="flex flex-col group rounded-xl overflow-hidden border border-white/10 shadow-lg bg-black/40">
      <div className="flex items-center gap-1 p-2 bg-[#1a1a1a] border-b border-white/5 overflow-x-auto custom-scrollbar">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mr-2 shrink-0">Pseudocode</span>
        {readOnly ? (
          block.content?.title ? <span className="text-xs text-gray-400 mr-2 shrink-0">{block.content.title}</span> : null
        ) : (
          <input
            type="text"
            placeholder="Name this block..."
            value={block.content?.title || ''}
            onChange={(e) => onUpdate({ content: { ...block.content, title: e.target.value } })}
            className="bg-transparent border-none outline-none text-xs text-gray-400 placeholder-gray-600 mr-2 w-32 focus:text-gray-200 transition-colors shrink-0"
          />
        )}
        <div className="w-px h-4 bg-white/10 mr-1 shrink-0" />
        {!readOnly && SYMBOLS.map((sym, i) => (
          <button
            key={i}
            onClick={() => insertSymbol(sym.label)}
            title={sym.title}
            className="px-2 py-1 bg-white/5 hover:bg-primary/20 hover:text-primary text-gray-300 text-xs rounded transition-colors font-mono shrink-0"
          >
            {sym.label}
          </button>
        ))}
      </div>

      <div className="relative p-2" style={{ height: '300px' }}>
        <Editor
          height="100%"
          defaultLanguage="python"
          theme="pseudocode-theme"
          value={code}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorMount}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            lineHeight: 1.6,
            padding: { top: 16, bottom: 16 },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: true,
            formatOnPaste: true,
            wordWrap: 'on',
            contextmenu: false,
            renderLineHighlight: 'all',
            readOnly: readOnly,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            }
          }}
        />
      </div>
    </div>
  );
}
