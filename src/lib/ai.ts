import { runToolLoop } from "@anuma/sdk/server";

type TextContent = { type: "text"; text: string };
type ImageContent = {
  type: "image_url";
  image_url: { url: string; detail?: "high" | "low" };
};
type ContentPart = TextContent | ImageContent;

interface ApiMessage {
  role: "user" | "assistant" | "system";
  content: ContentPart[];
}

export async function sendMessage(
  token: string,
  messages: ApiMessage[],
  options: { signal?: AbortSignal; apiUrl?: string } = {}
): Promise<string> {
  const apiUrl = options.apiUrl || "https://portal.anuma-dev.ai";

  const result = await runToolLoop({
    messages: messages as any,
    model: "openai/gpt-5.2",
    token,
    baseUrl: apiUrl,
    signal: options.signal,
  });

  if (result.error) {
    throw new Error(`API request failed: ${result.error}`);
  }

  const d = result.data as any;
  return (
    d?.choices?.[0]?.message?.content ??
    d?.output?.find?.((o: any) => o.type === "message")
      ?.content?.find?.((c: any) => c.type === "output_text")?.text ??
    ""
  );
}

export async function chat(
  token: string,
  userMessage: string,
  options: { apiUrl?: string } = {}
): Promise<string> {
  const messages: ApiMessage[] = [
    { role: "user", content: [{ type: "text", text: userMessage }] },
  ];
  return sendMessage(token, messages, options);
}

export async function chatWithImage(
  token: string,
  imageBase64: string,
  caption?: string,
  options: { apiUrl?: string } = {}
): Promise<string> {
  const text = caption || "What's in this image?";

  const messages: ApiMessage[] = [
    {
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${imageBase64}`,
            detail: "high",
          },
        },
        { type: "text", text },
      ],
    },
  ];

  return sendMessage(token, messages, options);
}
