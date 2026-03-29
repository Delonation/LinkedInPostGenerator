import { postToLinkedIn, clearSession } from "@/lib/linkedin-poster";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { content, mediaPath, clearSessionFirst } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: "No content provided" }, { status: 400 });
  }

  if (clearSessionFirst) {
    clearSession();
  }

  // Save to DB as in-progress
  const post = await prisma.post.create({
    data: { content, mediaPath, status: "posting" },
  });

  try {
    const url = await postToLinkedIn(content, mediaPath);

    const updated = await prisma.post.update({
      where: { id: post.id },
      data: {
        status: "posted",
        linkedInUrl: url,
        postedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, url, post: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    await prisma.post.update({
      where: { id: post.id },
      data: { status: "failed", error: message },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  const posts = await prisma.post.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ posts });
}
