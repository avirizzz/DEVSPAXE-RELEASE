# note.dev

A learning-focused programming notebook platform for developers.

## Features

- **Authentication** — Sign up, log in, and get a private workspace via Supabase Auth
- **Notebooks & Notes** — Create, rename, delete, and organize notebooks and notes
- **Block-based Editor** — Add text blocks (headings, paragraphs, bullets), code blocks, and diagram blocks
- **Code Execution** — Run JavaScript in-browser, Python & C++ via Piston API
- **HTML/CSS Preview** — Live preview for web development learning
- **9 Diagram Templates** — Stack, Queue, Array, Linked List, Tree, Graph, Sliding Window, Two Pointers, Heap
- **Autosave** — All changes are automatically saved to Supabase
- **Search** — Full-text search across note titles and content
- **Dark Mode** — Toggle between light and dark themes
- **Move Notes** — Move notes between notebooks
- **Row Level Security** — Complete data isolation per user

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS + Framer Motion
- **Backend:** Node.js + Express (code execution proxy)
- **Database/Auth:** Supabase (PostgreSQL + Auth + RLS)
- **Code Execution:** Piston API (free, lightweight)

## Setup

### 1. Clone and Install

```bash
# Client
cd client
npm install

# Server
cd ../server
npm install
```

### 2. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Get your **Project URL** and **anon key** from Settings → API Keys

### 3. Environment Variables

Create `client/.env`:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run Locally

```bash
# Terminal 1 — Frontend
cd client && npm run dev

# Terminal 2 — Backend
cd server && node index.js
```

Frontend: http://localhost:5173  
Backend: http://localhost:5001

## Deployment (Vercel)

### Frontend (Vercel)
1. Push the `client/` folder to a Git repo
2. Connect to Vercel
3. Set build command: `npm run build`
4. Set output directory: `dist`
5. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`

### Backend (Vercel Serverless or Render)
1. Push `server/` to its own repo or use Vercel serverless functions
2. Set environment variables as needed

## Project Structure

```
note.dev/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx        # Notebook/note navigation
│   │   │   ├── NoteEditor.jsx     # Main editor with blocks
│   │   │   ├── TextBlock.jsx      # Rich text block
│   │   │   ├── CodeBlock.jsx      # Code editor + runner
│   │   │   └── DiagramBlock.jsx   # 9 diagram templates
│   │   ├── lib/
│   │   │   ├── supabase.js        # Supabase client
│   │   │   ├── api.js             # CRUD operations
│   │   │   └── codeRunner.js      # Code execution engine
│   │   ├── pages/
│   │   │   ├── Landing.jsx        # Landing page
│   │   │   ├── Auth.jsx           # Login/signup
│   │   │   └── Dashboard.jsx      # Main workspace
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env
│   └── tailwind.config.js
├── server/
│   └── index.js                   # Express + Piston API
└── supabase/
    └── schema.sql                 # Database schema + RLS
```
