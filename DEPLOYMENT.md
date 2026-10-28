# PatchPath Universal - Vercel & Neon Deployment Guide

This guide describes how to deploy PatchPath Universal to Vercel with Neon PostgreSQL as the durable database.

---

## 1. Architecture Overview

- **Repository Root Project:** Single Vercel project rooted at the repository root.
- **Frontend:** Built with Vite (`pnpm run build` in `frontend/`) into `frontend/dist`. Served statically by Vercel's Edge Network at `/` and all client-side routes (`/login`, `/register`, etc.).
- **Backend API:** FastAPI application routed under `/api/v1` via `api/index.py` serverless entrypoint.
  - Shares the same origin in production (no cross-origin credentials or wildcard CORS).
  - Unknown `/api/*` paths return JSON 404 responses from FastAPI and never fall through to `index.html`.
- **Durable Database:** Neon Serverless PostgreSQL with connection pooling via PgBouncer (`postgresql+psycopg://`).
- **Local Development:** SQLite continues to work seamlessly with zero configuration when `PATCHPATH_DATABASE_URL` is omitted.
- **Serverless-Safe Simulations:** Educational simulation runs inside an authenticated `POST /api/v1/simulate/{run_id}` request, streaming Server-Sent Events (SSE) directly to the client while persisting execution status and logs in the database.

---

## 2. Environment Variables

Configure these in the **Vercel Project Settings -> Environment Variables**:

| Variable | Description | Example / Note |
|---|---|---|
| `PATCHPATH_DATABASE_URL` | Neon PostgreSQL connection string (pooled connection). | `postgresql://[user]:[password]@[host]-pooler.neon.tech/neondb?sslmode=require` (Auto-detected if using Vercel Neon Marketplace integration). |
| `PATCHPATH_SECRET_KEY` | High-entropy signing secret for session cookies. | Generate with `openssl rand -hex 32`. Startup fails if missing or unchanged in production. |
| `PATCHPATH_COOKIE_SECURE` | Enforces `Secure` flag on session cookies (`true` for HTTPS). | `true` |
| `PATCHPATH_FRONTEND_ORIGIN` | Allowed production origin for strict CORS and CSRF verification. | `https://your-project.vercel.app` (or custom domain). |
| `PATCHPATH_ENV` | Environment identifier. Set to `production` in production. | `production` |
| `PATCHPATH_ALLOW_DEMO_LOGIN` | Controls whether one-click demo login is allowed. | Defaults to `false` in production. In production, visitors use read-only demo fixtures or register individual accounts. |

> [!IMPORTANT]
> Never commit real database connection strings or signing secrets into Git, logs, chat, or AI prompts. Enter them directly into the Vercel dashboard.

---

## 3. Step-by-Step Vercel Setup

### Step 1: Import Repository
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New... -> Project** and import the GitHub repository.
3. Keep the **Root Directory** as `./` (repository root).
4. Vercel automatically detects the configuration in `vercel.json`:
   - Build Command: `cd frontend && pnpm install --frozen-lockfile && pnpm run build`
   - Output Directory: `frontend/dist`
   - Python Entrypoint: `api/index.py` (pinned to Python 3.12 via `.python-version`)

### Step 2: Connect Neon Postgres
1. In the Vercel Project dashboard, go to the **Storage** tab.
2. Select **Connect Store** -> **Neon** (via Vercel Marketplace).
3. Follow the prompts to create or connect a Neon Postgres database.
4. Neon automatically provisions environment variables (`POSTGRES_URL`, `DATABASE_URL`).
5. PatchPath automatically detects `POSTGRES_URL` and normalizes it to use the `psycopg` driver (`postgresql+psycopg://`). Alternatively, you can explicitly set `PATCHPATH_DATABASE_URL` to your Neon pooled connection string.

### Step 3: Configure Required Environment Variables
In **Settings -> Environment Variables**, add:
- `PATCHPATH_SECRET_KEY`: `<your-random-32-character-secret>`
- `PATCHPATH_COOKIE_SECURE`: `true`
- `PATCHPATH_ENV`: `production`
- `PATCHPATH_FRONTEND_ORIGIN`: `https://[your-project-name].vercel.app`

### Step 4: Run Database Migrations & Seed Demo Data
Before directing user traffic to the deployment, apply the versioned database schema and seed the initial public specimens:

From your local machine (or CI pipeline), execute:
```powershell
# Set your production database URL temporarily in your local shell
$env:PATCHPATH_DATABASE_URL = "postgresql+psycopg://[user]:[password]@[neon-host]-pooler.neon.tech/neondb?sslmode=require"

# Run versioned Alembic migrations
python backend/app/db/manage_db.py migrate

# Seed read-only demo specimens idempotently
python backend/app/db/manage_db.py seed
```

> [!NOTE]
> Database migrations and fixture seeding are intentionally decoupled from the serverless application runtime. They are NOT run on serverless cold starts, ensuring fast startup times and preventing concurrent DDL race conditions.

---

## 4. Verification & Acceptance Checklist

After deploying to Vercel:
1. **Health Check:**
   Visit `https://[your-project].vercel.app/api/v1/health`.
   Expect: `{"status":"ok","service":"patchpath-api"}` (Status 200).
2. **SPA Routing:**
   Visit `https://[your-project].vercel.app/` and client-side routes `/login`, `/register`.
   Expect: The application UI loads smoothly with theme and specimen viewers intact.
3. **API 404 Isolation:**
   Visit `https://[your-project].vercel.app/api/v1/nonexistent`.
   Expect: JSON response `{"detail":"Not Found"}` with HTTP 404, **not** the SPA `index.html`.
4. **Authentication & Cookies:**
   - Register a new account at `/register`.
   - Inspect the network response: session cookie `patchpath_session` must have `HttpOnly`, `SameSite=Lax`, and `Secure` attributes set.
   - The JWT token is never returned in the response JSON.
5. **Run Persistence & Isolation:**
   - Create an analysis or upskill an idea while signed in.
   - Refresh the page and open **Saved Runs**: the run persists in Neon Postgres.
   - Register or log in as a second user: confirm that User 2 cannot view or simulate User 1's runs.
6. **Serverless Streaming:**
   - Click **Run this plan** on any candidate plan.
   - Observe the 5 ordered simulation progress steps stream via SSE within the single POST request.
   - Refresh the page: the persisted run log remains intact and shows "COMPLETE".
7. **Public Demo Safety:**
   - Unauthenticated visitors can view all 5 specimens in read-only mode (`/api/v1/demos/{mode}`).
   - One-click demo login is disabled in production to prevent shared writable accounts.
   - Users are prompted to create their own accounts to save runs.

---

## 5. Preview-First Deployment & Rollback Strategy

### Preview-First Workflow
1. Push changes to a feature branch or pull request.
2. Vercel automatically creates an isolated **Preview Deployment** (e.g. `https://patchpath-git-[branch]-[user].vercel.app`).
3. Neon supports database branching: create an ephemeral Neon branch for the preview deployment to test schema changes in isolation without touching production data.
4. Verify all acceptance checks on the Preview URL.
5. Merge the pull request to `main` to trigger the production deployment.

### Instant Rollback
If an issue is detected in production:
1. Go to **Vercel Dashboard -> Deployments**.
2. Find the previous stable deployment.
3. Click the **...** menu -> **Promote to Production** (or **Rollback**).
4. Instant rollback takes effect in seconds across all Edge nodes with zero rebuild time.

---

## 6. Logs, Monitoring & Database Backups

### Vercel Function & Runtime Logs
- Open **Vercel Dashboard -> Logs**.
- Filter by function: `/api/index.py`.
- Filter by status codes (`4xx`, `5xx`) or search for runtime messages.
- Real-time function invocation latency, memory utilization, and cold starts are visible in the **Analytics** tab.

### Database Backups & Point-in-Time Recovery
- Neon Postgres automatically takes continuous WAL-based backups.
- In the **Neon Console**, navigate to **Branches -> Point in Time Restore**.
- You can restore the database to any second within your retention window without downtime.
