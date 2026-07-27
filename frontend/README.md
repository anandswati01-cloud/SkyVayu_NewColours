# SkyVayu Frontend

React + Vite single-page app for the SkyVayu charter aviation platform.

## Stack

- **Build:** Vite
- **UI:** React 19 + React Router 7
- **State:** Zustand
- **Auth/data:** Supabase JS (browser session) + the SkyVayu REST API
- **Lint:** Oxlint

---

## Configuration

All environment access goes through **`src/config/env.js`**, which is the single
source of truth. No component reads `import.meta.env` directly — import the
frozen config instead:

```js
import { config } from '../config/env'

fetch(`${config.API_URL}/api/queries`)
```

> ⚠ **Everything in a `VITE_*` variable is public.**
> Vite inlines these into the JavaScript bundle in plain text, so anyone can
> read them in devtools. Only publishable values belong here — the Supabase
> **anon** key is fine (row level security constrains it); a service role key,
> a Razorpay key secret, or a JWT secret is not. `src/config/env.js` throws at
> startup if `VITE_SUPABASE_SERVICE_ROLE_KEY` is ever defined.

A build with missing required variables fails loudly on load with a message
naming them, rather than silently pointing the live site at `localhost`.

Variables are inlined **at build time**, not read at runtime — changing one in
the hosting dashboard requires a redeploy, not just a restart.

Every variable is documented in [`.env.example`](.env.example).

---

## Setup

```bash
npm install
cp .env.example .env     # then fill in the Supabase URL and anon key
npm run dev              # http://localhost:5173
```

`VITE_API_URL` must match the backend's `PORT` (default `http://localhost:5000`),
and this app's origin must be allowed by the backend's `ALLOWED_ORIGINS`. In
development the backend auto-allows any localhost port; in production it does not.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server with HMR on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the built output on port 4173 |
| `npm run lint` | Oxlint |

## Deployment

`vercel.json` handles SPA rewrites, security headers, and immutable caching for
hashed assets. Set `VITE_API_URL`, `VITE_SUPABASE_URL`, and
`VITE_SUPABASE_ANON_KEY` in the Vercel project settings before the first build.
