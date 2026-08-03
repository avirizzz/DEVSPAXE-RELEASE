import React, { useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ThemeContext } from '../App';
import Sidebar from '../components/Sidebar';
import NoteEditor from '../components/NoteEditor';
import HomeView from '../components/HomeView';
import RoadmapView from '../components/RoadmapView';
import GraphView from '../components/GraphView';
import SettingsView from '../components/SettingsView';
import AppBackground from '../components/AppBackground';
import * as api from '../lib/api';

export default function Dashboard({ session }) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [subjects, setSubjects] = useState([]);
  const [notebooks, setNotebooks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [activeNotebookId, setActiveNotebookId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState('editor'); // editor | roadmap | graph | settings
  const [allNotes, setAllNotes] = useState([]); // All notes across all notebooks for internal linking
  const [noteStatuses, setNoteStatuses] = useState({}); // { noteId: 'todo' | 'inprogress' | 'done' }
  const [roadmaps, setRoadmaps] = useState([]);
  const [activeRoadmapId, setActiveRoadmapId] = useState(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Load all notes across notebooks for internal linking
  useEffect(() => {
    async function fetchAllNotes() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('notes')
          .select('id, title, notebook_id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });
        setAllNotes(data || []);
      } catch (err) {
        console.error('Failed to fetch all notes:', err);
      }
    }
    fetchAllNotes();
  }, [notes, notebooks]);

  useEffect(() => {
    api.getRoadmaps().then(data => {
      setRoadmaps(data);
      if (data.length > 0) setActiveRoadmapId(data[0].id);
    });
  }, []);

  // Load note statuses from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('noteStatuses');
    if (stored) {
      try { setNoteStatuses(JSON.parse(stored)); } catch(e) {}
    }
  }, []);

  const handleUpdateNoteStatus = useCallback((noteId, status) => {
    setNoteStatuses(prev => {
      const next = { ...prev, [noteId]: status };
      localStorage.setItem('noteStatuses', JSON.stringify(next));
      return next;
    });
  }, []);

  const activeNote = notes.find(n => n.id === activeNoteId);
  const activeNotebook = notebooks.find(nb => nb.id === activeNotebookId);

  const handleTitleChange = useCallback((newTitle) => {
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, title: newTitle } : n));
  }, [activeNoteId]);

  const handlePrivacyChange = useCallback((isPublic) => {
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, is_public: isPublic } : n));
  }, [activeNoteId]);

  // Home page: navigate to a notebook
  const handleHomeSelectNotebook = useCallback((notebookId, createNote = false) => {
    setActiveNotebookId(notebookId);
    setActiveNoteId(null);
    setViewMode('editor');
    
    const nb = notebooks.find(n => n.id === notebookId);
    if (nb && nb.subject_id) {
      setActiveSubjectId(nb.subject_id);
    } else {
      setActiveSubjectId(null);
    }

    api.getNotes(notebookId).then(data => {
      setNotes(data);
      if (createNote && data.length === 0) {
        api.createNote(notebookId).then(note => {
          setNotes([note]);
          setActiveNoteId(note.id);
        });
      }
    });
  }, [notebooks]);

  // Navigate directly to a note (from home, internal links, or roadmap)
  const handleSelectNote = useCallback((noteId, notebookId) => {
    setActiveNotebookId(notebookId);
    setActiveNoteId(noteId);
    setViewMode('editor');
    
    const nb = notebooks.find(n => n.id === notebookId);
    if (nb && nb.subject_id) {
      setActiveSubjectId(nb.subject_id);
    } else {
      setActiveSubjectId(null);
    }

    api.getNotes(notebookId).then(data => setNotes(data));
  }, [notebooks]);

  // Home page: create a notebook
  const handleHomeCreateNotebook = useCallback(async (subjectId = null) => {
    try {
      const nb = await api.createNotebook('New Notebook', subjectId);
      setNotebooks(prev => [...prev, nb]);
      setActiveNotebookId(nb.id);
      setActiveNoteId(null);
      setNotes([]);
      if (subjectId) setActiveSubjectId(subjectId);
    } catch (err) {
      console.error('Failed to create notebook:', err);
    }
  }, []);

  const handleHomeCreateNote = useCallback(async () => {
    try {
      let nbId = null;
      if (activeNotebookId) {
        nbId = activeNotebookId;
      } else if (notebooks.length > 0) {
        nbId = notebooks[0].id;
      } else {
        const nb = await api.createNotebook('Uncategorized Notes');
        setNotebooks(prev => [...prev, nb]);
        nbId = nb.id;
      }
      
      const note = await api.createNote(nbId, 'New Note');
      handleSelectNote(note.id, nbId);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  }, [activeNotebookId, notebooks, handleSelectNote]);

  // Home page: create a subject
  const handleHomeCreateSubject = useCallback(async () => {
    try {
      const sub = await api.createSubject('New Subject');
      setSubjects(prev => [...prev, sub]);
    } catch (err) {
      console.error('Failed to create subject:', err);
    }
  }, []);

  const handleHomeRenameSubject = useCallback(async (id, newTitle) => {
    try {
      const updated = await api.renameSubject(id, newTitle);
      setSubjects(prev => prev.map(s => s.id === id ? updated : s));
    } catch (err) {
      console.error('Failed to rename subject:', err);
    }
  }, []);

  const handleHomeDeleteSubject = useCallback(async (id) => {
    try {
      await api.deleteSubject(id);
      setSubjects(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      console.error('Failed to delete subject:', err);
    }
  }, []);

  const handleGoHome = useCallback(() => {
    setActiveNoteId(null);
    setViewMode('editor');
  }, []);

  // Determine which view to show
  const renderMainView = () => {
    if (viewMode === 'graph') {
      return (
        <GraphView
          allNotes={allNotes}
          onSelectNote={handleSelectNote}
          onClose={() => setViewMode('editor')}
        />
      );
    }

    if (viewMode === 'roadmap') {
      return (
        <RoadmapView
          roadmaps={roadmaps}
          setRoadmaps={setRoadmaps}
          activeRoadmapId={activeRoadmapId}
          setActiveRoadmapId={setActiveRoadmapId}
          notes={allNotes}
          onSelectNote={handleSelectNote}
          noteStatuses={noteStatuses}
          onUpdateStatus={handleUpdateNoteStatus}
          onClose={() => setViewMode('editor')}
        />
      );
    }

    if (viewMode === 'settings') {
      return <SettingsView session={session} onClose={() => setViewMode('editor')} />;
    }

    if (activeNoteId) {
      return (
        <NoteEditor
          noteId={activeNoteId}
          noteTitle={activeNote?.title}
          notebookTitle={activeNotebook?.title}
          isPublic={activeNote?.is_public}
          onTitleChange={handleTitleChange}
          onPrivacyChange={handlePrivacyChange}
          allNotes={allNotes}
          onNavigateToNote={handleSelectNote}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      );
    }

    return (
      <HomeView
        subjects={subjects}
        setSubjects={setSubjects}
        notebooks={notebooks}
        session={session}
        activeSubjectId={activeSubjectId}
        onSelectSubject={setActiveSubjectId}
        onSelectNotebook={handleHomeSelectNotebook}
        onCreateNotebook={handleHomeCreateNotebook}
        onCreateSubject={handleHomeCreateSubject}
        onCreateNote={handleHomeCreateNote}
        onRenameSubject={handleHomeRenameSubject}
        onDeleteSubject={handleHomeDeleteSubject}
        onSelectNote={handleSelectNote}
      />
    );
  };

  return (
    <div className="flex h-screen text-primary-text overflow-hidden selection:bg-primary/30 relative bg-black">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AppBackground forceVideo={viewMode === 'editor' && !activeNoteId} />
      </div>
      <div className="flex h-full w-full relative z-10">
        <Sidebar
          session={session}
          theme={theme}
          toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          subjects={subjects}
          setSubjects={setSubjects}
          activeSubjectId={activeSubjectId}
          setActiveSubjectId={setActiveSubjectId}
          notebooks={notebooks}
          setNotebooks={setNotebooks}
          activeNotebookId={activeNotebookId}
          setActiveNotebookId={setActiveNotebookId}
          activeNoteId={activeNoteId}
          setActiveNoteId={setActiveNoteId}
          notes={notes}
          setNotes={setNotes}
          onLogout={handleLogout}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onGoHome={handleGoHome}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        {renderMainView()}
      </div>
    </div>
  );
}
