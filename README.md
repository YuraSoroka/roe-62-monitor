# roe-62-worker

Моніторинг графіка погодинних відключень Рівнеобленерго для підчерги 6.2.
Раз на 10 хв GitHub Actions перевіряє https://www.roe.vsei.ua/disconnections/
і шле повідомлення в Telegram, лише якщо колонка 6.2 змінилась.

## Налаштування
1. @BotFather → `/newbot` → токен. Натиснути **Start** у боті.
2. `https://api.telegram.org/bot<TOKEN>/getUpdates` → `message.chat.id`.
3. Settings → Secrets and variables → Actions: `TG_TOKEN`, `TG_CHAT_ID`.
4. Settings → Actions → General → Workflow permissions → **Read and write**.
5. Actions → «Check ROE schedule 6.2» → Run workflow з `send = true` для перевірки.

Репозиторій має бути публічним, щоб хвилини Actions не лімітувались.

`state.json` комітиться автоматично; `git log state.json` — історія змін графіка.

## Локальна перевірка
```powershell
$env:TG_TOKEN='...'; $env:TG_CHAT_ID='...'; $env:FORCE_SEND='true'; node check.mjs
```
