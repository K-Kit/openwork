# OpenWork Cloud on Railway

Deploy the OpenWork Cloud stack (Den) on [Railway](https://railway.com).

This is the same stack that powers `app.openwork.software` — user auth, worker provisioning, and the cloud web interface.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Den Web    │────▶│  Den Controller  │────▶│   MySQL     │
│  (Next.js)  │     │  (Express API)   │     │  (Railway)  │
│  port 3005  │     │  port 8788       │     │  port 3306  │
└─────────────┘     └──────────────────┘     └─────────────┘
   public URL         private network          private network
```

- **Den Web**: Next.js frontend — sign up, sign in, launch workers
- **Den Controller**: Express API — Better Auth, worker CRUD, provisioning hooks
- **MySQL**: Database for auth sessions, workers, orgs

## Setup

### 1. Create a Railway project

Create a new project at [railway.com/new](https://railway.com/new).

### 2. Add MySQL

Add a **MySQL** plugin from Railway's service menu. Railway provisions the database and exposes connection variables automatically.

### 3. Add Den Controller

Add a new service from this GitHub repo with these settings:

| Setting | Value |
|---------|-------|
| Dockerfile path | `packaging/railway/Dockerfile.den` |
| Port | `8788` |

Set these environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `mysql://root:${{MySQL.MYSQL_ROOT_PASSWORD}}@${{MySQL.RAILWAY_PRIVATE_DOMAIN}}:3306/railway` |
| `BETTER_AUTH_SECRET` | Generate a 32+ char random string |
| `BETTER_AUTH_URL` | The Den Web public URL (set after step 4) |
| `PORT` | `8788` |
| `CORS_ORIGINS` | The Den Web public URL |
| `PROVISIONER_MODE` | `stub` (or `render` / `daytona` for real workers) |

Optional (GitHub social sign-in):

| Variable | Value |
|----------|-------|
| `GITHUB_CLIENT_ID` | Your GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Your GitHub OAuth app secret |

### 4. Add Den Web

Add another service from this GitHub repo:

| Setting | Value |
|---------|-------|
| Dockerfile path | `packaging/railway/Dockerfile.den-web` |
| Port | `3005` |

Set these environment variables:

| Variable | Value |
|----------|-------|
| `DEN_API_BASE` | `http://${{den-controller.RAILWAY_PRIVATE_DOMAIN}}:8788` |
| `DEN_AUTH_ORIGIN` | The Den Web public URL (e.g. `https://den-web-production.up.railway.app`) |

Optional:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_OPENWORK_AUTH_CALLBACK_URL` | Same as Den Web public URL |
| `NEXT_PUBLIC_OPENWORK_APP_CONNECT_URL` | Base URL for "Open in App" deep links |
| `DEN_AUTH_FALLBACK_BASE` | Fallback Den origin if primary errors |

### 5. Wire BETTER_AUTH_URL

After Den Web gets its public Railway URL, go back to the Den Controller service and set:

```
BETTER_AUTH_URL = https://<den-web-service>.up.railway.app
```

Also update `CORS_ORIGINS` to include this URL.

### 6. Deploy

Deploy all services. The Den Controller runs database migrations automatically on startup.

## Health checks

```bash
curl https://<den-controller>.up.railway.app/health
curl https://<den-web>.up.railway.app/api/den/health
```

## File reference

```
packaging/railway/
  Dockerfile.den        — Den Controller (corrected ee/ paths)
  Dockerfile.den-web    — Den Web frontend
  Dockerfile.host       — OpenWork Host (single-service alternative)
  railway.toml          — Railway config for OpenWork Host
  railway.den.toml      — Railway config for Den Controller
  railway.den-web.toml  — Railway config for Den Web
  template.den.json     — Template definition (full Den stack)
  template.json         — Template definition (host only)

railway.json            — Root-level Railway config (Den Controller)
```

## Notes

- The Den Controller CMD runs `run-sql-migrations.mjs` before starting the API server. No manual migration step needed.
- Railway's MySQL plugin auto-provisions the database. Use Railway's variable references (`${{MySQL.VARIABLE}}`) to wire the connection string.
- Den Web talks to Den Controller over Railway's private network — no public exposure needed for the API.
- The existing Dockerfiles in `packaging/docker/` reference stale paths (`packages/utils`, `services/den`). The Railway Dockerfiles in this directory use the correct `ee/` paths.
