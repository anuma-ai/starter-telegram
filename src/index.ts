import "dotenv/config";
import http from "http";
import { Bot } from "grammy";
import { setupBot } from "./lib/bot.js";
import { handleAuthRequest, getWebAppUrl } from "./lib/auth.js";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN environment variable is not set");
  process.exit(1);
}

const userTokens = new Map<number, string>();
const getToken = async (userId: number) => userTokens.get(userId);
const setToken = async (userId: number, t: string) => { userTokens.set(userId, t); };
const clearToken = async (userId: number) => { userTokens.delete(userId); };
const authBaseUrl = getWebAppUrl();
const apiUrl = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";
const privyAppId = process.env.PRIVY_APP_ID;

if (!privyAppId) {
  console.error("PRIVY_APP_ID environment variable is not set");
  process.exit(1);
}
const authPort = parseInt(process.env.AUTH_PORT || "9876", 10);

// Start the auth server for the Mini App
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${authPort}`);
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers[key] = Array.isArray(value) ? value.join(", ") : value;
  }

  let body: string | undefined;
  if (req.method === "POST") {
    body = await new Promise<string>((resolve) => {
      let data = "";
      req.on("data", (chunk: Buffer) => (data += chunk.toString()));
      req.on("end", () => resolve(data));
    });
  }

  const request = new Request(url, { method: req.method, headers, body });
  const response = await handleAuthRequest(request, { setToken, privyAppId });

  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(await response.text());
});

server.listen(authPort, () => {
  console.log(`Auth server running on port ${authPort}`);
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`Auth port ${authPort} is already in use`);
  } else {
    console.error(`Auth server error: ${err.message}`);
  }
});

// Set up and start the bot
const bot = new Bot(token);
setupBot(bot, { getToken, setToken, clearToken, authBaseUrl, apiUrl, botToken: token });

bot.start();
console.log("Bot is running...");
console.log(`Mini App URL: ${authBaseUrl}`);
