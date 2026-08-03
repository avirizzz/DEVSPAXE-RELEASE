-- User Profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notebooks
create table public.notebooks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Notes
create table public.notes (
  id uuid default uuid_generate_v4() primary key,
  notebook_id uuid references public.notebooks on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note Blocks (Text, Code, Diagrams)
create table public.blocks (
  id uuid default uuid_generate_v4() primary key,
  note_id uuid references public.notes on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  type text not null, -- 'text', 'code', 'diagram'
  content jsonb not null default '{}'::jsonb, -- Store text/code content or diagram state
  language text, -- For code blocks (e.g. 'javascript', 'python')
  order_index integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.notebooks enable row level security;
alter table public.notes enable row level security;
alter table public.blocks enable row level security;

-- Create Policies
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Users can CRUD own notebooks" on public.notebooks for all using (auth.uid() = user_id);
create policy "Users can CRUD own notes" on public.notes for all using (auth.uid() = user_id);
create policy "Users can CRUD own blocks" on public.blocks for all using (auth.uid() = user_id);

-- Create a trigger to automatically create a profile for a new user
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
