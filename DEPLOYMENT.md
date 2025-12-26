# Deployment guide — cook-and-craft-admin

This document describes how to build, run, and deploy the `cook-and-craft-admin` web app.

Overview
- Project: React + Vite + TypeScript admin app
- Package manager: pnpm preferred (this repo contains `pnpm-lock.yaml`). npm works as an alternative.
- Recommended host: Vercel (project already contains `vercel.json`). Alternatives included: Netlify, Docker

Quick local checks (PowerShell)

1. Install dependencies (preferred: pnpm)

```powershell
# if you don't have pnpm
npm i -g pnpm

# install dependencies
pnpm install

# dev server
pnpm run dev

# build for production
pnpm run build

# preview production build
pnpm run preview
```

If you prefer npm:

```powershell
npm install
npm run dev
npm run build
npm run preview
```

Important build settings
- Build command: `pnpm build` (or `npm run build`)
- Output directory: `dist` (Vite default)
- Node: use a modern Node.js (>=18 recommended); this repository lists `@types/node: ^22` and TypeScript 5.

Environment variables
- The app uses an API base URL constant `API_BASE_URL` set to `https://cook-craft.dhcb.io/api` in `SubscriptionsPage.tsx`. For different environments, keep environment variables instead of hardcoding. Suggested variables:
  - `VITE_API_BASE_URL` — base API URL used by the frontend
  - `VITE_FIREBASE_API_KEY` — Firebase web API key
  - `VITE_FIREBASE_AUTH_DOMAIN` — Firebase auth domain
  - `VITE_FIREBASE_PROJECT_ID` — Firebase project id (required)
  - `VITE_FIREBASE_STORAGE_BUCKET` — (optional) storage bucket
  - `VITE_FIREBASE_MESSAGING_SENDER_ID` — (optional) messaging sender id
  - `VITE_FIREBASE_APP_ID` — (optional) Firebase app id
  - `VITE_SENTRY_DSN` — (optional) Sentry DSN for error reporting
  - `VITE_FEATURE_FLAG_X` — any runtime feature flags

How to wire environment variables in code (Vite)
- Access variables in code as `import.meta.env.VITE_API_BASE_URL`.
- Replace hardcoded `API_BASE_URL` with the variable. Example:

```ts
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://cook-craft.dhcb.io/api"
```

Vercel deployment (recommended)

1. Create a Vercel project and connect the GitHub/Repo.
2. Settings -> Framework: Vite (auto-detected). If not:
   - Build command: `pnpm build` (or `npm run build`)
   - Install command: `pnpm install` (or leave blank to use Vercel's default)
   - Output directory: `dist`
3. Under Project Settings -> Environment Variables, add the variables listed above (e.g., `VITE_API_BASE_URL`) for Production and Preview.
4. Set the production branch (e.g., `main`) and enable automatic deployments on push.

Notes for Vercel:
- If using pnpm, Vercel will install pnpm automatically when it sees `pnpm-lock.yaml`. If you want to be explicit, set Install Command to `pnpm install`.
- `vercel.json` exists in the repo; check it for any rewrite/redirect rules before deploying.

Netlify (alternative)

1. Create a Netlify site and connect the repo.
2. Build command: `pnpm build` (or `npm run build`)
3. Publish directory: `dist`
4. Add environment variables in Netlify UI.

Docker alternative (self-hosted)

Example `Dockerfile` (simple):

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm i -g pnpm
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

Notes:
- Build locally and confirm `dist` contains the compiled app.
- When hosting behind a CDN or custom server, add appropriate caching headers and set routes for SPA fallback (rewrite all to `index.html`).

CI/CD example (GitHub Actions) — build and test

Add a workflow that installs pnpm, installs deps, builds, and runs tests (if any). Deploy to Vercel can be done via Vercel Git integration (recommended) or Vercel CLI with an API token.

Release checklist (before merging to `main` / deploying production)
- [ ] Ensure `VITE_API_BASE_URL` and other env vars are set for production in Vercel/host.
- [ ] Run `pnpm build` and verify no build errors.
- [ ] Smoke test the preview deployment (click the Vercel preview link) — basic pages load, login works, major flows check.
- [ ] Run quick accessibility checks and verify no regressions.
- [ ] Update changelog or release notes.
- [ ] Tag the release and deploy.

Rollback strategy
- Use Vercel's deployment history to roll back to a previous deployment (UI -> Deployments -> select older deployment -> Promote to production).
- If using Docker/hosted servers, keep the last working image tag and redeploy it.

Troubleshooting tips
- If `vite` is not found locally when running `npm run dev`, make sure dependencies were installed. `pnpm install` will create `node_modules/.bin/vite`.
- If build fails due to env var missing, confirm `VITE_` prefixed variables are set in the environment.
- For CORS or API issues, confirm the API server allows requests from your deployed domain.

Security & secrets
- Do NOT store secrets in the repository. Use host-secret stores (Vercel environment variables, Netlify environment variables, or cloud secret manager).

Optional improvements
- Add an environment-specific config file or runtime config so builds do not require rebuilds for minor API endpoint swaps.
- Add GitHub Actions to run lint/build/test on PRs.

Contact / ownership
- If you need me to create the Vercel project, add environment variables, or replace the hardcoded `API_BASE_URL` with `import.meta.env.VITE_API_BASE_URL`, say so and I can update the repo.

