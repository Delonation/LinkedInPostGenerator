import { openai } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { topic, angle, take } = await req.json();

  if (!topic?.trim()) {
    return NextResponse.json({ error: "No topic" }, { status: 400 });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You generate realistic tech article ideas for LinkedIn content creation. It is currently 2026. Return only valid JSON. No markdown, no explanation, no code fences.",
      },
      {
        role: "user",
        content: `Generate 4 realistic article ideas about "${topic}" in the "${angle}" space. Set in 2026. Reflect current trends like AI agents, multimodal models, edge AI, vibe coding, post-LLM tooling, etc. where relevant.
These should feel like real articles from Hacker News, Dev.to, The Pragmatic Engineer, Bytes.dev, or a popular tech blog published in early 2026.
The "take" the poster wants: ${take}

Return a JSON array with this shape:
[{"title": "...", "source": "...", "summary": "one sentence description", "url_slug": "kebab-case-slug"}]

Only return the JSON array. Nothing else.`,
      },
    ],
    max_tokens: 600,
    temperature: 0.8,
  });

  const raw = completion.choices[0]?.message?.content ?? "[]";

  try {
    const articles = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return NextResponse.json({ articles });
  } catch {
    return NextResponse.json({ error: "Parse error", raw }, { status: 500 });
  }
}
