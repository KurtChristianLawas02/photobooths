# Studio Booth

A modular, browser-based photobooth platform for touchscreen and kiosk workflows.

## Phase 1 status

The repository foundation is in place:

- Vite + React + TypeScript client shell
- Express + TypeScript API health endpoint
- Shared strict domain types
- PostgreSQL Prisma schema boundary
- Root workspace scripts
- Environment and upload-storage conventions

## Requirements

- Node.js 20+
- PostgreSQL 15+
- A modern browser with camera permission support

## Setup

```bash
npm install
Copy-Item .env.example .env
npm run typecheck
npm run build
```

Set `DATABASE_URL` in `.env` before running Prisma commands:

```bash
npm run db:generate
npm run db:migrate
```

Run the client and API together:

```bash
npm run dev
```

The client runs at `http://localhost:5173` (or the next available Vite port if 5173 is occupied); the API health check is available at `http://localhost:3001/api/health` by default.

Default admin login:

```text
Email: admin@studio.local
Password: admin123
```

Camera access requires `localhost` during development or HTTPS in a deployed environment. Browser permission must be granted to the site.

## Architecture direction

`client` owns kiosk UI, camera and editor services. `server` owns authentication, REST APIs, persistence, and storage adapters. `shared` contains contracts that can be consumed by both sides. Uploaded files are routed through a storage abstraction so local filesystem storage can later be replaced with cloud storage.
