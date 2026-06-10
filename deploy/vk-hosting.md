# Деплой Frontend на VK Hosting

Официальный способ — [`@vkontakte/vk-miniapps-deploy`](https://dev.vk.com/ru/mini-apps/development/hosting/overview).

На Windows upload идёт через [`deploy-vk-curl.mjs`](./deploy-vk-curl.mjs) (обход `ECONNRESET` в `node-fetch`).

**Node.js:** для сборки нужен **Node 18+** (Vite 6). Документация VK про Node 16 устарела — на Hosting попадает только статика `dist/`.

**Кабинет VK:** [VK_CABINET_CHECKLIST.md](./VK_CABINET_CHECKLIST.md)

## Локальная разработка (tunnel)

**VK Tunnel (`@vkontakte/vk-tunnel`) с октября 2025 часто возвращает `Access denied` (error 15)** — сервис отключён на стороне VK. Проверка: `npm run tunnel:diagnose`.

### Рекомендуется: Cloudflare Quick Tunnel

```powershell
# Терминал 1 — frontend
npm run dev:frontend

# Терминал 2 — HTTPS URL для «Размещение»
npm run tunnel:local
# Если Vite на другом порту: npm run tunnel:local -- -Port 5174
```

Скопируйте `https://....trycloudflare.com` в [dev.vk.com → Размещение](https://dev.vk.com/ru/mini-apps/settings) (mobile / web / mvk) или **Режим разработки**.

### VK Tunnel (если снова заработает)

```powershell
npm run dev:frontend
npm run tunnel:vk -- -ResetAuth
```

OAuth: **сначала** подтвердите вход в браузере, **потом** нажмите Enter в терминале.

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
