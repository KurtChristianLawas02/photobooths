# Studio Booth

A browser-based photobooth system for touchscreen, kiosk, and mobile workflows. Studio Booth captures photos at the camera's best available resolution, composes them into physical print templates, and delivers high-resolution downloads, prints, and QR-linked photo pages.

## Current capabilities

- Live camera preview with device selection and native camera-resolution capture
- Countdown capture with multi-photo sessions and try-again flow
- Portrait and landscape template selection
- Physical print sizes with centralized dimensions:
	- 2 × 6: `1200 × 3600 px`
	- 4 × 6: `2400 × 3600 px`
	- 5 × 7: `3000 × 4200 px`
	- 6 × 8: `3600 × 4800 px`
- Proportional `cover` and `contain` photo-slot rendering with focal positioning and clipping
- High-resolution composition using the selected template's actual pixel canvas
- JPEG and PNG output with configurable JPEG quality
- 300 DPI and 600 DPI settings
- Themed styles including Birthday Pop, Wedding Romance, Graduation, Neon Party, Retro Film, Golden Gala, Poolside, Purple Night, and Tailgate
- Birthday decorations with balloons, confetti, celebration colors, header, and footer text
- Review screen with all captured photos and live style previews
- Print preview showing physical size, resolution, and orientation
- Browser printing and high-resolution digital download
- QR publishing with a mobile photo page and high-resolution download
- Admin output settings for print size, orientation, DPI, format, quality, and PNG availability
- Fabric.js template editor with scaled preview and saved high-resolution slot coordinates
- Shared template validation for dimensions, aspect ratio, DPI, and orientation

## Requirements

- Node.js 20+
- PostgreSQL 15+
- A modern browser with camera permission support
- HTTPS for camera access outside `localhost`

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

For phone testing on the same network, use the Vite network address shown in the terminal. For tunnel access, start ngrok against the active Vite port. Vite is configured to allow ngrok hostnames and proxy `/api` and `/photos` requests to the API.

## Deploying to Vercel

The repository includes `vercel.json` for deploying the Vite client from `client/dist`. Vercel should use the repository root as the project root and the checked-in build configuration; do not set the Vercel build or start command to `npm run dev`.

The build command is:

```bash
npm run build
```

Authentication requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Add both variables to Vercel Project Settings > Environment Variables for Production, then redeploy because Vite embeds `VITE_` variables at build time. Use only the public publishable key in the browser, never a Supabase service-role key.

To allow signups to use the app immediately without email confirmation, open the Supabase Dashboard and go to Authentication > Providers > Email, then turn off **Confirm email**. This is a Supabase project setting; it cannot be enabled safely from the browser with the publishable key.

## Admin dashboard setup

The protected admin area is available at `/admin`. Apply `supabase/migrations/202609200001_admin_foundation.sql`, `supabase/migrations/202609200003_downloads_and_settings.sql`, and `supabase/migrations/202609200004_templates.sql` in the Supabase SQL Editor, create the first admin user through Supabase Auth, then promote that account with the `update public.profiles set role = 'super_admin' ...` statement at the end of the migration. Admin access is checked against `public.profiles` and enforced by RLS; changing the URL alone is not sufficient. Analytics, Settings, and Templates read from Supabase, and completed downloads are stored in the `photobooth-downloads` bucket and shown at `/downloads`.

If a deployment URL shows `DEPLOYMENT_NOT_FOUND`, that specific Vercel deployment is no longer available. Open the latest successful deployment URL after pushing the fix.
This builds `shared` before the client and server, which is required because both workspaces import `@photobooth/shared` from its generated `dist` directory. The Express API is a separate long-running service and should be deployed separately, then configured through `VITE_API_URL` and `CLIENT_URL`. The Vercel client deployment by itself cannot run the local Express listener or provide durable PostgreSQL/photo storage.

Default admin login:

```text
Email: admin@studio.local
Password: admin123
```

Camera access requires `localhost` during development or HTTPS in a deployed environment. Browser permission must be granted to the site.

## Booth workflow

1. Select a physical print size and orientation.
2. Choose a compatible template.
3. Start the camera and capture the required photos.
4. Review the complete set and choose a themed style.
5. Open the print preview, download the high-resolution layout, print it, or publish it through QR.
6. Use **Try again** to discard the current set and capture a new session.

Portrait templates produce portrait print canvases. Larger portrait templates can contain duplicated vertical strips, while 2 × 6 templates use a single strip. Landscape templates are only used after explicitly selecting Landscape.

## Output and rendering

Camera images remain at their native capture resolution until composition. The renderer then proportionally crops or contains each image inside the configured template slot without stretching it. Final output uses the actual template canvas, not the scaled editor preview.

Default output settings:

```text
Print size: 4 × 6
Orientation: Portrait
Canvas: 2400 × 3600 px
DPI: 300
Format: JPEG
Quality: 95%
```

## Useful commands

```bash
npm run dev
npm run typecheck
npm run build
npm run lint
npm run test
npx prisma validate --schema server/prisma/schema.prisma
```

The test suite covers the centralized print-size catalog and portrait/landscape template validation.

## Architecture direction

`client` owns kiosk UI, camera and editor services. `server` owns authentication, REST APIs, persistence, and storage adapters. `shared` contains contracts that can be consumed by both sides. Uploaded files are routed through a storage abstraction so local filesystem storage can later be replaced with cloud storage.

The current development API keeps published photos, settings, and seed templates in memory. Prisma schema and validation are included for the persistence migration path; production deployment should connect the repositories and storage layer to PostgreSQL and durable file/object storage.
