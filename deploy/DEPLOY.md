# Деплой «Форум НФО»

## 1. Backend (Docker / Railway / Render)

### Переменные окружения (production)

Скопируйте [`.env.production.example`](../.env.production.example) на сервер:

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | Supabase PostgreSQL (pooler) |
| `PORT` | `3001` |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | `https://vk.com` |
| `SKIP_VK_SIGN` | **`false`** |
| `VK_APP_SECRET` | из настроек Mini App |
| `VK_GROUP_TOKEN` | токен сообщества |
| `VK_GROUP_ID` | ID сообщества |
| `CRON_SECRET` | случайная строка 32+ символов |

### Docker

```bash
docker build -f backend/Dockerfile -t nfo-backend .
docker run -p 3001:3001 --env-file .env nfo-backend
```

### Fly.io (рекомендуется для этого проекта)

1. `flyctl auth login`
2. Скопируйте [`.env.production.example`](../.env.production.example) → `.env.production` (не коммитить)
3. ```powershell
   .\deploy\deploy-backend.ps1
   ```
4. URL: `https://nfo-forum-api.fly.dev`

Сборка frontend: `.\deploy\build-frontend.ps1`

Используйте [`render.yaml`](../render.yaml) — сервис `nfo-backend`, health check `/api/health`.

## 2. Frontend (VK Hosting)

```bash
# В корне репозитория
VITE_API_URL=https://your-backend.example.com npm run build:frontend
```

Загрузите содержимое `frontend/dist` в [VK Mini Apps](https://vk.com/apps?act=manage).

Подробнее: [vk-hosting.md](./vk-hosting.md)

## 3. GitHub Secrets (cron)

В репозитории → Settings → Secrets → Actions:

| Secret | Пример |
|--------|--------|
| `API_URL` | `https://your-backend.example.com` |
| `CRON_SECRET` | тот же, что на backend |

Workflow [`.github/workflows/cron.yml`](../.github/workflows/cron.yml) вызывает 6 jobs по расписанию MSK.

Ручной тест:

```bash
curl -X POST "$API_URL/api/cron/morning-greeting" -H "X-Cron-Secret: $CRON_SECRET"
```

## 4. Проверка после деплоя

```bash
API_URL=https://your-backend.example.com npm run smoke-test
```

Чеклист VK DevTools: [`scripts/VK_DEVTOOLS_CHECKLIST.md`](../scripts/VK_DEVTOOLS_CHECKLIST.md)

Автоматическая часть API-тестов:

```bash
npm run vk-checklist:ps1
```

## 5. Назначение администратора

```bash
npm run promote-admin -w backend -- <vk_id>
```
