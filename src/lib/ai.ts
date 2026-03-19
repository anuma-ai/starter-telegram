import { runToolLoop, type RunToolLoopOptions } from "@anuma/sdk/server";

type Message = RunToolLoopOptions["messages"][number];

export async function sendMessage(
  token: string,
  messages: Message[],
  options: { signal?: AbortSignal; apiUrl?: string } = {}
): Promise<string> {
  const apiUrl = options.apiUrl || "https://portal.anuma-dev.ai";

  const result = await runToolLoop({
    messages,
    model: "openai/gpt-5.2",
    token,
    baseUrl: apiUrl,
    signal: options.signal,
  });

  if (result.error) {
    const statusCode = "statusCode" in result ? result.statusCode : undefined;
    const prefix = statusCode ? `${statusCode} - ` : "";
    throw new Error(`API request failed: ${prefix}${result.error}`);
  }

  const d = result.data as any;
  const text =
    d?.choices?.[0]?.message?.content ??
    d?.output?.find?.((o: any) => o.type === "message")
      ?.content?.find?.((c: any) => c.type === "output_text")?.text;

  if (text == null) {
    throw new Error("Unexpected response format from runToolLoop");
  }

  return text;
}

export async function chat(
  token: string,
  userMessage: string,
  options: { apiUrl?: string } = {}
): Promise<string> {
  const messages: Message[] = [
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

  const messages: Message[] = [
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
