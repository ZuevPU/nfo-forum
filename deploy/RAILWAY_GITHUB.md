# After GitHub repo is created

## 1. Railway token

1. Open https://railway.com/account/tokens
2. Create token
3. In GitHub repo → Settings → Secrets → Actions, add:
   - `RAILWAY_TOKEN` = your token
   - `RAILWAY_PROJECT_ID` = `5c4e619c-696a-4f4b-9fd6-0d6563f55b0e`

## 2. Trigger deploy

Push to `main` or run workflow **Deploy Backend to Railway** manually.

Backend URL: https://nfo-backend-production.up.railway.app

## 3. Alternative: Fly.io

Add billing at https://fly.io/dashboard then run:

```powershell
.\deploy\deploy-backend.ps1
```
