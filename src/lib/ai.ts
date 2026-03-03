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

async function parseSSEStream(
  body: ReadableStream<Uint8Array>,
  format: "responses" | "completions"
): Promise<string> {
  const reader = body.getReader();
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
          const chunk = JSON.parse(data);

          if (format === "responses") {
            // Responses API streaming format
            if (chunk.type === "response.output_text.delta" && chunk.delta) {
              const delta = chunk.delta;
              const deltaText =
                typeof delta === "string" ? delta : delta.OfString;
              if (deltaText) {
                fullResponse += deltaText;
              }
            }

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
          } else {
            // Chat Completions streaming format
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) {
              fullResponse += delta;
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

export async function sendMessage(
  token: string,
  messages: ApiMessage[],
  options: { signal?: AbortSignal; apiUrl?: string } = {}
): Promise<string> {
  const apiUrl = options.apiUrl || "https://portal.anuma-dev.ai";

  const requestBody = {
    model: "openai/gpt-5.2",
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

  return parseSSEStream(response.body, "responses");
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
