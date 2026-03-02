import "dotenv/config";
import { Bot, InlineKeyboard } from "grammy";
import { chat, chatWithImage } from "./lib/ai.js";
import { getToken, clearToken, startAuthServer, getWebAppUrl, isHttps } from "./lib/auth.js";

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN environment variable is not set");
  process.exit(1);
}

// Start the auth server for the Mini App
startAuthServer();

const bot = new Bot(token);

bot.command("start", async (ctx) => {
  const userId = ctx.from?.id;
  const userToken = userId ? getToken(userId) : undefined;

  if (userToken) {
    await ctx.reply(
      "Welcome back! You're already logged in. Send me any message and I'll respond using AI."
    );
  } else {
    await sendLoginPrompt(ctx, "Hello! I'm an AI assistant bot.\n\nPlease login to get started:");
  }
});

bot.command("help", (ctx) => {
  ctx.reply(
    "Commands:\n" +
      "/login - Open login Mini App\n" +
      "/logout - Clear your session\n\n" +
      "After logging in, send text or images and I'll process them with AI."
  );
});

async function sendLoginPrompt(
  ctx: { reply: Function; from?: { id: number } },
  message: string
) {
  const webAppUrl = getWebAppUrl();
  const userId = ctx.from?.id;

  if (isHttps()) {
    const keyboard = new InlineKeyboard().webApp("Login", webAppUrl);
    await ctx.reply(message, { reply_markup: keyboard });
  } else {
    // Localhost URLs don't work in Telegram - must use ngrok
    const devUrl = userId ? `${webAppUrl}/login?userId=${userId}` : webAppUrl;
    await ctx.reply(
      `${message}\n\n⚠️ Local dev mode - copy this URL to your browser:\n\n${devUrl}\n\nFor clickable links, run ngrok and set AUTH_BASE_URL`
    );
  }
}

bot.command("login", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Could not identify user.");
    return;
  }

  const existingToken = getToken(userId);
  if (existingToken) {
    await ctx.reply(
      "You are already logged in. Use /logout first if you want to re-authenticate."
    );
    return;
  }

  await sendLoginPrompt(ctx, "Tap the button below to login:");
});

bot.command("logout", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Could not identify user.");
    return;
  }

  const existingToken = getToken(userId);
  if (!existingToken) {
    await ctx.reply("You are not logged in.");
    return;
  }

  clearToken(userId);
  await ctx.reply("You have been logged out.");
});

bot.on("message:text", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Could not identify user.");
    return;
  }

  const userToken = getToken(userId);
  if (!userToken) {
    await sendLoginPrompt(ctx, "Please login first to use the AI assistant:");
    return;
  }

  const userMessage = ctx.message.text;

  // Send typing indicator
  await ctx.replyWithChatAction("typing");

  try {
    const response = await chat(userToken, userMessage);

    if (response) {
      await ctx.reply(response);
    } else {
      await ctx.reply("I received an empty response from the AI.");
    }
  } catch (error) {
    console.error("Error processing message:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("401") || errorMessage.includes("expired")) {
      clearToken(userId);
      await sendLoginPrompt(ctx, "Your session has expired. Please login again:");
    } else {
      await ctx.reply(
        "Sorry, there was an error processing your message. Please try again."
      );
    }
  }
});

bot.on("message:photo", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("Could not identify user.");
    return;
  }

  const userToken = getToken(userId);
  if (!userToken) {
    await sendLoginPrompt(ctx, "Please login first to use the AI assistant:");
    return;
  }

  // Get the largest photo size
  const photo = ctx.message.photo[ctx.message.photo.length - 1];
  const caption = ctx.message.caption;

  // Send typing indicator
  await ctx.replyWithChatAction("typing");

  try {
    // Get file info from Telegram
    const file = await ctx.api.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    // Download the image
    const imageResponse = await fetch(fileUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");

    const response = await chatWithImage(userToken, base64, caption);

    if (response) {
      await ctx.reply(response);
    } else {
      await ctx.reply("I received an empty response from the AI.");
    }
  } catch (error) {
    console.error("Error processing image:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (errorMessage.includes("401") || errorMessage.includes("expired")) {
      clearToken(userId);
      await sendLoginPrompt(ctx, "Your session has expired. Please login again:");
    } else {
      await ctx.reply(
        "Sorry, there was an error processing your image. Please try again."
      );
    }
  }
});

bot.catch((err) => {
  console.error("Bot error:", err);
});

bot.start();
console.log("Bot is running...");
console.log(`Mini App URL: ${getWebAppUrl()}`);
