# Деплой Frontend на VK Hosting

Официальный способ — [`@vkontakte/vk-miniapps-deploy`](https://dev.vk.com/ru/mini-apps/development/hosting/overview).

На Windows upload идёт через [`deploy-vk-curl.mjs`](./deploy-vk-curl.mjs) (обход `ECONNRESET` в `node-fetch`).

**Node.js:** для сборки нужен **Node 18+** (Vite 6). Документация VK про Node 16 устарела — на Hosting попадает только статика `dist/`.

**Кабинет VK:** [VK_CABINET_CHECKLIST.md](./VK_CABINET_CHECKLIST.md)

## Локальная разработка через VK Tunnel

По [статье VK на Habr](https://habr.com/ru/companies/vk/articles/778258/) — быстрый способ открыть app54627015 **до** деплоя на Hosting.

### Запуск (3 терминала)

```powershell
# 1 — API (можно Railway в .env, backend локально не обязателен)
npm run dev:backend

# 2 — frontend на :5173
npm run dev:frontend

# 3 — HTTPS-туннель (первый раз — OAuth как у deploy)
npm run tunnel:frontend
```

Tunnel выведет HTTPS-URL и может автоматически обновить **«Размещение»** в [dev.vk.com](https://dev.vk.com/ru/mini-apps/settings). Если нет — вставьте URL вручную в mobile / web / mvk.

Конфиг: [`frontend/vk-tunnel-config.json`](../frontend/vk-tunnel-config.json) (`app_id: 54627015`).

Проверка: https://vk.com/app54627015 (под админом). Включите **Eruda** в настройках приложения для консоли на телефоне.

## Команды деплоя

| Команда | Режим | Код подтверждения |
|---------|-------|-------------------|
| `npm run deploy:vk` | dev (по умолчанию) | Не нужен |
| `npm run deploy:vk:dev` | dev | Не нужен |
| `npm run deploy:vk:prod` | production | Нужен от «Администрация» |

### Первый деплой (рекомендуется)

```powershell
npm run deploy:vk:dev
```

После успеха в терминале появятся **URL для раздела «Размещение»** в [dev.vk.com](https://dev.vk.com/ru/mini-apps/settings).

### Production (для пользователей)

```powershell
# Если код пришёл в сообщения «Администрация»:
$env:VK_DEPLOY_CONFIRM_CODE="ВАШ_КОД"
npm run deploy:vk:prod
```

Или выключите **debug-режим** в dev.vk.com → тогда код часто не нужен.

### OAuth-токен (один раз)

```powershell
cd frontend
npm run deploy
```

Откройте OAuth-ссылку, нажмите Y. Токен сохранится в `%USERPROFILE%\.config\configstore\@vkontakte\vk-miniapps-deploy.json`.

## Размещение в кабинете VK

Вставляйте URL **из вывода деплоя** (HTTPS + `index.html`), не Railway и не `vk.com/app54627015`.

Пример:

```
mobile: https://....vk-apps.com/.../index.html
web:    https://....vk-apps.com/.../index.html
mvk:    https://....vk-apps.com/.../index.html
```

## Конфигурация

- [`frontend/vk-hosting-config.json`](../frontend/vk-hosting-config.json) — `app_id: 54627015`, `static_path: dist`
- Сборка: `VITE_API_URL` из `.env.production` → Railway backend
- Режим dev/prod переопределяется через `MINI_APPS_ENVIRONMENT` в скрипте

## Ограничения VK

- Не более **24 деплоев в сутки**
- Максимальный zip — **300 МБ**

См. также [VK_SETUP.md](./VK_SETUP.md), [DEPLOY.md](./DEPLOY.md).
