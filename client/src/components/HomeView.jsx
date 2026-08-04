import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Folder, FileText, Plus, ArrowRight, Sparkles,
  Clock, BookOpen, Code2, GitMerge, Zap, FolderOpen, Edit2, Trash2, Library
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useDialog } from './DialogProvider';

// ─────────────────────────────────────────────
// Animation Primitives (matching Landing.jsx)
// ─────────────────────────────────────────────
const ease = [0.16, 1, 0.3, 1];

function WordsPullUp({ text, className }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const words = text.split(' ');

  return (
    <div ref={ref} className={`inline-flex flex-wrap ${className || ''}`}>
      {words.map((word, i) => (
        <span key={i} className="overflow-hidden inline-block mr-[0.25em] last:mr-0">
          <motion.span
            className="inline-block"
            initial={{ y: 60, opacity: 0 }}
            animate={isInView ? { y: 0, opacity: 1 } : { y: 60, opacity: 0 }}
            transition={{ delay: i * 0.06, duration: 0.7, ease }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </div>
  );
}

function FadeSlideIn({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.8, ease }}
    >
      {children}
    </motion.div>
  );
}

function StaggerContainer({ children, staggerDelay = 0.08, className = '' }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } }
      }}
    >
      {children}
    </motion.div>
  );
}

function StaggerItem({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 24, scale: 0.96 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease } }
      }}
    >
      {children}
    </motion.div>
  );
}

// ─────────────────────────────────────────────
// Aurora Mesh Background (CSS-only, no canvas)
// ─────────────────────────────────────────────
function AuroraMesh() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Noise overlay, same as Landing */}
      <div className="absolute inset-0 noise-overlay opacity-[0.5] mix-blend-overlay" />

      {/* Gradient vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />

      {/* Animated aurora blobs */}
      <div className="aurora-blob aurora-blob-1" />
      <div className="aurora-blob aurora-blob-2" />
      <div className="aurora-blob aurora-blob-3" />
      <div className="aurora-blob aurora-blob-4" />

      <style>{`
        .aurora-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.12;
          will-change: transform;
        }
        .aurora-blob-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, var(--color-primary-hex) 0%, transparent 70%);
          top: -10%; right: -5%;
          animation: aurora1 22s ease-in-out infinite;
        }
        .aurora-blob-2 {
          width: 450px; height: 450px;
          background: radial-gradient(circle, #8b7355 0%, #5a4a3a 40%, transparent 70%);
          bottom: 5%; left: 10%;
          animation: aurora2 28s ease-in-out infinite;
        }
        .aurora-blob-3 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, #4a6741 0%, #2a3d25 40%, transparent 70%);
          top: 40%; left: 50%;
          animation: aurora3 25s ease-in-out infinite;
          opacity: 0.08;
        }
        .aurora-blob-4 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #6b5b3e 0%, transparent 60%);
          top: 60%; right: 20%;
          animation: aurora4 30s ease-in-out infinite;
          opacity: 0.06;
        }
        @keyframes aurora1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(-60px, 40px) scale(1.15); }
          50% { transform: translate(-20px, 80px) scale(0.9); }
          75% { transform: translate(40px, 20px) scale(1.05); }
        }
        @keyframes aurora2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -30px) scale(1.1); }
          66% { transform: translate(-30px, -60px) scale(0.95); }
        }
        @keyframes aurora3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 30px) scale(1.12); }
        }
        @keyframes aurora4 {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); }
          50% { transform: translate(30px, -40px) scale(1.08) rotate(10deg); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────
// Greeting
// ─────────────────────────────────────────────
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 5) return 'Late night coding';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

// ─────────────────────────────────────────────
// Stat Pill
// ─────────────────────────────────────────────
function StatPill({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center gap-3 bg-surface-bg border border-app-border rounded-full px-5 py-2.5 backdrop-blur-sm shadow-sm">
      <Icon size={13} className="text-primary/60" />
      <span className="text-primary text-sm font-medium font-mono">{value}</span>
      <span className="text-gray-500 text-[10px] uppercase tracking-widest">{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────
// Notebook Card (Cinematic)
// ─────────────────────────────────────────────
function NotebookCard({ notebook, noteCount, index, onSelect }) {
  const accents = ['var(--color-primary-hex)', '#a89878', '#7d9b72', '#8b9eb8', '#b89878', '#9b8bb8'];
  const accent = accents[index % accents.length];

  return (
    <motion.button
      onClick={() => onSelect(notebook.id)}
      className="group relative w-full text-left rounded-2xl overflow-hidden cursor-pointer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3 }}
    >
      {/* Card body */}
      <div className="relative bg-surface-bg backdrop-blur-xl border border-app-border rounded-2xl p-6 h-full
        group-hover:border-app-border-strong group-hover:bg-surface-hover transition-all duration-500 shadow-sm">

        {/* Top accent line */}
        <div
          className="absolute top-0 left-6 right-6 h-[1px] opacity-0 group-hover:opacity-100 transition-opacity duration-700"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}40, transparent)` }}
        />

        {/* Icon + Count */}
        <div className="flex items-start justify-between mb-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 group-hover:scale-110"
            style={{ backgroundColor: accent + '12', border: `1px solid ${accent}20` }}
          >
            <FolderOpen size={18} style={{ color: accent }} />
          </div>
          <span className="text-gray-600 text-[10px] font-mono tracking-wider">{String(noteCount).padStart(2, '0')} notes</span>
        </div>

        {/* Title */}
        <h3 className="text-primary-text text-base font-medium mb-1.5 truncate transition-colors duration-300">
          {notebook.title}
        </h3>
        <p className="text-gray-600 text-[10px] font-mono">
          {notebook.updated_at
            ? `Updated ${new Date(notebook.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            : 'Just created'}
        </p>

        {/* Hover CTA */}
        <div className="flex items-center gap-2 text-primary/60 mt-6 group-hover:text-primary group-hover:gap-3 transition-all duration-300">
          <span className="text-[11px] font-medium">Open notebook</span>
          <ArrowRight size={12} className="-rotate-45" />
        </div>

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: `linear-gradient(90deg, transparent, ${accent}30, transparent)` }}
        />
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────
// Recent Note Row
// ─────────────────────────────────────────────
function RecentNoteRow({ note, notebookTitle, onSelect }) {
  return (
    <motion.button
      onClick={onSelect}
      className="w-full group flex items-center gap-4 px-5 py-4 text-left hover:bg-surface-hover transition-all duration-300"
      whileHover={{ x: 4 }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-9 h-9 rounded-xl bg-surface-bg border border-app-border flex items-center justify-center shrink-0 group-hover:border-primary/20 group-hover:bg-primary/[0.04] transition-all duration-300 shadow-sm">
        <FileText size={14} className="text-gray-500 group-hover:text-primary transition-colors duration-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-primary-text text-sm truncate transition-colors duration-300">
          {note.title || 'Untitled Note'}
        </p>
        <p className="text-gray-600 text-[10px] font-mono truncate mt-0.5">
          {notebookTitle && <span className="text-gray-500">{notebookTitle}</span>}
          {notebookTitle && <span className="mx-1.5 text-gray-700">·</span>}
          {note.updated_at && new Date(note.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <ArrowRight size={14} className="text-gray-700 group-hover:text-primary transition-all duration-300 shrink-0" />
    </motion.button>
  );
}

// ─────────────────────────────────────────────
// Quick Action Card
// ─────────────────────────────────────────────
function QuickAction({ label, desc, icon: Icon, onClick, accent = 'var(--color-primary-hex)' }) {
  return (
    <motion.button
      onClick={onClick}
      className="group bg-surface-bg backdrop-blur-xl border border-app-border hover:border-app-border-strong hover:bg-surface-hover rounded-2xl p-5 text-left transition-all duration-500 cursor-pointer shadow-sm"
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110"
        style={{ backgroundColor: accent + '08', border: `1px solid ${accent}15` }}
      >
        <Icon size={16} style={{ color: accent }} className="group-hover:opacity-100 opacity-60 transition-opacity" />
      </div>
      <p className="text-primary-text text-sm font-medium transition-colors duration-300">{label}</p>
      <p className="text-gray-600 text-[10px] mt-1">{desc}</p>
    </motion.button>
  );
}

function SubjectCard({ subject, notebookCount, index, onSelect, onRename, onDelete }) {
  const { promptAsync, confirmAsync } = useDialog();
  return (
    <motion.div
      onClick={() => onSelect(subject.id)}
      className="group bg-surface-bg backdrop-blur-xl border border-app-border hover:bg-surface-hover hover:border-app-border-strong rounded-2xl p-4 flex items-center gap-4 text-left transition-all duration-500 cursor-pointer relative w-full shadow-sm"
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 transition-all duration-500 group-hover:scale-110 shadow-lg shadow-primary/5">
        <Library size={16} className="text-primary group-hover:opacity-100 opacity-80 transition-opacity" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-primary-text text-sm font-medium truncate transition-colors duration-300">{subject.title}</p>
        <p className="text-gray-500 text-[10px] uppercase tracking-wider mt-1">{notebookCount} {notebookCount === 1 ? 'notebook' : 'notebooks'}</p>
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 bg-surface-bg p-1 rounded-lg border border-app-border">
        <button
          onClick={async (e) => { e.stopPropagation(); const newTitle = await promptAsync('Rename Subject', 'Enter new title:', subject.title); if (newTitle) onRename(subject.id, newTitle); }}
          className="p-1.5 text-gray-500 hover:text-primary-text rounded-md hover:bg-surface-hover transition-colors"
          title="Rename"
        >
          <Edit2 size={13} />
        </button>
        <button
          onClick={async (e) => { e.stopPropagation(); const ok = await confirmAsync('Delete Subject', `Delete subject "${subject.title}"? Notebooks inside will NOT be deleted.`); if (ok) onDelete(subject.id); }}
          className="p-1.5 text-gray-500 hover:text-red-400 rounded-md hover:bg-red-500/10 transition-colors"
          title="Delete"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// MAIN HOME VIEW
// ═══════════════════════════════════════════════
export default function HomeView({ subjects = [], notebooks, session, activeSubjectId, onSelectSubject, onSelectNotebook, onCreateNotebook, onCreateSubject, onRenameSubject, onDeleteSubject, onSelectNote, onCreateNote }) {
  const { promptAsync, confirmAsync } = useDialog();
  const [recentNotes, setRecentNotes] = useState([]);
  const [notebookNoteCounts, setNotebookNoteCounts] = useState({});
  const [totalBlocks, setTotalBlocks] = useState(0);
  const greeting = useMemo(() => getGreeting(), []);
  const userName = session?.user?.user_metadata?.username || session?.user?.email?.split('@')[0] || 'developer';

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: recent } = await supabase
          .from('notes')
          .select('*, notebooks(title)')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(5);
        setRecentNotes(recent || []);

        const { data: allNotes } = await supabase
          .from('notes')
          .select('id, notebook_id')
          .eq('user_id', user.id);
        const counts = {};
        (allNotes || []).forEach(n => { counts[n.notebook_id] = (counts[n.notebook_id] || 0) + 1; });
        setNotebookNoteCounts(counts);

        const { count } = await supabase
          .from('blocks')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setTotalBlocks(count || 0);
      } catch (err) {
        console.error('HomeView fetch error:', err);
      }
    }
    fetchData();
  }, [notebooks]);

  const totalNotes = Object.values(notebookNoteCounts).reduce((a, b) => a + b, 0);
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
      {/* ── Scrollable Content ── */}
      <div className="relative z-10 flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto w-full px-8 md:px-12 pt-16 pb-20">

          {/* ── HERO: Big cinematic greeting ── */}
          <div className="mb-16">
            <FadeSlideIn delay={0}>
              <p className="text-primary/40 text-[10px] font-mono tracking-[0.3em] uppercase mb-6">
                {dateStr}
              </p>
            </FadeSlideIn>

            <WordsPullUp
              text={activeSubjectId ? (subjects.find(s => s.id === activeSubjectId)?.title || 'Subject') : `${greeting},`}
              className="text-5xl md:text-7xl font-medium leading-[0.9] tracking-[-0.04em] text-primary-text/80"
            />
            {!activeSubjectId && (
              <div className="mt-1">
                <WordsPullUp
                  text={userName}
                  className="text-5xl md:text-7xl font-medium leading-[0.9] tracking-[-0.04em] text-primary"
                />
              </div>
            )}

            <FadeSlideIn delay={0.6}>
              <p className="text-gray-500 text-sm mt-6 max-w-md leading-relaxed">
                {activeSubjectId ? 'Manage your notebooks and concepts for this subject.' : 'Your workspace is ready. Pick up where you left off, or start something new.'}
              </p>
            </FadeSlideIn>

            {/* Stat pills */}
            <FadeSlideIn delay={0.8}>
              <div className="flex flex-wrap items-center gap-3 mt-8">
                <StatPill label="notebooks" value={activeSubjectId ? notebooks.filter(n => n.subject_id === activeSubjectId).length : notebooks.length} icon={BookOpen} />
                <StatPill label="notes" value={totalNotes} icon={FileText} />
                <StatPill label="blocks" value={totalBlocks} icon={Code2} />
              </div>
            </FadeSlideIn>
          </div>

          {/* ── SUBJECTS & NOTEBOOKS ── */}
          <FadeSlideIn delay={1.0}>
            {activeSubjectId ? (
              subjects.filter(s => s.id === activeSubjectId).map((subject) => {
                const subjectNotebooks = notebooks.filter(nb => nb.subject_id === subject.id);
                return (
                  <div key={subject.id} className="mb-14">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-primary/40 rounded-full" />
                        <h2 className="text-[11px] font-bold text-gray-400 tracking-[0.2em] uppercase">
                          {subject.title}
                        </h2>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button
                          onClick={async () => {
                            const newTitle = await promptAsync('Rename Subject', 'Enter new title:', subject.title);
                            if (newTitle) onRenameSubject && onRenameSubject(subject.id, newTitle);
                          }}
                          className="flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-gray-500 hover:text-white transition-colors"
                          title="Rename Subject"
                        >
                          <Edit2 size={12} />
                        </motion.button>
                        <motion.button
                          onClick={async () => {
                            const ok = await confirmAsync('Delete Subject', `Delete subject "${subject.title}"? Notebooks inside will NOT be deleted.`);
                            if (ok) {
                              onDeleteSubject && onDeleteSubject(subject.id);
                            }
                          }}
                          className="flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.03] hover:bg-white/[0.08] text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 size={12} />
                        </motion.button>
                      </div>
                    </div>

                    {subjectNotebooks.length === 0 ? (
                      <div className="text-center py-8 border border-dashed border-white/[0.05] rounded-2xl bg-white/[0.01]">
                        <p className="text-xs text-gray-600 mb-3">No notebooks in this subject</p>
                        <button onClick={() => onCreateNotebook && onCreateNotebook(subject.id)} className="text-[10px] text-primary/60 hover:text-primary uppercase tracking-widest font-bold">
                          + Create Notebook
                        </button>
                      </div>
                    ) : (
                      <StaggerContainer staggerDelay={0.08} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {subjectNotebooks.map((nb, i) => (
                          <StaggerItem key={nb.id}>
                            <NotebookCard
                              notebook={nb}
                              noteCount={notebookNoteCounts[nb.id] || 0}
                              index={i}
                              onSelect={onSelectNotebook}
                            />
                          </StaggerItem>
                        ))}
                      </StaggerContainer>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="mb-14">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-5 bg-primary/40 rounded-full" />
                    <h2 className="text-[11px] font-bold text-gray-400 tracking-[0.2em] uppercase">Subjects</h2>
                  </div>
                </div>
                {subjects.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-white/[0.05] rounded-2xl bg-white/[0.01]">
                    <p className="text-xs text-gray-600 mb-3">No subjects created yet</p>
                    <button onClick={onCreateSubject} className="text-[10px] text-primary/60 hover:text-primary uppercase tracking-widest font-bold">
                      + Create Subject
                    </button>
                  </div>
                ) : (
                  <StaggerContainer staggerDelay={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subjects.map((subject, i) => (
                      <StaggerItem key={subject.id}>
                        <SubjectCard
                          subject={subject}
                          notebookCount={notebooks.filter(nb => nb.subject_id === subject.id).length}
                          index={i}
                          onSelect={onSelectSubject}
                          onRename={onRenameSubject}
                          onDelete={onDeleteSubject}
                        />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}
              </div>
            )}

            {/* Uncategorized Notebooks */}
            {!activeSubjectId && (() => {
              const uncategorized = notebooks.filter(nb => !nb.subject_id);
              if (uncategorized.length === 0 && subjects.length > 0) return null;
              
              return (
                <div className="mb-14">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-5 bg-gray-600 rounded-full" />
                      <h2 className="text-[11px] font-bold text-gray-400 tracking-[0.2em] uppercase">Uncategorized Notebooks</h2>
                    </div>
                  </div>

                  {uncategorized.length === 0 ? (
                    <FadeSlideIn delay={1.2}>
                      <motion.button
                        onClick={() => onCreateNotebook && onCreateNotebook()}
                        className="w-full border border-dashed border-app-border hover:border-primary/20 rounded-[2rem] py-16 text-center transition-all duration-500 group cursor-pointer bg-surface-bg hover:bg-surface-hover"
                        whileHover={{ scale: 1.005 }}
                      >
                        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-surface-bg border border-app-border flex items-center justify-center group-hover:border-primary/20 group-hover:bg-primary/[0.05] transition-all duration-500 shadow-sm">
                          <Sparkles size={28} className="text-gray-600 group-hover:text-primary transition-colors duration-500" />
                        </div>
                        <p className="text-primary-text text-lg font-medium transition-colors">Create your first notebook</p>
                        <p className="text-gray-600 text-xs mt-2">Start organizing your concepts and code</p>
                      </motion.button>
                    </FadeSlideIn>
                  ) : (
                    <StaggerContainer staggerDelay={0.08} className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {uncategorized.map((nb, i) => (
                        <StaggerItem key={nb.id}>
                          <NotebookCard
                            notebook={nb}
                            noteCount={notebookNoteCounts[nb.id] || 0}
                            index={i}
                            onSelect={onSelectNotebook}
                          />
                        </StaggerItem>
                      ))}
                    </StaggerContainer>
                  )}
                </div>
              );
            })()}
          </FadeSlideIn>

          {/* ── RECENT ACTIVITY ── */}
          {recentNotes.length > 0 && (
            <FadeSlideIn delay={1.3}>
              <div className="mb-14">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-1 h-5 bg-primary/20 rounded-full" />
                  <h2 className="text-[11px] font-bold text-gray-400 tracking-[0.2em] uppercase">Recent Activity</h2>
                </div>
                <div className="bg-surface-bg border border-app-border rounded-2xl overflow-hidden divide-y divide-app-border shadow-xl">
                  {recentNotes.map((note) => (
                    <RecentNoteRow
                      key={note.id}
                      note={note}
                      notebookTitle={note.notebooks?.title}
                      onSelect={() => onSelectNote(note.id, note.notebook_id)}
                    />
                  ))}
                </div>
              </div>
            </FadeSlideIn>
          )}

          {/* ── QUICK CREATE ── */}
          <FadeSlideIn delay={1.5}>
            <div className="pb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-5 bg-primary/10 rounded-full" />
                <h2 className="text-[11px] font-bold text-gray-400 tracking-[0.2em] uppercase">Quick Create</h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickAction
                  label="New Subject"
                  desc="Top level topics"
                  icon={Library}
                  onClick={onCreateSubject}
                  accent="#a89878"
                />
                <QuickAction
                  label="New Notebook"
                  desc="Organize your work"
                  icon={Folder}
                  onClick={() => onCreateNotebook && onCreateNotebook()}
                  accent="var(--color-primary-hex)"
                />
                <QuickAction
                  label="New Note"
                  desc="Write concepts & code"
                  icon={FileText}
                  onClick={() => onCreateNote && onCreateNote()}
                  accent="#a89878"
                />
                <QuickAction
                  label="Browse All"
                  desc="See everything"
                  icon={GitMerge}
                  onClick={() => notebooks.length > 0 && onSelectNotebook(notebooks[0].id)}
                  accent="#7d9b72"
                />
              </div>
            </div>
          </FadeSlideIn>

        </div>
      </div>
    </div>
  );
}
