import { NextRequest, NextResponse } from "next/server";

const RSS_SOURCES = [
  // AI Labs
  { name: "OpenAI Blog",      url: "https://openai.com/blog/rss.xml",                                        category: "AI Labs" },
  { name: "Anthropic",        url: "https://www.anthropic.com/rss.xml",                                      category: "AI Labs" },
  { name: "Google AI Blog",   url: "https://blog.google/technology/ai/rss/",                                 category: "AI Labs" },
  { name: "Google DeepMind",  url: "https://deepmind.google/blog/rss.xml",                                   category: "AI Labs" },
  // Big Tech
  { name: "Apple Newsroom",   url: "https://www.apple.com/newsroom/rss-feed.rss",                            category: "Big Tech" },
  { name: "Microsoft Blog",   url: "https://blogs.microsoft.com/feed/",                                      category: "Big Tech" },
  { name: "Meta AI",          url: "https://ai.meta.com/blog/rss/",                                          category: "Big Tech" },
  // News & Analysis
  { name: "TechCrunch AI",    url: "https://techcrunch.com/category/artificial-intelligence/feed/",          category: "News" },
  { name: "The Verge AI",     url: "https://www.theverge.com/ai-artificial-intelligence/rss/index.xml",      category: "News" },
  { name: "Wired AI",         url: "https://www.wired.com/feed/tag/ai/latest/rss",                           category: "News" },
  { name: "VentureBeat AI",   url: "https://venturebeat.com/category/ai/feed/",                              category: "News" },
  { name: "MIT Tech Review",  url: "https://www.technologyreview.com/feed/",                                 category: "News" },
];

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/rss+xml, application/xml, text/xml, */*",
};

function unescape(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, "").trim();
}

function getTag(chunk: string, tag: string): string {
  const m = chunk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m ? unescape(m[1]) : "";
}

function getAttr(chunk: string, pattern: RegExp): string {
  return chunk.match(pattern)?.[1] ?? "";
}

function extractImage(item: string): string | null {
  return (
    getAttr(item, /media:content[^>]+url=["']([^"']+)["']/i) ||
    getAttr(item, /media:thumbnail[^>]+url=["']([^"']+)["']/i) ||
    getAttr(item, /enclosure[^>]+url=["']([^"']+(?:jpg|jpeg|png|webp)[^"']*)["']/i) ||
    getAttr(item, /<img[^>]+src=["']([^"']+)["']/i) ||
    null
  );
}

function parseDate(item: string): string | null {
  const raw = getTag(item, "pubDate") || getTag(item, "published") || getTag(item, "updated");
  if (!raw) return null;
  try {
    return new Date(raw).toISOString();
  } catch { return null; }
}

function parseRSS(xml: string, sourceName: string, category: string) {
  const itemRe = /<item[\s>]([\s\S]*?)<\/item>|<entry[\s>]([\s\S]*?)<\/entry>/gi;
  const items: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) items.push(m[1] || m[2]);

  return items.slice(0, 6).map((item) => {
    const title = getTag(item, "title");
    const link =
      getAttr(item, /<link[^>]+href=["']([^"']+)["']/i) ||
      getTag(item, "link").replace(/\s/g, "");
    const summary = (getTag(item, "description") || getTag(item, "summary") || getTag(item, "content")).slice(0, 300);
    const image = extractImage(item);
    const date = parseDate(item);
    if (!title || !link) return null;
    return { title, source: sourceName, category, summary: summary || "", url: link, image, url_slug: link, isReal: true, date };
  }).filter(Boolean);
}

async function fetchRSS(source: { name: string; url: string; category: string }) {
  const res = await fetch(source.url, { headers: FETCH_HEADERS, cache: "no-store" });
  if (!res.ok) return [];
  const xml = await res.text();
  return parseRSS(xml, source.name, source.category);
}

async function hnSearch(query: string) {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=12`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.hits ?? [])
    .filter((h: { url?: string; title?: string }) => h.url && h.title)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((h: any) => {
      let source = "Hacker News";
      try { source = new URL(h.url).hostname.replace(/^www\./, ""); } catch {}
      return { title: h.title, source, category: "News", summary: `${h.points ?? 0} points · ${h.num_comments ?? 0} comments`, url: h.url, image: null, url_slug: String(h.objectID), isReal: true, date: null };
    });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const topic: string = body.topic ?? "";

    if (topic.trim()) {
      const results = await hnSearch(topic.trim());
      return NextResponse.json({ articles: results.slice(0, 12) });
    }

    const results = await Promise.allSettled(RSS_SOURCES.map(fetchRSS));

    const seen = new Set<string>();
    const combined: object[] = [];

    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      for (const article of result.value) {
        if (!article) continue;
        const key = (article as { url: string }).url;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(article);
        }
      }
    }

    if (combined.length === 0) {
      return NextResponse.json({ articles: [], error: "Could not reach news sources. Check your internet connection." });
    }

    // Sort by date descending (most recent first)
    combined.sort((a, b) => {
      const da = (a as { date?: string | null }).date;
      const db = (b as { date?: string | null }).date;
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return new Date(db).getTime() - new Date(da).getTime();
    });

    return NextResponse.json({ articles: combined });
  } catch (err) {
    console.error("[fetch-posts]", err);
    return NextResponse.json({ articles: [], error: "Failed to fetch articles" }, { status: 500 });
  }
}
