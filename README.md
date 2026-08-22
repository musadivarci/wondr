# wondR — Personal Learning OS

> **I WONDER HOW THIS WORKS.**

wondR is a personal learning and knowledge-retention system designed around one idea: learning should leave a trace.

Instead of treating notes as static documents, wondR connects topics, reading sessions, highlights, study items and learning history into a lightweight personal knowledge workflow.

## Why this project exists

Most note-taking tools are good at storing information. wondR is being built to answer a different question:

**What did I learn, what still needs work, and how is my knowledge evolving over time?**

The project explores a practical learning architecture where topics can be studied, connected, revisited and turned into an explicit learning path.

## Core concepts

- Topic-based personal knowledge base
- Focused reading / study view
- Text highlighting and “study later” capture
- Notes attached to learning context
- Parent / child topic relationships
- Learning paths and knowledge-map concepts
- Study history and revisit tracking
- Mobile-first interaction model

## Tech stack

- **React 19**
- **TypeScript**
- **Vite**
- **Supabase**
- **PostgreSQL / RLS**
- **Vercel** deployment workflow

## Architecture

The frontend is built as a modular React application. Supabase provides persistent data storage and authentication, with Row Level Security used to keep user data isolated.

The project intentionally avoids making an LLM the center of the learning process. AI can assist the workflow, but the learner remains responsible for building and maintaining the knowledge structure.

## Local development

```bash
npm install
npm run dev
```

## Supabase setup

1. Run `supabase/schema.sql` from the Supabase SQL Editor.
2. Copy `.env.example` to `.env`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Enable the Email provider under Supabase Authentication.

Only the public anon key belongs in the frontend. Never expose a `service_role` key.

## Status

wondR is an actively evolving personal software project focused on learning systems, information architecture and human-AI assisted knowledge work.

---

**Built as a real working system, not a note-taking demo.**