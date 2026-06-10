# VK Mini App production settings checklist

Deploy frontend with `npm run deploy:vk` (see [vk-hosting.md](./vk-hosting.md)).

| Команда | Когда | Код подтверждения |
|---------|-------|-------------------|
| `npm run deploy:vk` / `deploy:vk:dev` | Первый деплой, тест | Не нужен |
| `npm run deploy:vk:prod` | Публикация для пользователей | Нужен (или выключить debug в dev.vk.com) |
| `$env:VK_DEPLOY_CONFIRM_CODE="..."` | Код пришёл в «Администрация» | — |

After deploy to VK Hosting:

1. **Размещение** — URL из вывода деплоя (mobile/web/mvk), не Railway и не `vk.com/app54627015`
2. **Подпись launch params** — включить
3. **Секретный ключ** — тот же `VK_APP_SECRET`, что на backend (Railway)
4. **Права** — доступ к сообщениям, загрузка файлов (`VKWebAppUploadFiles`)
5. **Backend API** — `https://nfo-backend-production.up.railway.app`

**Debug-режим:** если в dev.vk.com включён debug, production-деплой требует код от «Администрация». Для первого успешного деплоя используйте `npm run deploy:vk:dev`.

**Чеклист кабинета VK:** [VK_CABINET_CHECKLIST.md](./VK_CABINET_CHECKLIST.md)

Backend env (production):

- `SKIP_VK_SIGN=false`
- `FRONTEND_ORIGIN=https://vk.com`

Manual DevTools checklist: [`scripts/VK_DEVTOOLS_CHECKLIST.md`](../scripts/VK_DEVTOOLS_CHECKLIST.md)
