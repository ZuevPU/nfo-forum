# Frontend: Timeweb (основной) и VK Hosting (устаревший)

**Production:** frontend — статика на **Timeweb**, backend — Node на Timeweb. См. [TIMEWEB.md](./TIMEWEB.md).

## Деплой на Timeweb (рекомендуется)

```powershell
npm run deploy:frontend:timeweb
# или только сборка:
npm run build:frontend:prod
```

1. Скрипт собирает `frontend/dist` с `VITE_API_URL=https://zuevpu-nfo-forum-d400.twc1.net`
2. Залейте содержимое `frontend/dist` на Timeweb (статическое приложение)
3. В [dev.vk.com → Размещение](https://dev.vk.com/ru/mini-apps/settings) укажите HTTPS URL фронтенда на Timeweb

Чеклист кабинета: [VK_CABINET_CHECKLIST.md](./VK_CABINET_CHECKLIST.md)

## Локальная разработка (tunnel)

**VK Tunnel** (`@vkontakte/vk-tunnel`) с октября 2025 часто возвращает `Access denied` (error 15). Проверка: `npm run tunnel:diagnose`.

### Рекомендуется: Cloudflare Quick Tunnel

```powershell
# Терминал 1 — frontend
npm run dev:frontend

# Терминал 2 — HTTPS URL для «Размещение»
npm run tunnel:local
```

Скопируйте `https://....trycloudflare.com` в [dev.vk.com → Размещение](https://dev.vk.com/ru/mini-apps/settings).

### VK Tunnel (если снова заработает)

```powershell
npm run dev:frontend
npm run tunnel:vk -- -ResetAuth
```

## VK Hosting (устаревший путь)

Если когда-либо понадобится VK Hosting — [`@vkontakte/vk-miniapps-deploy`](https://dev.vk.com/ru/mini-apps/development/hosting/overview).

На Windows upload идёт через [`deploy-vk-curl.mjs`](./deploy-vk-curl.mjs).

| Команда | Режим |
|---------|-------|
| `npm run deploy:vk:dev` | dev |
| `npm run deploy:vk:prod` | production (может требовать код) |

Для production проекта **не используйте** — Timeweb static + `VK_CABINET_CHECKLIST.md`.

См. также [VK_SETUP.md](./VK_SETUP.md), [DEPLOY.md](./DEPLOY.md).
