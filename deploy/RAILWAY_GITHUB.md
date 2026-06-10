# Railway deploy via GitHub

Backend URL: https://nfo-backend-production.up.railway.app

Project ID: `5c4e619c-696a-4f4b-9fd6-0d6563f55b0e`

## Option A — GitHub deploy (recommended)

### 1. Grant Railway access to the private repo

Repo `ZuevPU/nfo-forum` is **private**. Railway cannot deploy until the GitHub App has access:

1. Open https://github.com/settings/installations
2. Find **Railway** → **Configure**
3. Under **Repository access**, select **Only select repositories** → add **nfo-forum**

### 2. Connect repo and deploy

```powershell
.\deploy\connect-railway-github.ps1
```

This connects the service to `main` and triggers a build on Railway (no local upload).

### 3. Verify

```powershell
.\deploy\verify-production.ps1 -ApiUrl https://nfo-backend-production.up.railway.app
```

## Option B — GitHub Actions

Secrets in repo (already set):

- `RAILWAY_TOKEN` — project token
- `RAILWAY_PROJECT_ID` — `5c4e619c-696a-4f4b-9fd6-0d6563f55b0e`

Run workflow **Deploy Backend to Railway** or push to `main`.

**Blocker:** GitHub Actions requires billing — fix at https://github.com/settings/billing if jobs fail with *"recent account payments have failed"*.

## Option C — Local CLI upload

```powershell
.\deploy\deploy-backend-railway.ps1
```

If upload fails with *connection reset (error 10054)*, use Option A instead.

## 3. Alternative: Fly.io

Add billing at https://fly.io/dashboard then run:

```powershell
.\deploy\deploy-backend.ps1
```
