# Deploying a dev build

Only the **web app** (`apps/web`, a static Vite build) is hosted on Cloudflare, as a Worker serving static assets (`wrangler.jsonc` at the repo root). The **server** (`apps/server`: Fastify, WebSocket presence, Postgres) is a long-running Node process, so host it somewhere that runs Node/Docker (Fly.io, Railway, Render, a VPS) with a real Postgres via `DATABASE_URL`. It must be reachable over `https`/`wss`, since the site is served over https. CORS is already open (`origin: true`).

## Cloudflare Workers Builds (Git integration)

Connect `cozy-nyc/cozy-nyc` in the Cloudflare dashboard (Workers & Pages, Create, Import a repository) with:

| Setting | Value |
| --- | --- |
| Project name | `cozy-nyc` (must match `name` in `wrangler.jsonc`) |
| Production branch | `main` |
| Build command | `pnpm run build` |
| Deploy command | `npx wrangler deploy` |
| Variable | `VITE_API_URL` = public URL of the server, e.g. `https://cozy-api-dev.example.com` |

Add `NODE_VERSION=22` as a build variable if the default Node is older. Every push to `main` then builds and deploys. Preview builds for other branches work too; the preview command can stay `npx wrangler versions upload`.

## Manual deploy

```sh
export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...
VITE_API_URL=https://cozy-api-dev.example.com pnpm deploy:dev
```

## Notes

- `VITE_API_URL` is baked in at build time. The WebSocket URL is derived from it (`https` becomes `wss`).
- `apps/web/public/_headers` caches hashed assets and sets `noindex` for the dev site.
- The JS bundle is about 2 MB (540 KB gzipped), mostly MapLibre. Fine for dev; code-splitting is a later optimisation.
- Unknown paths fall back to `index.html` (`single-page-application`).
