# Implementation Plan

## Architecture

- `client`: kiosk workflow, camera service, Zustand session state, Fabric.js editor, canvas rendering, offline cache, admin UI.
- `server`: Express REST API, JWT admin authentication, validation, upload endpoints, storage abstraction, Prisma access, logging.
- `shared`: strict contracts for templates, sessions, photos, camera devices, events, and settings.
- `uploads`: development filesystem storage only; production storage is selected behind the storage interface.

## Phases

1. **Foundation**: workspace, strict TypeScript, Vite client, Express API, Prisma schema, shared contracts.
2. **Admin and persistence**: JWT login/logout/me, bcrypt password handling, Prisma repositories, validation, protected routes, seed admin.
3. **Camera**: reusable camera service, device discovery, permission/error states, switching, capture, stream cleanup.
4. **Session workflow**: event/template selection, countdown, retake, multi-photo progress, session state machine.
5. **Composition**: template config loading, photo-slot fitting, filters, high-resolution canvas rendering, output formats.
6. **Editor**: Fabric.js canvas lifecycle, elements, properties, layers, history, guides, persisted JSON.
7. **Administration**: dashboard, template/frame/event/gallery/settings pages with real CRUD and loading/empty/error states.
8. **Delivery**: QR photo links, expiration, print preview/browser printing, future print-service boundary.
9. **Offline-first**: service worker, IndexedDB photo queue, local template cache, reconnect synchronization.
10. **Hardening**: tests, security headers/rate limits, performance profiling, camera/device verification, deployment docs.

## Phase 1 acceptance checks

- `npm install`
- `npm run typecheck`
- `npm run build`
- `npm run dev`
- `GET /api/health` returns `{ "status": "ok" }`
- Client loads at `http://localhost:5173`
