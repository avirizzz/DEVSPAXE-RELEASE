-- 1. Create note_collaborators table
create table if not exists public.note_collaborators (
  id uuid default uuid_generate_v4() primary key,
  note_id uuid references public.notes on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('viewer', 'editor')) default 'viewer',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(note_id, user_id)
);

-- Enable RLS on note_collaborators
alter table public.note_collaborators enable row level security;

-- Create security definer functions to prevent RLS infinite loops
create or replace function public.is_note_owner(check_note_id uuid, check_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.notes
    where id = check_note_id and user_id = check_user_id
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.is_note_collaborator(check_note_id uuid, check_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.note_collaborators
    where note_id = check_note_id and user_id = check_user_id
  );
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.is_note_editor(check_note_id uuid, check_user_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.note_collaborators
    where note_id = check_note_id and user_id = check_user_id and role = 'editor'
  );
end;
$$ language plpgsql security definer set search_path = public;

-- 2. Policies for note_collaborators
drop policy if exists "Owners can manage collaborators" on public.note_collaborators;
-- Owners can manage collaborators for their notes
create policy "Owners can manage collaborators" on public.note_collaborators for all using (
  public.is_note_owner(note_id, auth.uid())
);

drop policy if exists "Collaborators can view collaborators" on public.note_collaborators;
-- Collaborators can view themselves or other collaborators on the same note
create policy "Collaborators can view collaborators" on public.note_collaborators for select using (
  public.is_note_collaborator(note_id, auth.uid())
);

-- 3. Update Profiles Policy
-- Allow all authenticated users to read profiles (needed to search by email to add collaborators)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Authenticated users can view profiles" on public.profiles;
create policy "Authenticated users can view profiles" on public.profiles for select using (auth.role() = 'authenticated');

-- 4. Update Notes Policies
drop policy if exists "Users can CRUD own notes" on public.notes;
drop policy if exists "Owners can CRUD own notes" on public.notes;
-- Owners get ALL access
create policy "Owners can CRUD own notes" on public.notes for all using (auth.uid() = user_id);

drop policy if exists "Collaborators can view notes" on public.notes;
-- Collaborators (Viewers & Editors) get SELECT access
create policy "Collaborators can view notes" on public.notes for select using (
  public.is_note_collaborator(id, auth.uid())
);

drop policy if exists "Editors can update notes" on public.notes;
-- Collaborators (Editors only) get UPDATE access
create policy "Editors can update notes" on public.notes for update using (
  public.is_note_editor(id, auth.uid())
);

-- 5. Update Blocks Policies
drop policy if exists "Users can CRUD own blocks" on public.blocks;
drop policy if exists "Owners can CRUD own blocks" on public.blocks;
-- Owners get ALL access
create policy "Owners can CRUD own blocks" on public.blocks for all using (
  public.is_note_owner(note_id, auth.uid())
);

drop policy if exists "Collaborators can view blocks" on public.blocks;
-- Collaborators (Viewers & Editors) get SELECT access
create policy "Collaborators can view blocks" on public.blocks for select using (
  public.is_note_collaborator(note_id, auth.uid())
);

drop policy if exists "Editors can modify blocks" on public.blocks;
-- Collaborators (Editors only) get INSERT, UPDATE, DELETE access
create policy "Editors can modify blocks" on public.blocks for insert with check (
  public.is_note_editor(note_id, auth.uid())
);

drop policy if exists "Editors can update blocks" on public.blocks;
create policy "Editors can update blocks" on public.blocks for update using (
  public.is_note_editor(note_id, auth.uid())
);

drop policy if exists "Editors can delete blocks" on public.blocks;
create policy "Editors can delete blocks" on public.blocks for delete using (
  public.is_note_editor(note_id, auth.uid())
);
