# Anuma Telegram Bot Starter

A starter template for building Telegram bots powered by [Anuma](https://anuma.ai). Handles authentication via [Privy](https://privy.io) and supports text and image messages out of the box.

Try the live bot: [@anuma_ai_bot](https://t.me/anuma_ai_bot)

## Quick Start

```bash
git clone https://github.com/anuma-ai/starter-telegram.git

cd starter-telegram

pnpm install

cp .env.example .env    # fill in required values

pnpm dev
```

Get a bot token from [@BotFather](https://t.me/BotFather). The bot works locally without HTTPS — for the Mini App login flow in production, set `AUTH_BASE_URL` to a public HTTPS URL (e.g. via ngrok).

## Environment Variables

See `.env.example` for the Node.js setup and `.dev.vars.example` for Cloudflare Worker local dev.

`TELEGRAM_BOT_TOKEN` and `PRIVY_APP_ID` are required to get started. Everything else has sensible defaults.

## Cloudflare Worker Deployment

The bot can also run as a Cloudflare Worker using webhooks instead of polling. See `wrangler.jsonc` for the configuration. Secrets (`TELEGRAM_BOT_TOKEN`, `BOT_INFO`, `AUTH_BASE_URL`) are set via `wrangler secret put`.

## License

MIT
