# Attendance System — Starter

A working starter for digitizing handwritten attendance registers.

Stack: **Next.js (Pages Router) + TypeScript + React + Axios + MongoDB (Mongoose) + Tailwind CSS**, with cookie-based login.

## What's included

- Login page + JWT cookie auth (middleware protects every page/API route)
- Employees page — add/deactivate/delete staff
- Mark Attendance page — one-click check-in / check-out per employee, per day
- Reports page — filter attendance history by employee and date range
- Dashboard with today's headcount summary
- Mongoose models for `User`, `Employee`, `Attendance`
- A seed script to create your first login user

## 1. Install dependencies

Open this folder in VS Code, open a terminal in it, then run:

```bash
npm install
```

This pulls in everything listed in `package.json` — Next.js, React, TypeScript, Axios, Mongoose, Tailwind, bcryptjs, jose, etc. There's nothing else to `npx install` separately; it's all declared already.

## 2. Set up environment variables

```bash
cp .env.local.example .env.local
```

Then edit `.env.local`:

- `MONGODB_URI` — your MongoDB connection string (local `mongodb://localhost:27017/attendance`, or an Atlas URI)
- `JWT_SECRET` — any long random string (used to sign login sessions)
- `SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` / `SEED_ADMIN_NAME` — credentials for the first login user

## 3. Create your first login user

```bash
npm run seed:admin
```

This connects to MongoDB and creates one user from the `SEED_ADMIN_*` values in `.env.local`. Run it again later (with different values) any time you need another user.

## 4. Run it

```bash
npm run dev
```

Visit `http://localhost:3000`, log in with the seeded credentials, and go.

## Project layout

```
pages/               Next.js pages (routing is file-based)
  login.tsx
  index.tsx           dashboard
  employees.tsx
  attendance.tsx
  reports.tsx
  api/                API routes (also file-based routing)
    auth/             login, logout, me
    employees/         CRUD
    attendance/         check-in/out + history
models/               Mongoose schemas
lib/                  db connection, auth helpers, axios instance, useAuth hook
components/           Layout.tsx (nav bar)
middleware.ts         guards every route, redirects to /login if not authenticated
```

## Extending it

- Employees currently have `employeeId`, `name`, `department`, `position`. Add fields to `models/Employee.ts` and the form in `pages/employees.tsx`.
- Attendance status is `present | late | absent` — wire up an "absent" marking flow if you need to record no-shows explicitly.
- To add more login users through the UI instead of the seed script, build a small "Users" admin page that calls a new `/api/users` route (not included, to keep this starter minimal).
- Deploying: any host that runs Next.js (Vercel, Render, a VPS) works. Just set `MONGODB_URI` and `JWT_SECRET` as environment variables there too.
