# Backend и frontend на Timeweb Cloud

Production backend: **https://zuevpu-nfo-forum-d400.twc1.net**

Railway и VK Hosting в проекте **не используются** для production.

## Health check (важно)

В настройках backend-приложения Timeweb укажите **liveness** путь:

- **Правильно:** `/health` или `/` — ответ 200 без обращения к БД
- **Не использовать для liveness:** `/api/health` — проверяет PostgreSQL; при неверном `DATABASE_URL` контейнер уходит в цикл перезапусков (`SIGTERM`)

## Переменные окружения (backend)

Скопируйте [`.env.production.example`](../.env.production.example) в панель Timeweb → переменные окружения приложения backend.

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | PostgreSQL (Timeweb DB) — **актуальная строка из панели БД** (пользователь, пароль, имя БД, хост) |
| `API_PUBLIC_URL` | `https://zuevpu-nfo-forum-d400.twc1.net` |
| `SKIP_VK_SIGN` | `false` |
| `FRONTEND_ORIGIN` | `https://vk.com` |
| `CRON_SECRET` | случайная строка 32+ символов |

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

## Если «всё упало»: backend не подключается к БД

Симптомы в логах backend:

- `Health check failed: password authentication failed for user "gen_user"` (код `28P01`)
- `npm error signal SIGTERM` — Timeweb убивает контейнер после неудачного health check
- Frontend (статика `*.twc1.net`) отдаёт **200**, но API (`zuevpu-nfo-forum-d400.twc1.net`) не отвечает или `/api/health` → 503

Симптомы в логах PostgreSQL:

- `Role "gen_user" does not exist` — после перезапуска/миграции БД старый пользователь удалён
- Успешные подключения `adminzuev@nfobd` — актуальная БД другая (`nfobd`, не `default_db`)

**Исправление:**

1. Timeweb → **Базы данных** → откройте текущую PostgreSQL → скопируйте строку подключения (пользователь, пароль, хост, **имя БД**).
2. Timeweb → **backend-приложение** → переменные → обновите `DATABASE_URL` (тот же формат: `postgresql://user:pass@host:5432/dbname?sslmode=require`).
3. Обновите `.env.production` локально тем же `DATABASE_URL`.
4. Примените миграции: `cd backend && npm run db:migrate`.
5. Health check в панели → `/health`.
6. **Redeploy** backend.
7. Проверка: `npm run verify:prod` или откройте `https://zuevpu-nfo-forum-d400.twc1.net/api/health` — должно быть `"database":"connected"`.

В логах после деплоя должны появиться строки:

```
[db] Pool max=10, target=USER@HOST:5432/DATABASE
[db] Startup connection OK
```
