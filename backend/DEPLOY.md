# Деплой InStudy Clicker API

## Что нужно
- Аккаунт Cloudflare (бесплатный тариф подходит)
- Установленный `wrangler` (уже есть в проекте)

## Шаг 1: Авторизация
```bash
npx wrangler login --browser false
```
Или через API Token:
```bash
$env:CLOUDFLARE_API_TOKEN = "cfut_ТВОЙ_ТОКЕН"
```

## Шаг 2: Создание KV namespace
```bash
npx wrangler kv namespace create ONLINE_KV
npx wrangler kv namespace create ONLINE_KV --preview
```

Скопируйте полученные `id` и `preview_id` в `wrangler.toml`.

## Шаг 3: Создание D1 базы данных

**ВАЖНО:** Если API Token не имеет прав на D1, создайте через браузер:
1. [dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages → D1
2. Create database → `instudy-clicker-db`
3. Скопируйте Database ID в `wrangler.toml`

## Шаг 4: Миграция схемы
```bash
npx wrangler d1 execute instudy-clicker-db --file=./schema.sql --remote
```

## Шаг 5: Деплой
```bash
npx wrangler deploy
```

После деплоя wrangler выдаст URL вида:
```
https://instudy-clicker-api.YOUR_SUBDOMAIN.workers.dev
```

## Шаг 6: Настройка расширения

1. Откройте `game/api-client.js` и замените:
```js
var API_BASE = 'https://instudy-clicker-api.YOUR_SUBDOMAIN.workers.dev';
```
на ваш реальный URL.

2. Откройте `content.js` и замените:
```js
var apiBase = 'https://instudy-clicker-api.YOUR_SUBDOMAIN.workers.dev';
```
на тот же URL.

3. В `manifest.json` убедитесь, что ваш домен Workers добавлен в `host_permissions`.

## Проверка
- Откройте `https://instudy-clicker-api.YOUR_SUBDOMAIN.workers.dev/api/leaderboard`
- Должен вернуться пустой список: `{"success":true,"period":"all","leaderboard":[]}`
