# VK Mini App production settings checklist

**Frontend:** Timeweb static (`frontend/dist`). **Backend:** Timeweb `https://zuevpu-nfo-forum-d400.twc1.net`.

## Деплой

```powershell
npm run deploy:frontend:timeweb   # сборка + инструкция загрузки dist
npm run deploy:backend            # сборка backend + миграции + Redeploy в панели
```

Скрипты `npm run deploy:vk:*` — устаревший путь через VK Hosting.

## После выката на Timeweb

1. **Размещение** — URL фронтенда на Timeweb (mobile/web/mvk), не URL backend и не `vk.com/app54627015`
2. **Подпись launch params** — включить
3. **Секретный ключ** — тот же `VK_APP_SECRET`, что на backend (Timeweb)
4. **Права** — доступ к сообщениям, загрузка файлов (`VKWebAppUploadFiles`)
5. **Backend API** — `https://zuevpu-nfo-forum-d400.twc1.net`

**Чеклист кабинета VK:** [VK_CABINET_CHECKLIST.md](./VK_CABINET_CHECKLIST.md)

**Контент в админке:** [ADMIN_CONTENT.md](./ADMIN_CONTENT.md)

Backend env (production):

- `SKIP_VK_SIGN=false`
- `FRONTEND_ORIGIN=https://vk.com`
- `DATABASE_URL` — PostgreSQL на Timeweb

Manual DevTools checklist: [`scripts/VK_DEVTOOLS_CHECKLIST.md`](../scripts/VK_DEVTOOLS_CHECKLIST.md)
