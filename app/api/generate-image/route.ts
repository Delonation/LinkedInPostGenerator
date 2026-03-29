import { openai } from "@/lib/openai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "No prompt" }, { status: 400 });
  }

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: `LinkedIn post illustration: ${prompt}. Clean, modern, professional. Minimal style. No text or words in the image.`,
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  return NextResponse.json({ url: response.data[0]?.url ?? null });
}
