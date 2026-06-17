# Чеклист настроек в dev.vk.com

Приложение: **54627015** — [Форум неформального образования](https://vk.com/app54627015)

## 1. Размещение (обязательно)

[dev.vk.com → Настройки → Размещение](https://dev.vk.com/ru/mini-apps/settings)

После `npm run deploy:vk:dev` скопируйте URL из терминала:

| Поле в кабинете | URL из деплоя |
|-----------------|---------------|
| Мобильное приложение | `mobile` или `mobile_dev` |
| Десктопная версия | `web` или `web_dev` |
| Мобильная версия сайта | `mvk` или `mvk_dev` |

**Не использовать:** Railway URL, `https://vk.com/app54627015`.

Если деплoy завершился timeout — в терминале может быть блок «Текущие URL из apps.get».

**Состояние для пользователей:** «Отключено» (только админы) или «Включено».

## 2. Подпись параметров запуска

[dev.vk.com → Разработка](https://dev.vk.com/ru/mini-apps/settings)

- [ ] Включить **подпись launch params**
- [ ] **Защищённый ключ** = тот же `VK_APP_SECRET`, что на Railway (`nfo-backend`)
- [ ] На Railway: `SKIP_VK_SIGN=false`

Без совпадения ключей API вернёт `403 Invalid VK signature`.

## 3. Debug-режим

Если включён debug — production-деплой требует код от «Администрация».

Для первого запуска используйте `npm run deploy:vk:dev` (код не нужен).

## 4. Проверка после настройки

1. Откройте https://vk.com/app54627015 под аккаунтом администратора
2. Splash должен исчезнуть в течение 30 секунд (`VKWebAppInit`)
3. VK DevTools → Network: запросы к `zuevpu-nfo-forum-d400.twc1.net` без CORS-ошибок
4. Backend: `curl https://zuevpu-nfo-forum-d400.twc1.net/api/health`

## 5. Локальная отладка

**VK Tunnel** (`npm run tunnel:vk`) часто даёт `Access denied` — сервис VK отключён. Используйте **Cloudflare**:

```powershell
npm run dev:frontend
npm run tunnel:local
```

Вставьте `https://....trycloudflare.com` в «Размещение» → https://vk.com/app54627015

Диагностика VK Tunnel: `npm run tunnel:diagnose`

Подробнее: [vk-hosting.md](./vk-hosting.md)

## 6. Личные сообщения от сообщества (push)

Уведомления отправляются через `messages.send` от сообщества. Без этих шагов пользователи не получат ЛС.

### Мини-приложение 54627015

[dev.vk.com → Настройки → Информация](https://dev.vk.com/ru/mini-apps/settings)

- [ ] **Официальное сообщество** = [club231468147](https://vk.com/club231468147) (ID `231468147`)
- [ ] Настройки → Оформление → **иконка для сниппетов** (для ссылок в сообщениях)

### Сообщество 231468147

- [ ] Управление → **Сообщения** → сообщения сообщества **включены**
- [ ] Дополнительно → Работа с API → ключ с правом **«Разрешить приложению доступ к сообщениям сообщества»**
- [ ] Этот ключ = `VK_GROUP_TOKEN` на сервере (Timeweb)
- [ ] `API_PUBLIC_URL=https://zuevpu-nfo-forum-d400.twc1.net` на backend (Timeweb → переменные окружения) — для загрузки фото в рассылках

### Frontend env

- [ ] `VITE_VK_GROUP_ID=231468147` при сборке фронтенда
- [ ] `VITE_VK_APP_ID=54627015`

### База данных

Применить миграцию:

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS messages_from_group_allowed boolean DEFAULT false NOT NULL;
```

Файл: [backend/drizzle/0002_messages_from_group.sql](../backend/drizzle/0002_messages_from_group.sql)

### Проверка end-to-end

1. Открыть приложение → разрешить **сообщения от сообщества** (диалог VK или Настройки → переключатель)
2. Админка → Push → тестовое сообщение себе
3. В личке VK должно прийти сообщение от сообщества с ссылкой «Открыть приложение»
4. GitHub Actions → `morning-greeting` → в логе JSON `{ "ok": true, "sent": N }` без `vkError`

Синхронизация cron-секрета: `.\deploy\set-github-secrets.ps1`
