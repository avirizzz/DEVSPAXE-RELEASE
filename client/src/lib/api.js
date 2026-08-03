import { supabase } from './supabase';

// =============================================
// SUBJECTS
// =============================================
export async function getSubjects() {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    if (error.code === '42P01') return []; // Table doesn't exist
    console.error('Error fetching subjects:', error);
    return [];
  }
  return data;
}

export async function createSubject(title) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('subjects')
    .insert({ title, user_id: user.id })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameSubject(id, title) {
  const { data, error } = await supabase
    .from('subjects')
    .update({ title })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSubject(id) {
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// =============================================
// NOTEBOOKS
// =============================================
export async function getNotebooks() {
  const { data, error } = await supabase
    .from('notebooks')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createNotebook(title, subjectId = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const insertData = { title, user_id: user.id };
  if (subjectId) insertData.subject_id = subjectId;
  const { data, error } = await supabase
    .from('notebooks')
    .insert(insertData)
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST204') {
      // Column 'subject_id' doesn't exist yet, fallback
      delete insertData.subject_id;
      const fallback = await supabase.from('notebooks').insert(insertData).select().single();
      if (fallback.error) throw fallback.error;
      return fallback.data;
    }
    throw error;
  }
  return data;
}

export async function renameNotebook(id, title) {
  const { data, error } = await supabase
    .from('notebooks')
    .update({ title })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteNotebook(id) {
  const { error } = await supabase
    .from('notebooks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// =============================================
// NOTES
// =============================================
export async function getNotes(notebookId) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('notebook_id', notebookId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function createNote(notebookId, title = 'Untitled Note') {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('notes')
    .insert({ notebook_id: notebookId, user_id: user.id, title })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export const renameNote = async (id, title) => {
  const { data, error } = await supabase
    .from('notes')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const toggleNotePrivacy = async (id, isPublic) => {
  const { data, error } = await supabase
    .from('notes')
    .update({ is_public: isPublic, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const deleteNote = async (id) => {
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export async function moveNote(noteId, newNotebookId) {
  const { data, error } = await supabase
    .from('notes')
    .update({ notebook_id: newNotebookId, updated_at: new Date().toISOString() })
    .eq('id', noteId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export const searchNotes = async (userId, query) => {
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .ilike('title', `%${query}%`);
    
  if (notesError) throw notesError;

  const { data: blocks, error: blocksError } = await supabase
    .from('blocks')
    .select('note_id, content')
    .eq('user_id', userId)
    .ilike('content->>text', `%${query}%`);

  if (blocksError) throw blocksError;

  const blockNoteIds = blocks.map(b => b.note_id);
  const titleNoteIds = notes.map(n => n.id);
  const combinedIds = [...new Set([...titleNoteIds, ...blockNoteIds])];

  if (combinedIds.length === 0) return [];

  const { data: results, error } = await supabase
    .from('notes')
    .select('*, notebooks(title)')
    .in('id', combinedIds)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return results;
}

// =============================================
// BLOCKS
// =============================================
export async function getBlocks(noteId) {
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .eq('note_id', noteId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
}

export async function getAllBlocksForUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('blocks')
    .select('id, note_id, type, content')
    .eq('user_id', user.id);
  if (error) throw error;
  return data;
}

export async function createBlock(noteId, type, orderIndex, content = {}, language = null) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('blocks')
    .insert({
      note_id: noteId,
      user_id: user.id,
      type,
      content,
      language,
      order_index: orderIndex
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBlock(id, updates) {
  const { data, error } = await supabase
    .from('blocks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBlock(id) {
  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function reorderBlocks(noteId, blockIds) {
  const updates = blockIds.map((id, index) => ({
    id,
    order_index: index,
    updated_at: new Date().toISOString()
  }));
  for (const u of updates) {
    await supabase
      .from('blocks')
      .update({ order_index: u.order_index, updated_at: u.updated_at })
      .eq('id', u.id);
  }
}

// ==========================================
// PUBLIC APIs (No Authentication Required)
// ==========================================

export const getPublicNote = async (noteId) => {
  const { data, error } = await supabase
    .from('notes')
    .select('*, profiles(email)')
    .eq('id', noteId)
    .eq('is_public', true)
    .single();
  if (error) throw error;
  return data;
};

export const getPublicBlocks = async (noteId) => {
  const { data, error } = await supabase
    .from('blocks')
    .select('*')
    .eq('note_id', noteId)
    .order('order_index', { ascending: true });
  if (error) throw error;
  return data;
};

// =============================================
// ROADMAPS
// =============================================
export async function getRoadmaps() {
  const { data, error } = await supabase
    .from('roadmaps')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    if (error.code === '42P01') return [];
    console.error('Error fetching roadmaps:', error);
    return [];
  }
  return data;
}

export async function createRoadmap(title, subjectId, notebookId, nodes = [], edges = []) {
  const { data: { user } } = await supabase.auth.getUser();
  const insertData = { title, nodes, edges, user_id: user.id };
  if (subjectId) insertData.subject_id = subjectId;
  if (notebookId) insertData.notebook_id = notebookId;
  const { data, error } = await supabase
    .from('roadmaps')
    .insert(insertData)
    .select()
    .single();
  if (error) {
    if (error.code === 'PGRST204' || error.message?.includes('subject_id')) {
      delete insertData.subject_id;
      const fallback = await supabase.from('roadmaps').insert(insertData).select().single();
      if (fallback.error) throw fallback.error;
      return fallback.data;
    }
    throw error;
  }
  return data;
}

export async function updateRoadmap(id, nodes, edges) {
  const { data, error } = await supabase
    .from('roadmaps')
    .update({ nodes, edges })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function renameRoadmap(id, title) {
  const { data, error } = await supabase
    .from('roadmaps')
    .update({ title })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoadmap(id) {
  const { error } = await supabase
    .from('roadmaps')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// =============================================
// COLLABORATORS
// =============================================
export async function getCollaborators(noteId) {
  const { data, error } = await supabase
    .from('note_collaborators')
    .select('*, profiles(email)')
    .eq('note_id', noteId)
    .order('created_at', { ascending: true });
  if (error) {
    if (error.code === '42P01') return []; // Table doesn't exist yet
    throw error;
  }
  return data;
}

export async function addCollaborator(noteId, email, role = 'viewer') {
  // 1. Find user by email
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .limit(1);
  if (profileError) throw profileError;
  if (!profiles || profiles.length === 0) throw new Error('User not found');
  
  const userId = profiles[0].id;
  
  // 2. Insert into note_collaborators
  const { data, error } = await supabase
    .from('note_collaborators')
    .insert({ note_id: noteId, user_id: userId, role })
    .select('*, profiles(email)')
    .single();
    
  if (error) {
    if (error.code === '23505') throw new Error('User is already a collaborator');
    throw error;
  }
  return data;
}

export async function removeCollaborator(noteId, userId) {
  const { error } = await supabase
    .from('note_collaborators')
    .delete()
    .eq('note_id', noteId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function updateCollaboratorRole(noteId, userId, role) {
  const { data, error } = await supabase
    .from('note_collaborators')
    .update({ role })
    .eq('note_id', noteId)
    .eq('user_id', userId)
    .select('*, profiles(email)')
    .single();
  if (error) throw error;
  return data;
}

export async function getSharedNotes() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  
  // Fetch notes where user is a collaborator
  const { data, error } = await supabase
    .from('note_collaborators')
    .select('note_id, role, notes(*, notebooks(title))')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
    
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  
  // Flatten data
  return data.map(item => ({
    ...item.notes,
    collaborator_role: item.role
  }));
}
