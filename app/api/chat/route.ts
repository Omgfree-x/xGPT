import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  const apiKey = process.env.DEEPSEEK_API_KEY!;
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  const upstream = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      stream: true,

      // ✅✅✅ ====== PROMPT / SYSTEM MESSAGE এখানেই দিবেন ====== ✅✅✅
      messages: [
        {
          role: "system",
          content: "তুমি xGPT। পরিষ্কার, সংক্ষিপ্ত এবং বুদ্ধিমানভাবে উত্তর দেবে।",
        },
        ...messages,
      ],
      // ✅✅✅ ================================================

    }),
  });

  if (!upstream.ok || !upstream.body) {
    return new Response("DeepSeek error", { status: 500 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;

          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const token = json.choices?.[0]?.delta?.content;
            if (token) {
              controller.enqueue(encoder.encode(token));
            }
          } catch {}
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
