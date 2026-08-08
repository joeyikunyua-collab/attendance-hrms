# Attendance System

A working starter for digitizing handwritten attendance registers, split into
two independent apps:

- **`admin/`** — Next.js (Pages Router) + TypeScript frontend
- **`api/`** — Node + Express + TypeScript backend (layered: routes → controllers → services → repositories → models), talking to MongoDB via Mongoose

## What's included

- Login page + JWT cookie auth
- Employees page — add/deactivate/delete staff
- Mark Attendance page — one-click check-in / check-out per employee, per day
- Reports page — filter attendance history by employee and date range
- Dashboard with today's headcount summary
- Mongoose models for `User`, `Employee`, `Attendance`, `LoginEvent`, `Notification`, `Counter`
- A seed script to create your first login user

## How the two apps talk to each other

`admin/next.config.js` proxies every `/api/*` request straight through to
the Express app (server-to-server, via the `API_URL` env var). The browser
only ever talks to the admin app's own origin, so there's no CORS or
cross-site cookie configuration needed — the httpOnly login cookie set by
the API is set (and read back) as if it came from `admin` itself.

## 1. Install dependencies

In two separate terminals:

```bash
cd api && npm install
cd admin && npm install
```

## 2. Set up environment variables

```bash
cd api && cp .env.example .env
cd admin && cp .env.local.example .env.local
```

`api/.env`:
- `MONGODB_URI` — your MongoDB connection string (local `mongodb://localhost:27017/attendance`, or an Atlas URI)
- `JWT_SECRET` — any long random string (used to sign login sessions)
- `PORT` — port the Express server listens on (default `4001`)
- `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` — credentials for the first login user

`admin/.env.local`:
- `JWT_SECRET` — **must match** `api/.env`'s value (the Next.js middleware verifies the session cookie locally, without a DB round trip, to gate page routes)
- `API_URL` — base URL of the running API, e.g. `http://localhost:4001`

## 3. Create your first login user

```bash
cd api && npm run seed:admin
```

This connects to MongoDB and creates one user from the `SEED_ADMIN_*` values in `api/.env`. Run it again later (with different values) any time you need another user.

## 4. Run it

```bash
cd api && npm run dev      # http://localhost:4001
cd admin && npm run dev    # http://localhost:3000
```

Visit `http://localhost:3000`, log in with the seeded credentials, and go.

## Project layout

```
admin/
  pages/                Next.js pages (routing is file-based)
    login.tsx  index.tsx (dashboard)  employees.tsx  attendance.tsx  reports.tsx
  components/            Layout.tsx (nav bar), panels, modals
  lib/                    axios instance, useAuth/useNotifications hooks, date helpers
  middleware.ts           page-route auth gating (redirects to /login if not authenticated)
  next.config.js          proxies /api/* to the API app

api/
  src/
    config/               env, db connection
    models/                Mongoose schemas
    repositories/           DB queries, one per model
    services/                business logic, calls repositories
    controllers/              req/res handling, calls services
    routes/                    HTTP → controller mapping
    middleware/                 auth (requireUser/requireAdmin), central error handler
    validation/                  zod request schemas
    utils/                        ApiError, asyncHandler, logger, dates, password/token helpers
    app.ts  server.ts
  scripts/createAdmin.ts   seed script
```

## Extending it

- Employees currently have `employeeId`, `name`, `department`, `designation`. Add fields to `api/src/models/Employee.ts`, the corresponding `api/src/validation/employee.validation.ts` schema, and the form in `admin/pages/employees.tsx`.
- Attendance status is `present | late | absent` — wire up an "absent" marking flow if you need to record no-shows explicitly.
- New API resources follow the existing pattern: a Mongoose model, a repository, a service, a controller, a route file mounted in `api/src/routes/index.ts`.
- Deploying: `admin` and `api` can be deployed independently to any Node host (Vercel/Render for `admin`, a VPS/Render/Fly for `api`). Set `API_URL` on `admin` to the deployed API's public URL, and keep `JWT_SECRET` identical on both.
