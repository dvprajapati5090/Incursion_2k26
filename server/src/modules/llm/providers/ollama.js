import { env } from "../../../config/env.js";

export async function generateJson({ system, prompt }) {
  const res = await fetch(`${env.llm.ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model: env.llm.ollamaModel,
      stream: false,
      format: "json",
      options: { temperature: 0, seed: 42 },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok)
    throw Object.assign(new Error(`ollama_http_${res.status}`), {
      status: res.status,
    });
  return (await res.json()).message.content;
}
