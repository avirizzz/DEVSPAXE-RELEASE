import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Loader2, Copy, Check, ChevronDown, Link, ExternalLink } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { executeCode } from '../lib/codeRunner';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', color: '#f7df1e' },
  { value: 'python', label: 'Python', color: '#3776ab' },
  { value: 'cpp', label: 'C++', color: '#00599c' },
  { value: 'java', label: 'Java', color: '#b07219' },
  { value: 'html', label: 'HTML', color: '#e34f26' },
  { value: 'css', label: 'CSS', color: '#1572b6' },
];

const BOILERPLATES = {
  javascript: `console.log("Hello, World!");\n`,
  python: `print("Hello, World!")\n`,
  cpp: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n`,
  java: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n`,
  html: `<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <title>Document</title>\n</head>\n<body>\n    <h1>Hello, World!</h1>\n</body>\n</html>`,
  css: `body {\n    background-color: #f0f0f0;\n    font-family: sans-serif;\n}\n`,
};

export default function CodeBlock({ block, allBlocks = [], onUpdate, readOnly = false }) {
  const code = block.content?.text || '';
  const blockTitle = block.content?.title || '';
  const language = block.language || 'javascript';
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [showLinkDropdown, setShowLinkDropdown] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const textareaRef = useRef(null);
  const previewRef = useRef(null);

  const isWebLang = language === 'html' || language === 'css';

  const compatibleBlocks = allBlocks.filter(b => 
    b.type === 'code' && b.id !== block.id && 
    ((language === 'html' && b.language === 'css') || (language === 'css' && b.language === 'html'))
  );

  const linkedBlock = allBlocks.find(b => b.id === block.content?.linkedBlockId);

  const handleEditorWillMount = (monaco) => {
    monaco.editor.defineTheme('note-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#0d0d0d',
        'editor.lineHighlightBackground': '#ffffff0a',
        'editorLineNumber.foreground': '#4b5563',
      }
    });
  };

  const handleCodeChange = useCallback((newCode) => {
    onUpdate({ content: { ...block.content, text: newCode } });
  }, [block.content, onUpdate]);

  const handleLanguageChange = useCallback((lang) => {
    onUpdate({ language: lang, content: { ...block.content, linkedBlockId: null } });
    setShowLangDropdown(false);
    setOutput('');
    setError('');
    setShowPreview(false);
  }, [onUpdate, block.content]);

  const handleLinkBlock = (targetBlockId) => {
    onUpdate({ content: { ...block.content, linkedBlockId: targetBlockId } });
    setShowLinkDropdown(false);
  };

  const handleRun = async () => {
    if (isWebLang) {
      setShowPreview(true);
      updatePreview(code, language);
      return;
    }

    setRunning(true);
    setOutput('');
    setError('');

    try {
      const result = await executeCode(language, code);
      setOutput(result.output || '');
      setError(result.error || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  const updatePreview = (previewCode, lang) => {
    if (!previewRef.current) return;
    const iframe = previewRef.current;
    
    let htmlCode = '';
    let cssCode = '';
    
    if (lang === 'html') {
      htmlCode = previewCode;
      if (linkedBlock && linkedBlock.language === 'css') {
        cssCode = linkedBlock.content?.text || '';
      }
    } else if (lang === 'css') {
      cssCode = previewCode;
      if (linkedBlock && linkedBlock.language === 'html') {
        htmlCode = linkedBlock.content?.text || '';
      }
    }

    let html;
    if (htmlCode) {
      html = `<!DOCTYPE html><html><head><style>${cssCode}</style></head><body>${htmlCode}</body></html>`;
    } else {
      html = `<!DOCTYPE html><html><head><style>${cssCode}</style></head><body><div class="preview">Preview content</div></body></html>`;
    }
    iframe.srcdoc = html;
  };

  useEffect(() => {
    if (showPreview && isWebLang) {
      updatePreview(code, language);
    }
  }, [code, showPreview, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleInsertBoilerplate = () => {
    const bp = BOILERPLATES[language];
    if (bp) {
      handleCodeChange(bp);
    }
  };

  const langObj = LANGUAGES.find(l => l.value === language) || LANGUAGES[0];

  return (
    <div className="rounded-xl border border-app-border bg-[#0d0d0d] group transition-all hover:border-app-border-strong flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-bg border-b border-app-border rounded-t-xl">
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="relative">
            <button
              onClick={() => !readOnly && setShowLangDropdown(!showLangDropdown)}
              className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors ${readOnly ? 'cursor-default' : 'hover:bg-surface-hover'}`}
              style={{ color: langObj.color }}
            >
              <div className="w-2 h-2 rounded-full" style={{ background: langObj.color }} />
              {langObj.label}
              {!readOnly && <ChevronDown size={10} />}
            </button>
            {showLangDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLangDropdown(false)} />
                <div className="absolute top-full left-0 mt-1 bg-surface-hover border border-app-border-strong rounded-lg shadow-2xl py-1 z-50 min-w-[120px] max-h-60 overflow-y-auto custom-scrollbar">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.value}
                      onClick={() => handleLanguageChange(l.value)}
                      className="w-full px-3 py-1.5 text-xs text-left hover:bg-surface-hover flex items-center gap-2 transition-colors"
                      style={{ color: language === l.value ? l.color : '#9ca3af' }}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                      {l.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {readOnly ? (
            blockTitle ? <span className="text-xs text-gray-400 ml-2">{blockTitle}</span> : null
          ) : (
            <input
              type="text"
              placeholder="Name this block..."
              value={blockTitle}
              onChange={(e) => onUpdate({ content: { ...block.content, title: e.target.value } })}
              className="bg-transparent border-none outline-none text-xs text-gray-400 placeholder-gray-600 ml-2 w-32 focus:text-gray-200 transition-colors"
            />
          )}
        </div>

        <div className="flex items-center gap-1">
          {isWebLang && compatibleBlocks.length > 0 && (
            <div className="relative">
              <button
                onClick={() => !readOnly && setShowLinkDropdown(!showLinkDropdown)}
                title="Link to block"
                className={`flex items-center gap-1 px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded transition-colors ${linkedBlock ? 'text-primary bg-primary/10' : 'text-gray-500 hover:text-white hover:bg-surface-hover'} ${readOnly ? 'cursor-default' : ''}`}
              >
                <Link size={12} />
                {linkedBlock ? 'Linked' : 'Link'}
              </button>
              {showLinkDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLinkDropdown(false)} />
                  <div className="absolute top-full right-0 mt-1 bg-surface-hover border border-app-border-strong rounded-lg shadow-2xl py-1 z-50 min-w-[200px] max-h-60 overflow-y-auto custom-scrollbar">
                    <button
                      onClick={() => handleLinkBlock(null)}
                      className="w-full px-3 py-1.5 text-xs text-left hover:bg-white/5 flex items-center gap-2 transition-colors text-gray-400"
                    >
                      None
                    </button>
                    {compatibleBlocks.map(b => (
                      <button
                        key={b.id}
                        onClick={() => handleLinkBlock(b.id)}
                        className="w-full px-3 py-1.5 text-xs text-left hover:bg-white/5 flex flex-col gap-0.5 transition-colors"
                      >
                        <span style={{ color: LANGUAGES.find(l => l.value === b.language)?.color }}>{b.language.toUpperCase()}</span>
                        <span className="text-gray-400 truncate w-full">
                          {b.content?.title || b.content?.text?.slice(0, 30) || 'Empty block'}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {!readOnly && (
            <button
              onClick={handleInsertBoilerplate}
              title="Insert Boilerplate"
              className="px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-gray-500 hover:text-white hover:bg-surface-hover rounded transition-colors"
            >
              Boilerplate
            </button>
          )}
          <button onClick={handleCopy} className="p-1.5 text-gray-500 hover:text-gray-300 rounded-md hover:bg-surface-hover transition-colors" title="Copy code">
            {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
          </button>
          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-primary text-black hover:bg-[#cfcca8] transition-colors disabled:opacity-50"
          >
            {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
            {isWebLang ? 'Preview' : 'Run'}
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className={`relative w-full border-t border-app-border ${(!output && !error && !(showPreview && isWebLang)) ? 'rounded-b-xl overflow-hidden' : ''}`} style={{ height: Math.max(120, Math.min(600, (code.split('\n').length * 21) + 24)) + 'px' }}>
        <Editor
          height="100%"
          language={language === 'c++' ? 'cpp' : language}
          theme="note-dark"
          beforeMount={handleEditorWillMount}
          value={code}
          onChange={(value) => handleCodeChange(value || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: 'monospace',
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            automaticLayout: true,
            lineNumbersMinChars: 3,
            folding: false,
            contextmenu: false,
            wordWrap: 'on',
            readOnly: readOnly
          }}
        />
      </div>

      {/* Output Panel */}
      {(output || error) && !isWebLang && (
        <div className="border-t border-app-border rounded-b-xl overflow-hidden">
          <div className="flex items-center px-3 py-1.5 bg-sidebar-bg">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Output</span>
          </div>
          <pre className={`px-3 py-3 text-xs font-mono max-h-48 overflow-auto ${error ? 'text-red-400' : 'text-green-400'}`}>
            {error || output || 'No output'}
          </pre>
        </div>
      )}

      {/* HTML/CSS Preview */}
      {showPreview && isWebLang && (
        <div className="border-t border-app-border rounded-b-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-sidebar-bg">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Preview</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const blob = new Blob([code], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                }}
                className="flex items-center gap-1 text-gray-500 hover:text-[#d4c94a] text-[10px] transition-colors"
                title="Open in new window"
              >
                <ExternalLink size={11} /> Pop Out
              </button>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-300 text-xs transition-colors">Hide</button>
            </div>
          </div>
          <div className="bg-white rounded-b-lg mx-2 mb-2 overflow-hidden">
            <iframe
              ref={previewRef}
              className="w-full border-0"
              style={{ height: '250px' }}
              sandbox="allow-scripts"
              title="HTML/CSS Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
