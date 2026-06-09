# VK Mini App production settings checklist

After uploading `frontend-dist.zip` to [VK Mini Apps](https://vk.com/apps?act=manage):

1. **URL приложения** — URL VK Hosting после загрузки архива
2. **Подпись launch params** — включить
3. **Секретный ключ** — тот же `VK_APP_SECRET`, что на backend (Fly/Railway)
4. **Права** — доступ к сообщениям, загрузка файлов (`VKWebAppUploadFiles`)
5. **Backend API** — `https://nfo-backend-production.up.railway.app` (или ваш Fly URL)

Backend env (production):

- `SKIP_VK_SIGN=false`
- `FRONTEND_ORIGIN=https://vk.com`

Manual DevTools checklist: [`scripts/VK_DEVTOOLS_CHECKLIST.md`](../scripts/VK_DEVTOOLS_CHECKLIST.md)
