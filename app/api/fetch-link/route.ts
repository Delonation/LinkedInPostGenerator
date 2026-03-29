import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json().catch(() => ({}));
  if (!url?.trim()) return NextResponse.json({ error: "No URL" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return NextResponse.json({ error: `Failed to fetch (${res.status})` }, { status: 400 });
    const html = await res.text();

    function getMeta(patterns: RegExp[]): string | null {
      for (const p of patterns) {
        const m = html.match(p);
        if (m?.[1]?.trim()) return m[1].trim();
      }
      return null;
    }

    const title = getMeta([
      /property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
      /<title[^>]*>([^<]+)<\/title>/i,
    ]);

    const description = getMeta([
      /property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
      /name=["']description["'][^>]+content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]+name=["']description["']/i,
    ]);

    const image = getMeta([
      /property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ]);

    let domain = url;
    try { domain = new URL(url).hostname.replace(/^www\./, ""); } catch {}

    return NextResponse.json({ title, description, image, domain });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
