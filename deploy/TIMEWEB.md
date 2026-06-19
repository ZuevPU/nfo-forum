# Backend и frontend на Timeweb Cloud

Production backend: **https://zuevpu-nfo-forum-d400.twc1.net**

Railway и VK Hosting в проекте **не используются** для production.

## Health check (важно)

В настройках backend-приложения Timeweb укажите **liveness** путь:

- **Правильно:** `/health` или `/` — ответ 200 без обращения к БД
- **Не использовать для liveness:** `/api/health` — проверяет PostgreSQL; при неверном `DATABASE_URL` контейнер уходит в цикл перезапусков (`SIGTERM`)

## Переменные окружения (backend)

Скопируйте [`.env.production.example`](../.env.production.example) в панель Timeweb → переменные окружения приложения backend.

### Вариант A — одна строка (простой пароль без спецсимволов)

```
DATABASE_URL=postgresql://adminzuev:NfoForum2026Pass@147.45.185.213:5432/nfobd?sslmode=require
```

### Вариант B — отдельные переменные (надёжнее для Timeweb)

Если `DATABASE_URL` не срабатывает, удалите её и задайте:

| Переменная | Значение |
|------------|----------|
| `DB_HOST` | `147.45.185.213` *(или **приватный IP** из вкладки «Подключение» БД)* |
| `DB_USER` | `adminzuev` |
| `DB_PASSWORD` | `NfoForum2026Pass` |
| `DB_NAME` | `nfobd` |
| `DB_PORT` | `5432` |

### Приватная сеть (важно)

Если backend и PostgreSQL оба на Timeweb Cloud — в `DB_HOST` / `DATABASE_URL` используйте **приватный IP** базы (вкладка «Подключение» → «Приватный IP»), а не публичный `147.45.185.213`. Публичный IP работает с вашего ПК, но из контейнера App Platform может не подходить.

### Порт приложения

- **Не задавайте** `PORT=3001` в Timeweb — платформа сама подставляет `PORT`.
- Health check path: **`/health`** (не `/api/health`).

| Переменная | Значение |
|------------|----------|
| `DATABASE_URL` | см. вариант A или B выше |
| `API_PUBLIC_URL` | `https://zuevpu-nfo-forum-d400.twc1.net` |
| `SKIP_VK_SIGN` | `false` |
| `FRONTEND_ORIGIN` | `https://zuevpu-nfo-forum-2212.twc1.net` |
| `CRON_SECRET` | случайная строка 32+ символов |

## Деплой backend

### Тип приложения в панели Timeweb

Используйте **Dockerfile** (не «Node.js» с ручными командами сборки/запуска):

| Поле | Значение |
|------|----------|
| Тип | **Dockerfile** |
| Путь к директории проекта | *(пусто — Dockerfile в корне репозитория)* |
| Команда сборки | *(пусто — сборка внутри Dockerfile)* |
| Команда запуска | *(пусто — `CMD` в Dockerfile)* |
| Health check path | `/health` |
| Порт | `3001` *(или оставьте авто — Dockerfile содержит `EXPOSE 3001`)* |

Корневой [`Dockerfile`](../Dockerfile) собирает `backend/dist/index.js` и запускает `node backend/dist/index.js`.

Если оставить тип «Node.js» с командами `npm ci --include=dev && npm run build -w backend` и `node backend/dist/index.js`, Timeweb генерирует свой Dockerfile **без `EXPOSE`**. Тогда деплой может упасть на шаге «Recreating container with discovered ports» — даже если сборка прошла успешно.

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
