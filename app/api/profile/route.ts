import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const profile = await prisma.profile.upsert({
    where: { id: "main" },
    update: {},
    create: { id: "main" },
  });
  return NextResponse.json({ profile });
}

export async function POST(req: NextRequest) {
  const data = await req.json();

  const profile = await prisma.profile.upsert({
    where: { id: "main" },
    update: {
      name: data.name ?? "",
      role: data.role ?? "",
      bio: data.bio ?? "",
      skills: data.skills ?? "",
      audience: data.audience ?? "",
      voice: data.voice ?? "",
      topics: data.topics ?? "",
    },
    create: {
      id: "main",
      name: data.name ?? "",
      role: data.role ?? "",
      bio: data.bio ?? "",
      skills: data.skills ?? "",
      audience: data.audience ?? "",
      voice: data.voice ?? "",
      topics: data.topics ?? "",
    },
  });

  return NextResponse.json({ profile });
}
