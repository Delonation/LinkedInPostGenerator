import { openai } from "@/lib/openai";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { topic, postType, length, context, options, profile } =
    await req.json();

  if (!topic?.trim()) {
    return new Response("No topic provided", { status: 400 });
  }

  const lengthMap: Record<string, string> = {
    short: "150–250 words",
    medium: "250–400 words",
    long: "400–600 words",
  };

  const systemPrompt = `You are a LinkedIn ghostwriter for ${profile.name || "a software developer"}.

PROFILE:
- Role: ${profile.role || "Software / Web Developer"}
- Bio: ${profile.bio || "Building things on the web"}
- Skills: ${profile.skills || "React, Next.js, TypeScript, Node.js"}
- Audience: ${profile.audience || "developers, founders, recruiters"}
- Voice: ${profile.voice || "Casual but sharp. Real and direct. No buzzwords."}
- Topics I post about: ${profile.topics || "web dev, freelancing, building in public, AI tools"}

ABSOLUTE RULE, NO EXCEPTIONS: NEVER use em dashes anywhere in the post. Not once. Replace every em dash with a comma, period, colon, or a new line. This is non-negotiable.

STRICT WRITING RULES:
1. Write in first person like a real human, not a corporate press release
2. NEVER use these phrases: "In today's fast-paced world", "Game-changer", "Excited to announce", "Thrilled to share", "Leverage", "Ecosystem", "Paradigm shift", "Holistic approach"
3. Max 2 emojis, and only if they feel completely natural
4. Short punchy sentences. Strategic line breaks for breathing room on mobile.
5. Sound like someone who actually builds things and has real opinions
6. Never sound like an AI wrote it. Avoid overly balanced, diplomatic or safe takes
7. Use specific details over vague claims
8. NEVER use em dashes. Replace with a comma, period, colon, or a new line instead.`;

  const userPrompt = `Write a LinkedIn post about: "${topic}"
Post type: ${postType || "personal insight"}
Target length: ${lengthMap[length] || "250–400 words"}
${context ? `Extra context / story: ${context}` : ""}
${options?.hook ? "- Open with a strong scroll-stopping hook: a bold statement, surprising fact, or provocative question\n" : ""}${options?.cta ? "- End with a subtle but engaging call to action or thought-provoking question\n" : ""}${options?.hashtags ? "- Add 3–5 relevant hashtags at the very end on their own line\n" : ""}
Return ONLY the post text. No title, no explanation, no preamble.`;

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 900,
    temperature: 0.85,
    stream: true,
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) controller.enqueue(encoder.encode(text));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
