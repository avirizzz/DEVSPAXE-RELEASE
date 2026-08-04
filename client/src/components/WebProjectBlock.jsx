import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { WebContainer } from '@webcontainer/api';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Play, Square, Loader2, RefreshCw, Globe, Terminal as TerminalIcon, Code2, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

const VANILLA_PKG = JSON.stringify(
  { name: 'devspaxe-app', version: '1.0.0', main: 'index.js', scripts: { start: 'node index.js' } },
  null, 2
);
const REACT_PKG = JSON.stringify(
  { name: 'react-app', version: '0.0.0', type: 'module', scripts: { dev: 'vite --port 3000 --host' }, dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' }, devDependencies: { '@vitejs/plugin-react': '^4.0.0', vite: '^4.4.5' } },
  null, 2
);
const EXPRESS_PKG = JSON.stringify(
  { name: 'express-api', version: '1.0.0', main: 'index.js', scripts: { start: 'node index.js' }, dependencies: { express: '^4.18.2' } },
  null, 2
);

const TEMPLATES = {
  vanilla: {
    label: 'Vanilla JS',
    color: '#f7df1e',
    files: {
      'index.js': `const http = require('http');
const fs = require('fs');
const server = http.createServer((req, res) => {
  const html = fs.readFileSync('./index.html', 'utf-8');
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(html);
});
server.listen(3000, () => console.log('Server running at http://localhost:3000'));`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>WebContainer App</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', sans-serif; background: #0f0f12; color: #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 1rem; }
    h1 { font-size: 2.5rem; background: linear-gradient(135deg, #d4c94a, #a3b18a); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    p { color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Hello from DEVSPAXE! 🚀</h1>
  <p>Edit the files on the left and click Run.</p>
</body>
</html>`,
      'package.json': VANILLA_PKG,
    },
  },
  react: {
    label: 'React + Vite',
    color: '#61dafb',
    files: {
      'package.json': REACT_PKG,
      'vite.config.js': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });`,
      'index.html': `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>React App</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>`,
      'src/main.jsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);`,
      'src/App.jsx': `import { useState } from 'react';
export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ fontFamily: 'sans-serif', background: '#0f0f12', color: '#e2e8f0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <h1 style={{ fontSize: '2rem', background: 'linear-gradient(135deg,#d4c94a,#a3b18a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        DEVSPAXE React ⚛️
      </h1>
      <p>Count: <strong>{count}</strong></p>
      <button onClick={() => setCount(c => c + 1)} style={{ padding: '0.5rem 1.5rem', background: '#d4c94a', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
        Click me
      </button>
    </div>
  );
}`,
    },
  },
  express: {
    label: 'Express API',
    color: '#68d391',
    files: {
      'package.json': EXPRESS_PKG,
      'index.js': `const express = require('express');
const app = express();
app.use(express.json());
const todos = [{ id: 1, text: 'Learn WebContainers', done: false }];
app.get('/', (req, res) => res.send('<h1 style="font-family:sans-serif;padding:2rem">Express API 🟢</h1><p style="padding:0 2rem"><a href="/todos">/todos</a></p>'));
app.get('/todos', (req, res) => res.json(todos));
app.post('/todos', (req, res) => {
  const t = { id: todos.length + 1, text: req.body.text, done: false };
  todos.push(t);
  res.status(201).json(t);
});
app.listen(3000, () => console.log('✅ Express API at http://localhost:3000'));`,
    },
  },
};

let webContainerInstance = null;
let bootPromise = null;

async function getWebContainer() {
  if (webContainerInstance) return webContainerInstance;
  if (bootPromise) return bootPromise;
  bootPromise = WebContainer.boot().then((wc) => {
    webContainerInstance = wc;
    bootPromise = null;
    return wc;
  });
  return bootPromise;
}

export default function WebProjectBlock({ block, onUpdate, readOnly = false }) {
  const templateKey = block.content?.template || 'vanilla';
  const savedFiles = block.content?.files || TEMPLATES[templateKey]?.files || TEMPLATES.vanilla.files;

  const [files, setFiles] = useState(savedFiles);
  const [activeFile, setActiveFile] = useState(Object.keys(savedFiles)[0]);
  const [status, setStatus] = useState('idle'); // idle | booting | installing | running | error
  const [previewUrl, setPreviewUrl] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [serverProcess, setServerProcess] = useState(null);
  const [expandedPreview, setExpandedPreview] = useState(false);

  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const iframeRef = useRef(null);

  const template = TEMPLATES[templateKey] || TEMPLATES.vanilla;

  // Initialize xterm terminal when panel opens
  useEffect(() => {
    if (!showTerminal || xtermRef.current) return;
    const term = new Terminal({
      theme: { background: '#0d0d0d', foreground: '#d4d4d4', cursor: '#d4c94a', selectionBackground: '#d4c94a33' },
      fontFamily: 'Consolas, "Cascadia Code", monospace',
      fontSize: 12,
      cursorBlink: true,
      convertEol: true,
    });
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
    }
    xtermRef.current = term;
    return () => {
      term.dispose();
      xtermRef.current = null;
    };
  }, [showTerminal]);

  const writeToTerminal = useCallback((text) => {
    xtermRef.current?.write(text);
  }, []);

  const handleRun = async () => {
    if (status === 'running') {
      serverProcess?.kill();
      setStatus('idle');
      setPreviewUrl('');
      return;
    }

    setShowTerminal(true);
    setStatus('booting');
    // Use setTimeout to let xterm mount before writing
    setTimeout(() => writeToTerminal('\x1b[33m⚡ Booting WebContainer...\x1b[0m\r\n'), 300);

    try {
      const wc = await getWebContainer();

      // Write all files to virtual filesystem
      for (const [filePath, fileContent] of Object.entries(files)) {
        const parts = filePath.split('/');
        if (parts.length > 1) {
          await wc.fs.mkdir(parts.slice(0, -1).join('/'), { recursive: true });
        }
        await wc.fs.writeFile(filePath, fileContent);
      }
      writeToTerminal('\x1b[32m✓ Files written to virtual filesystem\x1b[0m\r\n');

      // Check if npm install is needed
      const hasDeps = (() => {
        try {
          const pkg = JSON.parse(files['package.json'] || '{}');
          return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).length > 0;
        } catch { return false; }
      })();

      if (hasDeps) {
        setStatus('installing');
        writeToTerminal('\x1b[33m📦 Running npm install...\x1b[0m\r\n');
        const installProcess = await wc.spawn('npm', ['install']);
        installProcess.output.pipeTo(new WritableStream({ write(data) { writeToTerminal(data); } }));
        const installCode = await installProcess.exit;
        if (installCode !== 0) {
          setStatus('error');
          writeToTerminal('\x1b[31m✗ npm install failed\x1b[0m\r\n');
          return;
        }
        writeToTerminal('\x1b[32m✓ Dependencies installed!\x1b[0m\r\n');
      }

      // Determine start command
      const pkg = (() => { try { return JSON.parse(files['package.json'] || '{}'); } catch { return {}; } })();
      const startScript = pkg.scripts?.dev ? 'dev' : pkg.scripts?.start ? 'start' : null;
      const startArgs = startScript ? ['run', startScript] : ['node', 'index.js'];

      setStatus('running');
      writeToTerminal(`\x1b[33m🚀 Running: npm ${startArgs.join(' ')}\x1b[0m\r\n`);

      const proc = await wc.spawn('npm', startArgs);
      setServerProcess(proc);
      proc.output.pipeTo(new WritableStream({ write(data) { writeToTerminal(data); } }));

      // Listen for port to be bound and set preview URL
      wc.on('server-ready', (port, url) => {
        writeToTerminal(`\x1b[32m✓ Server ready at ${url}\x1b[0m\r\n`);
        setPreviewUrl(url);
      });
    } catch (err) {
      setStatus('error');
      writeToTerminal(`\x1b[31m✗ Error: ${err.message}\x1b[0m\r\n`);
      console.error('WebContainer error:', err);
    }
  };

  const handleFileChange = (newContent) => {
    const newFiles = { ...files, [activeFile]: newContent || '' };
    setFiles(newFiles);
    onUpdate({ content: { ...block.content, files: newFiles } });
  };

  const handleTemplateChange = (key) => {
    const tpl = TEMPLATES[key];
    if (!tpl) return;
    const firstFile = Object.keys(tpl.files)[0];
    setFiles(tpl.files);
    setActiveFile(firstFile);
    setStatus('idle');
    setPreviewUrl('');
    onUpdate({ content: { ...block.content, template: key, files: tpl.files } });
  };

  const statusColors = { idle: '#6b7280', booting: '#f59e0b', installing: '#3b82f6', running: '#22c55e', error: '#ef4444' };
  const statusLabels = { idle: 'Ready', booting: 'Booting…', installing: 'Installing packages…', running: 'Running', error: 'Error' };
  const isLoading = status === 'booting' || status === 'installing';

  return (
    <div className="rounded-xl border border-app-border bg-[#0d0d0d] flex flex-col overflow-hidden group transition-all hover:border-app-border-strong">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-surface-bg border-b border-app-border">
        <div className="flex items-center gap-2">
          {/* Status dot */}
          <div className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: statusColors[status],
                boxShadow: status === 'running' ? `0 0 8px ${statusColors[status]}` : 'none',
              }}
            />
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{statusLabels[status]}</span>
          </div>
          <div className="w-px h-4 bg-app-border" />
          {/* Template selector */}
          {!readOnly && (
            <div className="flex items-center gap-1">
              {Object.entries(TEMPLATES).map(([key, tpl]) => (
                <button
                  key={key}
                  onClick={() => handleTemplateChange(key)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    templateKey === key ? 'bg-surface-hover' : 'text-gray-500 hover:text-gray-300'
                  }`}
                  style={{ color: templateKey === key ? tpl.color : undefined }}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowTerminal((t) => !t)}
            className={`flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider font-bold rounded transition-colors ${
              showTerminal ? 'text-[#d4c94a] bg-[#d4c94a]/10' : 'text-gray-500 hover:text-white hover:bg-surface-hover'
            }`}
          >
            <TerminalIcon size={11} /> Console
          </button>
          {previewUrl && (
            <>
              <button
                onClick={() => { if (iframeRef.current) iframeRef.current.src = previewUrl; }}
                className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-gray-500 hover:text-white hover:bg-surface-hover rounded transition-colors"
              >
                <RefreshCw size={11} /> Refresh
              </button>
              <button
                onClick={() => setExpandedPreview(true)}
                className="flex items-center gap-1.5 px-2 py-1 text-[10px] uppercase tracking-wider font-bold text-gray-500 hover:text-[#d4c94a] hover:bg-[#d4c94a]/10 rounded transition-colors"
                title="Expand preview to full screen"
              >
                <Maximize2 size={11} /> Expand
              </button>
            </>
          )}
          <button
            onClick={handleRun}
            disabled={isLoading}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50 ${
              status === 'running'
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-primary text-black hover:bg-[#cfcca8]'
            }`}
          >
            {isLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : status === 'running' ? (
              <Square size={12} />
            ) : (
              <Play size={12} />
            )}
            {status === 'running' ? 'Stop' : isLoading ? (status === 'booting' ? 'Booting…' : 'Installing…') : 'Run'}
          </button>
        </div>
      </div>

      {/* Split Pane: Editor | Preview */}
      <div className="flex flex-1" style={{ minHeight: '440px' }}>
        {/* Left: File tabs + Monaco editor */}
        <div
          className="flex flex-col border-r border-app-border"
          style={{ width: previewUrl ? '50%' : '100%', transition: 'width 0.3s ease' }}
        >
          {/* File Tabs */}
          <div className="flex overflow-x-auto border-b border-app-border bg-[#0a0a0a] custom-scrollbar" style={{ minHeight: '32px' }}>
            {Object.keys(files).map((fname) => (
              <button
                key={fname}
                onClick={() => setActiveFile(fname)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] whitespace-nowrap border-r border-app-border transition-colors flex-shrink-0 ${
                  activeFile === fname
                    ? 'bg-[#0d0d0d] text-primary-text border-b-2 border-b-[#d4c94a]'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-surface-hover'
                }`}
              >
                <Code2 size={10} />
                {fname}
              </button>
            ))}
          </div>
          {/* Monaco Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              path={activeFile}
              language={
                activeFile.endsWith('.jsx') || activeFile.endsWith('.tsx') || activeFile.endsWith('.js')
                  ? 'javascript'
                  : activeFile.endsWith('.ts')
                  ? 'typescript'
                  : activeFile.endsWith('.html')
                  ? 'html'
                  : activeFile.endsWith('.css')
                  ? 'css'
                  : activeFile.endsWith('.json')
                  ? 'json'
                  : 'javascript'
              }
              theme="note-dark"
              value={files[activeFile] || ''}
              onChange={handleFileChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'Consolas, "Cascadia Code", monospace',
                scrollBeyondLastLine: false,
                padding: { top: 12, bottom: 12 },
                automaticLayout: true,
                lineNumbersMinChars: 3,
                wordWrap: 'on',
                readOnly: readOnly,
              }}
            />
          </div>
        </div>

        {/* Right: Browser Preview */}
        {previewUrl && (
          <div className="flex flex-col" style={{ width: '50%' }}>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0a0a] border-b border-app-border">
              <Globe size={11} className="text-gray-500" />
              <span className="text-[10px] text-gray-500 font-mono truncate flex-1">{previewUrl}</span>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            </div>
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="flex-1 w-full border-0 bg-white"
              title="WebContainer Preview"
            />
          </div>
        )}
      </div>

      {/* Waiting for server */}
      {status === 'running' && !previewUrl && (
        <div className="flex items-center justify-center gap-2 py-4 border-t border-app-border text-gray-500 text-xs">
          <Loader2 size={13} className="animate-spin" />
          Waiting for dev server to bind to a port…
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {expandedPreview && previewUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col" style={{ backdropFilter: 'blur(4px)' }}>
          <div className="flex items-center justify-between px-4 py-2 bg-[#0a0a0a] border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Globe size={13} className="text-gray-400" />
              <span className="text-xs text-gray-400 font-mono">{previewUrl}</span>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
            <button
              onClick={() => setExpandedPreview(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <Minimize2 size={13} /> Exit Full Screen
            </button>
          </div>
          <iframe
            src={previewUrl}
            className="flex-1 w-full border-0 bg-white"
            title="WebContainer Preview (Fullscreen)"
          />
        </div>
      )}

      {/* Terminal Panel */}
      {showTerminal && (
        <div className="border-t border-app-border">
          <div className="flex items-center justify-between px-3 py-1.5 bg-sidebar-bg border-b border-app-border">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <TerminalIcon size={10} /> Console Output
            </span>
            <button onClick={() => setShowTerminal(false)} className="text-gray-600 hover:text-gray-300 text-xs transition-colors">
              Hide
            </button>
          </div>
          <div ref={terminalRef} style={{ height: '180px', padding: '4px', background: '#0d0d0d' }} />
        </div>
      )}
    </div>
  );
}
