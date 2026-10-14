// mistral.ts
// Sends a prompt to Mistral. The key comes from the environment (.env), never from the code!

export async function askMistral(prompt: string): Promise<string | null> {
  const apiKey = Deno.env.get("MISTRAL_API_KEY");
  if (!apiKey) {
    console.error("MISTRAL_API_KEY not set");
    return null;
  }

  const model = Deno.env.get("MISTRAL_MODEL") ?? "mistral-small-latest";
  const temperature = Number(Deno.env.get("MISTRAL_TEMPERATURE") ?? "0.7");
  const max_tokens = Number(Deno.env.get("MISTRAL_MAX_TOKENS") ?? "60");
  const timeoutMs = Number(Deno.env.get("MISTRAL_TIMEOUT_MS") ?? "8000");
  const maxRetries = Number(Deno.env.get("MISTRAL_RETRIES") ?? "2");

  const endpoint = "https://api.mistral.ai/v1/chat/completions";

  const backoffMs = (attempt: number) => Math.min(1000 * 2 ** attempt + Math.floor(Math.random() * 300), 8000);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Mistral HTTP ${res.status}: ${body}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? "";
      return String(content).trim().replace(/^"|"$/g, "");
    } catch (err: any) {
      clearTimeout(timeout);
      console.error(`Mistral attempt ${attempt + 1} failed:`, err?.message ?? err);
      if (attempt === maxRetries) return null;
      await new Promise((r) => setTimeout(r, backoffMs(attempt)));
    }
  }

  return null;
}