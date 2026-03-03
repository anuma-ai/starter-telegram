type TextContent = { type: "text"; text: string };
type ImageContent = { type: "image_url"; image_url: { url: string } };
type ContentPart = TextContent | ImageContent;

interface ApiMessage {
  role: "user" | "assistant" | "system";
  content: ContentPart[];
}

interface StreamChunk {
  type?: string;
  delta?: string | { OfString?: string };
  output?: Array<{
    type?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
}

export async function sendMessage(
  token: string,
  messages: ApiMessage[],
  options: { signal?: AbortSignal; apiUrl?: string } = {}
): Promise<string> {
  const apiUrl = options.apiUrl || "https://portal.anuma-dev.ai";

  const requestBody = {
    model: "openai/gpt-5.2-2025-12-11",
    input: messages,
    stream: true,
  };

  const response = await fetch(`${apiUrl}/api/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(requestBody),
    signal: options.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  if (!response.body) {
    throw new Error("No response body");
  }

  // Parse SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullResponse = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const chunk: StreamChunk = JSON.parse(data);

          // Handle content delta
          if (chunk.type === "response.output_text.delta" && chunk.delta) {
            const delta = chunk.delta;
            const deltaText = typeof delta === "string" ? delta : delta.OfString;
            if (deltaText) {
              fullResponse += deltaText;
            }
          }

          // Handle non-streaming response output
          if (chunk.output) {
            for (const item of chunk.output) {
              if (item.type === "message" && item.content) {
                for (const part of item.content) {
                  if (part.type === "output_text" && part.text) {
                    fullResponse += part.text;
                  }
                }
              }
            }
          }
        } catch {
          // Skip non-JSON lines
        }
      }
    }
  }

  return fullResponse;
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
  const content: ContentPart[] = [
    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
  ];

  if (caption) {
    content.push({ type: "text", text: caption });
  } else {
    content.push({ type: "text", text: "What's in this image?" });
  }

  const messages: ApiMessage[] = [{ role: "user", content }];
  return sendMessage(token, messages, options);
}
