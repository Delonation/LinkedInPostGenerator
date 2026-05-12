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

BANNED — NEVER USE ANY OF THESE:
- Em dashes (—). Use a comma, period, colon, or line break instead.
- Transition words: "Moreover", "Furthermore", "Additionally", "In conclusion", "Ultimately", "Notably", "Importantly"
- AI clichés: "In today's fast-paced world", "Game-changer", "Excited to announce", "Thrilled to share", "Leverage", "Ecosystem", "Paradigm shift", "Holistic approach", "It's worth noting", "Let's dive in", "At the end of the day", "The reality is", "The truth is"
- Numbered lists or bullet points — write in prose, not list format
- Perfectly balanced takes that present "both sides" with no real opinion
- Rhetorical questions as an opener (e.g. "Have you ever wondered...?")
- Vague filler openers (e.g. "I want to talk about...", "Today I'm sharing...")

WRITING RULES:
1. First person. Real human voice. Specific details, not vague claims.
2. Take an actual stance. Be direct. Don't hedge everything.
3. Short punchy sentences. Strategic line breaks for mobile.
4. Max 2 emojis, only if completely natural — not performative
5. Open with a statement, observation, or moment — not a question
6. The post should read like a text message from someone smart, not a blog post`;

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
        const text = (chunk.choices[0]?.delta?.content ?? "").replace(/—/g, ",");
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
