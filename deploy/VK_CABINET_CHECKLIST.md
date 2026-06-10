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
3. VK DevTools → Network: запросы к `nfo-backend-production.up.railway.app` без CORS-ошибок
4. Backend: `curl https://nfo-backend-production.up.railway.app/api/health`

## 5. Локальная отладка

**VK Tunnel** (`npm run tunnel:vk`) часто даёт `Access denied` — сервис VK отключён. Используйте **Cloudflare**:

```powershell
npm run dev:frontend
npm run tunnel:local
```

Вставьте `https://....trycloudflare.com` в «Размещение» → https://vk.com/app54627015

Диагностика VK Tunnel: `npm run tunnel:diagnose`

Подробнее: [vk-hosting.md](./vk-hosting.md)
