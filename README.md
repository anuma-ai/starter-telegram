# Anuma Telegram Bot Template

A Telegram bot template that uses [Anuma](https://anuma.ai) for AI responses and [Privy](https://privy.io) for authentication.

## Features

- Telegram bot with AI-powered responses
- Privy authentication (Telegram Mini App or email)
- Per-user session management
- Streaming AI responses

## Prerequisites

- Node.js 18+
- pnpm
- A Telegram bot token (from [@BotFather](https://t.me/BotFather))
- A Privy app ID (from [Privy Dashboard](https://dashboard.privy.io))
- An Anuma API token

## Quick Start

1. Clone and install:

```bash
git clone <repo-url>
cd ai-telegram
pnpm install
```

2. Copy environment file and configure:

```bash
cp .env.example .env
```

3. Configure your `.env` file (see Configuration below)

4. Run the bot:

```bash
pnpm dev
```

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `AUTH_BASE_URL` | Public HTTPS URL for the auth server (required for Mini App) |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ANUMA_API_URL` | `https://portal.anuma-dev.ai` | Anuma API endpoint |
| `PRIVY_APP_ID` | Built-in app ID | Your Privy application ID |
| `AUTH_PORT` | `9876` | Port for the auth server |

## Setup Guide

### 1. Create a Telegram Bot

1. Open [@BotFather](https://t.me/BotFather) in Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token to `TELEGRAM_BOT_TOKEN`

### 2. Configure Privy (Optional)

If you want to use your own Privy app:

1. Create an app at [Privy Dashboard](https://dashboard.privy.io)
2. Enable Telegram and Email login methods
3. Add your Telegram bot token to Privy
4. Set your domain in Privy's allowed origins
5. Copy the App ID to `PRIVY_APP_ID`

### 3. Set Up Public URL

The Telegram Mini App requires an HTTPS URL. Options:

**For Development (ngrok):**

```bash
ngrok http 9876
```

Then set `AUTH_BASE_URL` to the ngrok HTTPS URL.

**For Production:**

Deploy to a server with HTTPS and set `AUTH_BASE_URL` to your domain.

### 4. Configure Bot Domain (for Mini App)

In @BotFather:

1. Send `/mybots`
2. Select your bot
3. Go to "Bot Settings" → "Menu Button" or "Configure Mini App"
4. Set the URL to your `AUTH_BASE_URL`

## Project Structure

```
src/
├── index.ts           # Bot entry point and command handlers
└── lib/
    ├── ai.ts          # Anuma API client
    └── auth.ts        # Privy auth server and token storage
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and login prompt |
| `/login` | Open login Mini App |
| `/logout` | Clear session |
| `/help` | Show available commands |

## Customization

### Changing the AI Model

Edit `src/lib/ai.ts` and modify the `model` field in the request:

```typescript
const requestBody = {
  model: "openai/gpt-5.2-2025-12-11", // Change this
  input: apiMessages,
  stream: true,
};
```

### Adding System Prompts

Modify the `chat` function in `src/lib/ai.ts`:

```typescript
export async function chat(token: string, userMessage: string): Promise<string> {
  const messages: Message[] = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: userMessage }
  ];
  return sendMessage(token, messages);
}
```

### Customizing the Login Page

Edit the `getMiniAppPage` function in `src/lib/auth.ts` to customize styling or add branding.

## Development

```bash
# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

## Deployment

1. Build the project: `pnpm build`
2. Set all environment variables on your server
3. Run with: `node dist/index.js`

Or use Docker/PM2 for process management.

## License

MIT
