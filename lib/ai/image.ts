export type GeneratedImage = {
  base64: string;
  tokensUsed: number | null;
};

export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: 1,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI image request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const base64 = data?.data?.[0]?.b64_json;
  if (typeof base64 !== "string") {
    throw new Error("OpenAI image response missing image data");
  }

  const tokensUsed = typeof data?.usage?.total_tokens === "number" ? data.usage.total_tokens : null;

  return { base64, tokensUsed };
}
