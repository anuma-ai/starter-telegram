import { Bot, webhookCallback } from "grammy";
import { setupBot } from "./lib/bot.js";
import { handleAuthRequest } from "./lib/auth.js";

export interface Env {
  TELEGRAM_BOT_TOKEN: string;
  BOT_INFO: string;
  AUTH_BASE_URL: string;
  ANUMA_API_URL: string;
  PRIVY_APP_ID: string;
  TOKEN_STORE: KVNamespace;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const kv = env.TOKEN_STORE;

    const getToken = async (userId: number) =>
      (await kv.get(`token:${userId}`)) ?? undefined;
    const setToken = async (userId: number, token: string) => {
      await kv.put(`token:${userId}`, token, { expirationTtl: 86400 });
    };
    const clearToken = async (userId: number) => {
      await kv.delete(`token:${userId}`);
    };

    // Auth routes
    if (
      url.pathname === "/" ||
      url.pathname.startsWith("/login") ||
      url.pathname === "/callback" ||
      request.method === "OPTIONS"
    ) {
      return handleAuthRequest(request, {
        setToken,
        privyAppId: env.PRIVY_APP_ID,
      });
    }

    // Telegram webhook
    if (url.pathname === "/webhook" && request.method === "POST") {
      const bot = new Bot(env.TELEGRAM_BOT_TOKEN, {
        botInfo: JSON.parse(env.BOT_INFO),
      });

      setupBot(bot, {
        getToken,
        setToken,
        clearToken,
        authBaseUrl: env.AUTH_BASE_URL,
        apiUrl: env.ANUMA_API_URL || "https://portal.anuma-dev.ai",
        botToken: env.TELEGRAM_BOT_TOKEN,
      });

      return webhookCallback(bot, "cloudflare-mod")(request);
    }

    return new Response("Not found", { status: 404 });
  },
};
