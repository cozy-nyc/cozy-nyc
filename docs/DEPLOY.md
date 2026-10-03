# Deploying a dev build

Only the **web app** (`apps/web`, a static Vite build) goes on Cloudflare Pages. The **server** (`apps/server`: Fastify, WebSocket presence, Postgres) is a long-running Node process and can't run on Pages, so host it somewhere that runs Node/Docker (Fly.io, Railway, Render, a VPS) with a real Postgres via `DATABASE_URL`. It must be reachable over `https`/`wss`, since Pages is served over https. CORS is already open (`origin: true`).

## One-time setup

1. Deploy the server and note its public URL, e.g. `https://cozy-api-dev.example.com`.
2. Create the Pages project (direct upload): `pnpm --filter @cozy/web exec wrangler pages project create cozy-nyc-dev --production-branch main`
3. In GitHub, add repo secrets `CLOUDFLARE_API_TOKEN` (Pages: Edit permission) and `CLOUDFLARE_ACCOUNT_ID`, and repo variable `DEV_API_URL` (the server URL from step 1).

After that, every push to `main` runs `.github/workflows/deploy-dev.yml` (typecheck, test, build, deploy). You can also run it by hand from the Actions tab.

## Manual deploy

```sh
export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...
VITE_API_URL=https://cozy-api-dev.example.com pnpm --filter @cozy/web deploy:dev
```

## Notes

- `VITE_API_URL` is baked in at build time. The WebSocket URL is derived from it (`https` becomes `wss`).
- `apps/web/public/_headers` caches hashed assets and sets `noindex` for the dev site.
- The JS bundle is about 2 MB (540 KB gzipped), mostly MapLibre. It's fine for dev; code-splitting is a later optimisation.
- Prefer Cloudflare's Git integration instead of the workflow? Build command `pnpm --filter @cozy/web build`, output directory `apps/web/dist`, env `NODE_VERSION=22` and `VITE_API_URL`. Then delete `deploy-dev.yml`.
