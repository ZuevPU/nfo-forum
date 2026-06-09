# Деплой Frontend на VK Hosting

1. Собрать фронтенд:
   ```bash
   VITE_API_URL=https://api.nfo-forum.example.com npm run build:frontend
   ```

2. В [VK Mini Apps](https://vk.com/apps?act=manage) → Настройки → Загрузить архив из `frontend/dist`.

3. Указать URL backend в production `.env` (`VITE_API_URL`).

4. В настройках Mini App включить подпись launch params; на backend `SKIP_VK_SIGN=false`.

5. GitHub Secrets для cron: `API_URL`, `CRON_SECRET` — см. [DEPLOY.md](./DEPLOY.md).
