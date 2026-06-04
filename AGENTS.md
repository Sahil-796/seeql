# AGENTS.md

Seeql is a SQL playground (Quick + Playground modes). Monorepo with a Go/Gin/SQLite backend and a Next.js 16 / React 19 / Biome frontend.

## Layout

- `apps/api/` — Go HTTP server. Entry: `apps/api/main.go`. Routes in `apps/api/routes/routes.go`. Handlers in `apps/api/handlers/`. Middleware in `apps/api/middleware/`.
- `internal/` — Shared Go packages, imported as `github.com/Sahil-796/seeql/internal/...`. Subpackages: `db` (SQLite + sessions + guardrails), `modes` (QuickMode/PlaygroundMode), `parser` (Vitess wrapper), `schema` (types + inference), `generator` (gofakeit).
- `apps/web/` — Next.js app router. UI primitives in `apps/web/components/ui/`. API client in `apps/web/lib/api.ts` (reads `NEXT_PUBLIC_API_URL`).

Root `package.json` is empty (`{}`). All npm scripts live in `apps/web/package.json`.

## Run / build / test

Backend (requires CGO):
```bash
go mod download
go run apps/api/main.go                 # serves :8080
go test ./...                           # run all Go tests
```

Frontend (uses `bun` — see `apps/web/bun.lock`):
```bash
cd apps/web
bun install
bun run dev          # next dev on :3000
bun run build        # next build
bun run lint         # biome check
bun run format       # biome format --write
```

There is no top-level `make`/`just`/test script. From the repo root, `go test ./...` covers both `apps/api` and `internal` test files.

## Cross-cutting conventions

- **Frontend ↔ backend config**: `apps/web/lib/api.ts` reads `NEXT_PUBLIC_API_URL` (default `http://localhost:8080`). For local dev, set `NEXT_PUBLIC_API_URL` in `apps/web/.env.local` (template in `apps/web/.env.example`).
- **CORS allowlist is hardcoded** in `apps/api/main.go`. It includes `localhost:3000`, `localhost:3001`, and `https://seeql-one.vercel.app`. Adding a new frontend origin requires editing this list.
- **Backend env**: `PORT` (default `8080`), `DATA_DIR` (default `./data/sessions`). `godotenv` loads `.env` from the binary's CWD on startup.
- **Session state lives in process memory** (`internal/db/session.go`): in-memory map + per-session SQLite file under `DATA_DIR`. There is a TTL-based cleanup goroutine (`StartCleanup`, `expireSessions`) and a one-shot orphan file sweep (`CleanupOrphanedDBs`). Restarting the API process loses all sessions. The `ARCH.md` Redis section is design intent only — not yet implemented.
- **Query guardrails** (`internal/db/guardrails.go`): length cap (10KB), dangerous pattern blocklist (PRAGMA, ATTACH, load_extension, randomblob, generate_series, multi-statement `;DROP`/`;DELETE`/etc.), auto-`LIMIT 1000` for SELECTs, max 10 JOINs, max 20 aggregations, max 50 tables per session, max 100 sessions total.
- **Generated identifiers are quoted** in `db.CreateTable`/`InsertData`/`AddColumn` with `"%s"` — do not drop the quoting.

## Deployment

- **Frontend**: Vercel. `apps/web/vercel.json` pins framework `nextjs`. Pushes to any branch on Vercel trigger a build; no CI workflow involved.
- **Backend**: Docker → Azure Container Apps. `Dockerfile` (root) is a multi-stage `golang:1.25-alpine` build producing a single static binary on `alpine:latest` with `sqlite-libs`. CGO must stay enabled (SQLite driver is `mattn/go-sqlite3`). Build ignores `apps/web/` and `.env` (see `.dockerignore`).
- **CI**: `.github/workflows/deploy.yml` runs on push to `master` (paths-ignore `apps/web/**`) and `workflow_dispatch`. It logs in to Azure via OIDC, builds `linux/amd64`, pushes to Docker Hub as `sahil796/seeql-container:<sha>` + `:latest`, then updates the Azure Container App. Required secrets: `SEEQLCONTAINER_AZURE_CLIENT_ID`, `SEEQLCONTAINER_AZURE_TENANT_ID`, `SEEQLCONTAINER_AZURE_SUBSCRIPTION_ID`, `DOCKERHUB_TOKEN`, `DOCKERHUB_USERNAME`.
- **Local Docker**: `docker build -t seeql . && docker run -p 8080:8080 seeql`.

`DEPLOYMENT.md` describes the older Azure + Redis + Azure Files design (Redis integration is not yet wired up — see "Known gaps" below).

## Known gaps / dead code (verify before "fixing")

From `task.md` and `ARCH.md`:
- `internal/db/sqlite.go` is dead (Init never called) — was renamed/replaced by `ConfigureSQLite` in `internal/db/execute.go`.
- `internal/modes/interface.go` and both `*Mode.GetSchema()` impls are unused by the current route set.
- `internal/parser/aggregations.go` is only used by its own tests.
- The CORS wildcard fix for `*.vercel.app` is still pending (`task.md` Medium, line 181).
- `DEPLOYMENT.md` describes a Redis-backed session store that is not present in the current `internal/db/session.go`.
