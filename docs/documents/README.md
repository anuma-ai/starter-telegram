# Anuma Telegram Bot Starter

A starter template for building Telegram bots powered by [Anuma](https://anuma.ai). Handles authentication via [Privy](https://privy.io) and supports text and image messages out of the box.

Try the live bot: [@anuma_ai_bot](https://t.me/anuma_ai_bot)

## Quick Start

```bash
git clone https://github.com/anuma-ai/starter-telegram.git
cd starter-telegram
pnpm install
cp .env.example .env
```

Fill in the required values in `.env`:

- `TELEGRAM_BOT_TOKEN` — create a bot via [@BotFather](https://t.me/BotFather) and copy the token. Use a separate bot for development — running locally switches the bot to polling mode, which deactivates any existing webhook.
- `PRIVY_APP_ID` — create an app at [Privy Dashboard](https://dashboard.privy.io) with Telegram login enabled

Then start the bot:

```bash
pnpm dev
```

This runs the bot in polling mode with a local auth server on port 9876. When a user triggers `/login`, the bot sends a URL to open in a browser for authentication.

To enable the native Telegram Mini App login button, expose the auth server over HTTPS (e.g. `ngrok http 9876`) and set `AUTH_BASE_URL` in `.env`.

## Environment Variables

See `.env.example` for the full list. Only `TELEGRAM_BOT_TOKEN` and `PRIVY_APP_ID` are required — everything else has sensible defaults. For Cloudflare Worker local dev, see `.dev.vars.example`.

## Cloudflare Worker Deployment

The bot can also run as a Cloudflare Worker using webhooks instead of polling. See `wrangler.jsonc` for the configuration. Secrets (`TELEGRAM_BOT_TOKEN`, `PRIVY_APP_ID`, `BOT_INFO`, `AUTH_BASE_URL`) are set via `wrangler secret put`.

After deploying, point Telegram to your worker's webhook:

```bash
# Set webhook
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<WORKER_URL>/webhook"

# Verify
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## License

MIT
