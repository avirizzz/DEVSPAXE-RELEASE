const fs = require('fs');

const path = 'd:\\DEVSPAXE-main\\client\\src\\components\\Sidebar.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add roadmap props
content = content.replace(
  'viewMode,\n  onViewModeChange\n}) {',
  'viewMode,\n  onViewModeChange,\n  roadmaps,\n  setRoadmaps,\n  activeRoadmapId,\n  setActiveRoadmapId\n}) {'
);

// 2. Add roadmap to rename submit
content = content.replace(
  'const isNotebook = notebooks.some(nb => nb.id === editingId);',
  'const isNotebook = notebooks.some(nb => nb.id === editingId);\n      const isRoadmap = roadmaps.some(r => r.id === editingId);'
);
content = content.replace(
  `} else if (isNotebook) {
        await api.renameNotebook(editingId, editingValue.trim());
        setNotebooks(prev => prev.map(nb => nb.id === editingId ? { ...nb, title: editingValue.trim() } : nb));
      } else {`,
  `} else if (isNotebook) {
        await api.renameNotebook(editingId, editingValue.trim());
        setNotebooks(prev => prev.map(nb => nb.id === editingId ? { ...nb, title: editingValue.trim() } : nb));
      } else if (isRoadmap) {
        await api.renameRoadmap(editingId, editingValue.trim());
        setRoadmaps(prev => prev.map(r => r.id === editingId ? { ...r, title: editingValue.trim() } : r));
      } else {`
);

// 3. Add roadmap to delete
content = content.replace(
  `const handleDelete = async (id, type) => {
    try {
      if (type === 'subject') {`,
  `const handleDelete = async (id, type) => {
    try {
      if (type === 'subject') {`
);
content = content.replace(
  `} else if (type === 'notebook') {`,
  `} else if (type === 'roadmap') {
        await api.deleteRoadmap(id);
        setRoadmaps(prev => prev.map(r => r).filter(r => r.id !== id));
        if (activeRoadmapId === id) setActiveRoadmapId(null);
      } else if (type === 'notebook') {`
);

// 4. Update click handlers to fix the bug (setActiveNoteId -> set viewMode to editor)
content = content.replace(
  `onClick={() => { setActiveNotebookId(nb.id); setActiveNoteId(note.id); }}`,
  `onClick={() => { setActiveNotebookId(nb.id); setActiveNoteId(note.id); onViewModeChange('editor'); }}`
);

// 5. Add Roadmaps rendering inside renderNotebook
const mapIconsReplacement = `
            </div>
          ))}
          {(roadmaps || []).filter(r => r.notebook_id === nb.id).map(r => (
            <div
              key={r.id}
              className={\`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer group transition-colors \${
                activeRoadmapId === r.id && viewMode === 'roadmap' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-500 hover:text-primary-text hover:bg-surface-hover border border-transparent'
              }\`}
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
`;

content = content.replace(
  `              </div>
            </div>
          ))}`,
  mapIconsReplacement.trim()
);

// Replace "Add a note" button with a context menu dropdown approach, or just keep it simple.
// For now, I'll add "New Roadmap" button inside notebook context menu, or just as a small icon.
content = content.replace(
  `<button onClick={(e) => { e.stopPropagation(); handleCreateNote(nb.id); }} className="p-0.5 hover:text-primary" title="New Note">
            <FilePlus size={12} />
          </button>`,
  `<button onClick={(e) => { e.stopPropagation(); handleCreateNote(nb.id); }} className="p-0.5 hover:text-primary" title="New Note">
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
          </button>`
);

// 6. Add roadmaps rendering for activeSubjectId without a notebook
const subjectRoadmapsReplacement = `
              {notebooks.filter(nb => nb.subject_id === activeSubjectId).map(nb => renderNotebook(nb))}
              {(roadmaps || []).filter(r => r.subject_id === activeSubjectId && !r.notebook_id).map(r => (
                <div
                  key={r.id}
                  className={\`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs cursor-pointer group transition-colors \${
                    activeRoadmapId === r.id && viewMode === 'roadmap' ? 'bg-primary/10 text-primary border border-primary/20' : 'text-gray-400 hover:text-primary-text hover:bg-surface-hover border border-transparent'
                  }\`}
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
`;

content = content.replace(
  `{notebooks.filter(nb => nb.subject_id === activeSubjectId).map(nb => renderNotebook(nb))}`,
  subjectRoadmapsReplacement.trim()
);

content = content.replace(
  `<button onClick={() => handleCreateNotebook(activeSubjectId)} className="text-gray-500 hover:text-primary transition-colors" title="New Notebook in Subject">
                    <FolderPlus size={14} />
                  </button>`,
  `<button onClick={() => handleCreateNotebook(activeSubjectId)} className="text-gray-500 hover:text-primary transition-colors" title="New Notebook in Subject">
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
                  </button>`
);

// 7. Remove Roadmap global toggle
content = content.replace(
  `<button
            onClick={() => onViewModeChange && onViewModeChange(viewMode === 'roadmap' ? 'editor' : 'roadmap')}
            className={\`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all \${
              viewMode === 'roadmap'
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] border border-transparent'
            }\`}
          >
            <LayoutGrid size={12} /> Roadmap
          </button>`,
  ''
);
content = content.replace(
  `<button
            onClick={() => onViewModeChange && onViewModeChange(viewMode === 'roadmap' ? 'editor' : 'roadmap')}
            className={\`p-2 rounded-lg transition-colors \${viewMode === 'roadmap' ? 'text-primary bg-primary/10' : 'text-gray-500 hover:text-white hover:bg-white/5'}\`}
            title="Roadmap"
          >
            <LayoutGrid size={14} />
          </button>`,
  ''
);

fs.writeFileSync(path, content, 'utf8');
console.log('Sidebar updated');
