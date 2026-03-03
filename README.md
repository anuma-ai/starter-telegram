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

### Create a Telegram bot

Open [@BotFather](https://t.me/BotFather), run `/newbot`, and copy the token into `TELEGRAM_BOT_TOKEN` in `.env`. Use a separate bot for development — running locally switches the bot to polling mode, which deactivates any existing webhook.

### Expose the auth server

Telegram OAuth requires a public domain, so you need to expose the local auth server (port 9876) over HTTPS. For example, with ngrok:

```bash
ngrok http 9876
```

Copy the HTTPS URL into `AUTH_BASE_URL` in `.env`.

### Configure the bot domain

In [@BotFather](https://t.me/BotFather), go to `/mybots` → your bot → Bot Settings → Domain, and set it to your ngrok domain (without the `https://` prefix). This allows Telegram OAuth to work from your auth page.

### Set up Privy

Create an app at [Privy Dashboard](https://dashboard.privy.io), then:

- Go to Login Methods and enable Telegram
- In the Telegram settings, add your bot token so Privy can verify Telegram auth
- Under Authentication > Advanced, enable "Return user data in an identity token"
- Copy the App ID into `PRIVY_APP_ID` in `.env`

### Create an Anuma app

Sign in at [dashboard.anuma.ai](https://dashboard.anuma.ai/) with the same Privy account and create an app. This provisions the API account that the bot uses for AI responses.

### Run the bot

```bash
pnpm dev
```

This starts the bot in polling mode and a local auth server on port 9876. Send `/login` to your bot in Telegram — it will show a login button that opens the Privy auth flow. After logging in, you can start chatting.

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
