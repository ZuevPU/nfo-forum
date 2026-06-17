# Деплой «Форум НФО»

## 1. Backend (Timeweb Cloud / Docker)

Production: **https://zuevpu-nfo-forum-d400.twc1.net** — см. [TIMEWEB.md](./TIMEWEB.md).

### Переменные окружения (production)

Скопируйте [`.env.production.example`](../.env.production.example) на сервер:

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | PostgreSQL на Timeweb (managed DB) |
| `PORT` | `3001` |
| `NODE_ENV` | `production` |
| `FRONTEND_ORIGIN` | `https://vk.com` |
| `SKIP_VK_SIGN` | **`false`** |
| `VK_APP_SECRET` | из настроек Mini App |
| `VK_GROUP_TOKEN` | токен сообщества |
| `VK_GROUP_ID` | ID сообщества |
| `CRON_SECRET` | случайная строка 32+ символов |
| `API_PUBLIC_URL` | публичный URL backend на Timeweb, напр. `https://zuevpu-nfo-forum-d400.twc1.net` (для ссылок на фото в рассылках) |
| `VITE_API_URL` | тот же URL — только при сборке frontend |

### Docker

```bash
docker build -f backend/Dockerfile -t nfo-backend .
docker run -p 3001:3001 --env-file .env nfo-backend
```

### Timeweb Cloud (основной способ)

```powershell
npm run deploy:backend    # сборка + миграции + инструкция редеплоя в панели
npm run verify:prod       # smoke после редеплоя
```

Сборка frontend: `.\deploy\build-frontend.ps1`

### Fly.io (опционально)

1. `flyctl auth login`
2. Скопируйте [`.env.production.example`](../.env.production.example) → `.env.production` (не коммитить)
3. ```powershell
   .\deploy\deploy-backend.ps1
   ```
4. URL: `https://nfo-forum-api.fly.dev`

Сборка frontend: `.\deploy\build-frontend.ps1`

Используйте [`render.yaml`](../render.yaml) — сервис `nfo-backend`, health check `/api/health`.

## 2. Frontend (Timeweb — статика)

```powershell
npm run build:frontend:prod
```

Результат: `frontend/dist/`. Залейте на Timeweb (статическое приложение).

В [dev.vk.com → Размещение](https://dev.vk.com/ru/mini-apps/settings) укажите URL фронтенда на Timeweb (не backend `*.twc1.net`).

Проверка: https://vk.com/app54627015

Скрипты `npm run deploy:vk:*` — устаревший путь через VK Hosting, для production не нужны.

Подробнее: [TIMEWEB.md](./TIMEWEB.md), [VK_CABINET_CHECKLIST.md](./VK_CABINET_CHECKLIST.md)

## 3. GitHub Secrets (cron)

В репозитории → Settings → Secrets → Actions:

| Secret | Пример |
|--------|--------|
| `API_URL` | `https://zuevpu-nfo-forum-d400.twc1.net` (Timeweb backend) |
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
