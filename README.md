# Dositej Kartice

Multi-tenant SaaS for managing contactless cards in a private academy bar. Students and employees pay for food and drinks with credits on NFC cards. Admins track balances, generate PDF reports, and close out monthly statements.

## 🚀 Quick Start

1. **Install dependencies**

```bash
npm install
```

2. **Environment setup**

```bash
cp .env.example .env
# Set DATABASE_URL, DIRECT_URL, AUTH_SECRET
```

3. **Initialize the database**

```bash
npx prisma db push
npm run db:seed
```

4. **Start development server**

```bash
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000). Default admin: `admin@dositej.rs` / `admin123`.

## 🏗️ Features

- 🔐 **Authentication** — NextAuth v5 with role-based access (Admin, Manager, Bartender)
- 🏢 **Multi-tenant** — Row-level isolation, ready for multiple organizations from day one
- 💳 **Card management** — NFC card registration, deactivation, lost card replacement
- 💰 **Credit system** — Top-ups, manual deductions, full audit trail on every change
- 🍷 **Bar terminal** — Scan card, pick items, charge in one click
- 📦 **Inventory tracking** — Optional per-item stock with low-stock warnings and auto-hide
- 📊 **Reports & PDF** — Monthly per-person reports with Serbian Latin support
- 📅 **Monthly close** — Automated end-of-month deduction from employee salaries
- 🌙 **Dark mode** — System-aware theme toggle
- ⏱️ **Auto-logout** — 10 min idle timeout for admin (bartenders stay logged in)

## 🛠️ Tech Stack

- **Framework** — Next.js 16 (App Router, Server Components, Server Actions)
- **Language** — TypeScript
- **Database** — PostgreSQL (Supabase) with Prisma 7
- **Auth** — NextAuth v5 (JWT)
- **UI** — Tailwind CSS 4, shadcn/ui, @dnd-kit
- **PDF** — @react-pdf/renderer
- **Hardware** — Python pyscard agent for ACR122U NFC reader (runs locally)

## 📋 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production build |
| `npm run lint` | Run ESLint |
| `npm run db:seed` | Seed database with demo data |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:load-test` | Generate load test data (5k people) |

## 🚢 Deployment

Optimized for Vercel. Set required env vars in dashboard, push to `main`, automatic deploy.

```bash
# Required env vars
DATABASE_URL    # Supabase pooler (port 6543, pgbouncer=true)
DIRECT_URL      # Supabase direct (port 5432)
AUTH_SECRET     # openssl rand -base64 32
AUTH_URL        # https://your-domain.vercel.app
AUTH_TRUST_HOST # true
```

Vercel cron handles automated monthly close (see `vercel.json`).

## 📄 License

Proprietary. All rights reserved.
