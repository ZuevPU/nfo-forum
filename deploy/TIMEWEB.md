# Backend и frontend на Timeweb Cloud

Production backend: **https://zuevpu-nfo-forum-d400.twc1.net**

Railway и VK Hosting в проекте **не используются** для production.

## Переменные окружения (backend)

Скопируйте [`.env.production.example`](../.env.production.example) в панель Timeweb → переменные окружения приложения backend.

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | PostgreSQL (Timeweb DB) |
| `API_PUBLIC_URL` | `https://zuevpu-nfo-forum-d400.twc1.net` |
| `DB_POOL_MAX` | `10` (не больше 15 без проверки лимита БД) |
| `SKIP_VK_SIGN` | `false` |
| `FRONTEND_ORIGIN` | `https://vk.com` |
| `CRON_SECRET` | случайная строка 32+ символов |

## Настройки App Platform (если деплой «висит» после Build succeeded)

Timeweb ждёт **2xx от health-check**. Частые причины зависания 15–30 мин:

| Проблема | Решение |
|----------|---------|
| Путь health-check = `/` или `/api/health`, а БД ещё не готова | В панели: **Путь проверки состояния → `/health`** (не зависит от БД) |
| Приложение слушает только localhost | В коде: `app.listen(PORT, '0.0.0.0')` — уже исправлено |
| Нет `DATABASE_URL` в env | Контейнер падает при старте — добавьте в переменные окружения |
| Auto Node + pm2, без lockfile | Лучше: **тип деплоя Dockerfile**, файл `Dockerfile` в корне репо |

**Рекомендуемые настройки backend-приложения:**

| Поле | Значение |
|------|----------|
| Тип | Dockerfile (корневой `Dockerfile`) |
| Порт | `3001` или переменная `PORT` |
| Health path | `/health` |
| Build (если без Docker) | `npm ci && npm run build:backend` |
| Start (если без Docker) | `npm start` |

После redeploy проверка: `https://zuevpu-nfo-forum-d400.twc1.net/health` → `{"status":"ok"}`.

## Деплой backend

```powershell
npm run deploy:backend
npm run verify:prod
```

Скрипт собирает backend, применяет миграции БД и напоминает сделать **Redeploy** в панели Timeweb.

Миграции отдельно:

```powershell
cd backend
npm run db:migrate
```

## Деплой frontend (статика на Timeweb)

```powershell
npm run deploy:frontend:timeweb
```

Результат: папка `frontend/dist/`. Залейте её содержимое на Timeweb (отдельное статическое приложение или ваш способ хостинга).

`VITE_API_URL` при сборке должен указывать на Timeweb backend (см. `.env.production`).

## VK Mini App — размещение

В [dev.vk.com → Размещение](https://dev.vk.com/ru/mini-apps/settings) укажите URL **фронтенда на Timeweb** (HTTPS + `index.html`).

**Не использовать:** URL backend (`*.twc1.net`), `https://vk.com/app54627015`.

Чеклист: [VK_CABINET_CHECKLIST.md](./VK_CABINET_CHECKLIST.md)

## GitHub Actions (cron)

Секреты `API_URL` и `CRON_SECRET` — см. [`set-github-secrets.ps1`](./set-github-secrets.ps1).

Полный обзор: [DEPLOY.md](./DEPLOY.md).
