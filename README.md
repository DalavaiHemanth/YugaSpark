# Yuga Spark — Hackathon Club Hub

A modern hackathon club management platform for RGMCET students and admins.

## Tech Stack

- **Frontend**: React 19, TanStack Router, TanStack Start (SSR)
- **Styling**: Tailwind CSS v4
- **Backend / DB**: Supabase (Postgres + Auth + Storage)
- **Email**: Resend
- **Build**: Vite + Bun

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/DalavaiHemanth/YugaSpark.git
cd YugaSpark
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in your values from [supabase.com/dashboard](https://supabase.com/dashboard) → Settings → API.

### 3. Install dependencies

```bash
bun install
```

### 4. Run the dev server

```bash
bun dev
```

App runs at `http://localhost:5173`

## Features

- 🏆 Hackathon registration & management
- 📊 Leaderboard with per-event rankings
- 👥 Squad finder
- 📋 Notice board
- 🎓 Certificate downloads
- 📬 Bulk email to all members
- 🔐 Admin console (members, results, insights, audit log)
- 📱 Mobile-responsive design

## Environment Variables

See `.env.example` for all required variables. Key ones:

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only) |
| `RESEND_API_KEY` | Resend API key for emails |
