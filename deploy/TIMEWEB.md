# Backend на Timeweb Cloud

Production URL: **https://zuevpu-nfo-forum-d400.twc1.net**

Railway в проекте **не используется**.

## Переменные окружения

Скопируйте [`.env.production.example`](../.env.production.example) в панель Timeweb → переменные окружения приложения.

Обязательно:

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | PostgreSQL (Timeweb DB) |
| `API_PUBLIC_URL` | `https://zuevpu-nfo-forum-d400.twc1.net` |
| `SKIP_VK_SIGN` | `false` |
| `FRONTEND_ORIGIN` | `https://vk.com` |
| `CRON_SECRET` | случайная строка 32+ символов |

## Деплой backend

```powershell
# Сборка + миграции БД + подсказки по редеплою в панели Timeweb
npm run deploy:backend

# Проверка после редеплоя
npm run verify:prod
```

Миграции отдельно:

```powershell
cd backend
npm run db:migrate
npm run db:close-test-questions
```

## Деплой frontend

```powershell
npm run build:frontend:prod
npm run deploy:vk:dev
```

`VITE_API_URL` при сборке должен указывать на Timeweb backend (см. `.env.production`).

## GitHub Actions (cron)

Секреты `API_URL` и `CRON_SECRET` — см. [`set-github-secrets.ps1`](./set-github-secrets.ps1).

Полный чеклист: [DEPLOY.md](./DEPLOY.md), [VK_CABINET_CHECKLIST.md](./VK_CABINET_CHECKLIST.md).
