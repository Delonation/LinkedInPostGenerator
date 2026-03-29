"use client";

import { useState, useEffect, useRef } from "react";

type Flow = "home" | "link" | "media" | "discover" | "scratch" | "profile" | "history";

interface Profile {
  name: string; role: string; bio: string; skills: string;
  audience: string; voice: string; topics: string;
}
interface Article {
  title: string; source: string; summary: string; url_slug: string;
  url?: string; image?: string | null; isReal?: boolean; category?: string; date?: string | null;
}
interface PostRecord {
  id: string; content: string; status: string; linkedInUrl?: string;
  createdAt: string; postedAt?: string; error?: string;
}
interface LinkMeta {
  title: string | null; description: string | null; image: string | null; domain: string;
}

const defaultProfile: Profile = {
  name: "", role: "Software / Web Developer", bio: "",
  skills: "React, Next.js, TypeScript, Node.js",
  audience: "developers, founders, recruiters",
  voice: "Casual but sharp. Real and direct. No buzzwords. Shares genuine lessons.",
  topics: "web dev, freelancing, building in public, AI tools",
};

export default function PostStudio() {
  const [flow, setFlow] = useState<Flow>("home");
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [profileSaved, setProfileSaved] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState<{ url?: string; error?: string } | null>(null);

  // ── Scratch flow ────────────────────────────────────────────────────
  const [topic, setTopic] = useState("");
  const [postType, setPostType] = useState("insight");
  const [postLen, setPostLen] = useState("medium");
  const [context, setContext] = useState("");
  const [useHashtags, setUseHashtags] = useState(true);
  const [useHook, setUseHook] = useState(true);
  const [useCTA, setUseCTA] = useState(true);
  const [generatedPost, setGeneratedPost] = useState("");
  const [generating, setGenerating] = useState(false);

  // ── Link flow ───────────────────────────────────────────────────────
  const [linkUrl, setLinkUrl] = useState("");
  const [linkMeta, setLinkMeta] = useState<LinkMeta | null>(null);
  const [fetchingLink, setFetchingLink] = useState(false);
  const [linkFetchError, setLinkFetchError] = useState<string | null>(null);
  const [linkTone, setLinkTone] = useState("expand");
  const [linkPostType, setLinkPostType] = useState("insight");
  const [linkImageChoice, setLinkImageChoice] = useState<"article" | "ai" | "upload" | "none">("article");
  const [linkUploadFile, setLinkUploadFile] = useState<File | null>(null);
  const [linkPost, setLinkPost] = useState("");
  const [generatingLinkPost, setGeneratingLinkPost] = useState(false);
  const [linkImage, setLinkImage] = useState<string | null>(null);
  const [generatingLinkImage, setGeneratingLinkImage] = useState(false);
  const linkFileRef = useRef<HTMLInputElement>(null);

  // ── Discover flow ───────────────────────────────────────────────────
  const [articleTopic, setArticleTopic] = useState("");
  const [articleAngle, setArticleAngle] = useState("AI Agents & Automation");
  const [articleTake, setArticleTake] = useState("expand");
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [articlePost, setArticlePost] = useState("");
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [fetchingLive, setFetchingLive] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [articleCategory, setArticleCategory] = useState("All");
  const [generatingArticlePost, setGeneratingArticlePost] = useState(false);
  const [articleImage, setArticleImage] = useState<string | null>(null);
  const [generatingImage, setGeneratingImage] = useState(false);

  // ── Media flow ──────────────────────────────────────────────────────
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaContext, setMediaContext] = useState("");
  const [mediaType, setMediaType] = useState("caption");
  const [mediaVibe, setMediaVibe] = useState("professional");
  const [mediaPost, setMediaPost] = useState("");
  const [generatingMedia, setGeneratingMedia] = useState(false);
  const mediaFileRef = useRef<HTMLInputElement>(null);

  // ── History ─────────────────────────────────────────────────────────
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetch("/api/profile").then(r => r.json()).then(d => { if (d.profile) setProfile({ ...defaultProfile, ...d.profile }); }).catch(() => {});
  }, []);
  useEffect(() => { if (flow === "history") loadHistory(); }, [flow]);

  // ── Helpers ─────────────────────────────────────────────────────────
  async function streamGenerate(body: object, setter: (s: string) => void) {
    const res = await fetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok || !res.body) { setter("Error generating post."); return; }
    const reader = res.body.getReader(); const dec = new TextDecoder(); let full = "";
    while (true) { const { done, value } = await reader.read(); if (done) break; full += dec.decode(value); setter(full); }
  }

  async function handlePost(content: string) {
    if (!content.trim()) { alert("No content to post."); return; }
    if (!window.confirm("Post this to LinkedIn now?")) return;
    setPosting(true); setPostResult(null);
    try {
      const res = await fetch("/api/post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
      const data = await res.json();
      setPostResult(data.success ? { url: data.url } : { error: data.error });
    } catch (e) { setPostResult({ error: String(e) }); } finally { setPosting(false); }
  }

  async function saveProfile() {
    await fetch("/api/profile", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    setProfileSaved(true); setTimeout(() => setProfileSaved(false), 2500);
  }

  async function loadHistory() {
    setLoadingHistory(true);
    try { const res = await fetch("/api/post"); const data = await res.json(); setPosts(data.posts ?? []); } finally { setLoadingHistory(false); }
  }

  // ── Scratch ─────────────────────────────────────────────────────────
  async function generatePost(customTopic?: string) {
    const t = customTopic ?? topic;
    if (!t.trim()) { alert("Enter a topic first."); return; }
    setGenerating(true); setGeneratedPost(""); setPostResult(null);
    try { await streamGenerate({ topic: t, postType, length: postLen, context, options: { hashtags: useHashtags, hook: useHook, cta: useCTA }, profile }, setGeneratedPost); }
    finally { setGenerating(false); }
  }

  // ── Link flow ────────────────────────────────────────────────────────
  async function fetchLinkMeta() {
    if (!linkUrl.trim()) { alert("Paste a URL first."); return; }
    setFetchingLink(true); setLinkMeta(null); setLinkFetchError(null); setLinkPost(""); setLinkImage(null);
    try {
      const res = await fetch("/api/fetch-link", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: linkUrl }) });
      const data = await res.json();
      if (data.error) { setLinkFetchError(data.error); } else { setLinkMeta(data); }
    } catch (e) { setLinkFetchError(String(e)); } finally { setFetchingLink(false); }
  }

  async function generateLinkPost() {
    if (!linkMeta && !linkUrl.trim()) { alert("Fetch the link first."); return; }
    setGeneratingLinkPost(true); setLinkPost(""); setPostResult(null);
    const toneMap: Record<string, string> = {
      agree: "agrees with and expands on this: genuine excitement, why it matters",
      disagree: "respectfully disagrees. Real concern or counter-take with conviction",
      expand: "uses this as a launching pad. Show the human weight: worried, hopeful, dazzled, unsettled",
      relate: "connects this to a personal story. Raw and honest about how it felt",
    };
    try {
      await streamGenerate({
        topic: `${linkMeta?.title ?? linkUrl}`,
        postType: linkPostType, length: "medium",
        context: `Use this article only as inspiration for my own thoughts. My angle: I ${toneMap[linkTone]}. ${linkMeta?.description ? "Article context: " + linkMeta.description : ""} IMPORTANT: Do NOT mention the article, do NOT reference the source, do NOT suggest readers go read it or check the link. This post is purely my own perspective and opinions, not a promotion or summary of any article.`,
        options: { hashtags: true, hook: true, cta: false }, profile,
      }, setLinkPost);
    } finally { setGeneratingLinkPost(false); }
  }

  async function handleLinkImage() {
    setGeneratingLinkImage(true); setLinkImage(null);
    try {
      if (linkImageChoice === "article" && linkMeta?.image) {
        setLinkImage(linkMeta.image);
      } else if (linkImageChoice === "article" && linkUrl) {
        const res = await fetch("/api/article-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: linkUrl }) });
        const d = await res.json(); setLinkImage(d.imageUrl ?? null);
      } else if (linkImageChoice === "ai") {
        const res = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: linkMeta?.title ?? linkPost.slice(0, 120) }) });
        const d = await res.json(); setLinkImage(d.url ?? null);
      } else if (linkImageChoice === "upload" && linkUploadFile) {
        const reader = new FileReader();
        const base64: string = await new Promise(res => { reader.onload = () => res(reader.result as string); reader.readAsDataURL(linkUploadFile!); });
        setLinkImage(base64);
      }
    } finally { setGeneratingLinkImage(false); }
  }

  // ── Discover flow ────────────────────────────────────────────────────
  async function findArticles() {
    if (!articleTopic.trim()) { alert("Enter a topic."); return; }
    setLoadingArticles(true); setArticles([]); setSelectedArticle(null); setArticlePost("");
    try {
      const res = await fetch("/api/articles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: articleTopic, angle: articleAngle, take: articleTake }) });
      const data = await res.json(); setArticles(data.articles ?? []);
    } finally { setLoadingArticles(false); }
  }

  async function fetchLiveArticles() {
    setFetchingLive(true); setFetchError(null); setArticles([]); setSelectedArticle(null); setArticlePost("");
    try {
      const res = await fetch("/api/fetch-posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ topic: articleTopic }) });
      const data = await res.json();
      if (data.error && !data.articles?.length) { setFetchError(data.error); } else { setArticles(data.articles ?? []); }
    } catch (e) { setFetchError(String(e)); } finally { setFetchingLive(false); }
  }

  async function writeArticlePost(article: Article) {
    setSelectedArticle(article); setGeneratingArticlePost(true); setArticlePost(""); setArticleImage(null);
    const toneMap: Record<string, string> = {
      agree: "agrees with and expands on this: genuine excitement, why it matters to you as a developer",
      disagree: "respectfully disagrees. Real concern, frustration, counter-take with conviction",
      expand: "uses this as a launching pad. Show the human weight: worried, hopeful, dazzled, unsettled",
      relate: "connects this to a personal story. Raw and honest about how it made you feel in tech",
    };
    try {
      await streamGenerate({
        topic: `Article reaction: "${article.title}" from ${article.source}`, postType: "insight", length: "medium",
        context: `I ${toneMap[articleTake]}. Article summary: ${article.summary}${article.url ? ". Source: " + article.url : ""}`,
        options: { hashtags: true, hook: true, cta: true }, profile,
      }, setArticlePost);
    } finally { setGeneratingArticlePost(false); }
  }

  async function generateArticleImage(prompt: string) {
    setGeneratingImage(true); setArticleImage(null);
    try { const res = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) }); const d = await res.json(); setArticleImage(d.url ?? null); }
    finally { setGeneratingImage(false); }
  }

  async function fetchArticleImage(url: string) {
    setGeneratingImage(true); setArticleImage(null);
    try { const res = await fetch("/api/article-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }); const d = await res.json(); setArticleImage(d.imageUrl ?? null); }
    finally { setGeneratingImage(false); }
  }

  // ── Media flow ────────────────────────────────────────────────────────
  async function generateFromMedia() {
    setGeneratingMedia(true); setMediaPost("");
    try {
      let imageBase64: string | null = null;
      if (mediaFile?.type.startsWith("image/")) {
        imageBase64 = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(mediaFile!); });
      }
      await streamGenerate({
        topic: mediaFile ? `Photo/video post: ${mediaFile.name}${mediaContext ? ": " + mediaContext : ""}` : mediaContext || "a moment from my work",
        postType: mediaType, length: "short", context: `Vibe: ${mediaVibe}. ${mediaContext}`,
        options: { hashtags: true, hook: true, cta: false }, profile, imageBase64,
      }, setMediaPost);
    } finally { setGeneratingMedia(false); }
  }

  // ── Styles ──────────────────────────────────────────────────────────
  const btn: React.CSSProperties = { fontSize: 13, fontWeight: 500, padding: "7px 14px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", color: "#1a1a1a" };
  const input: React.CSSProperties = { width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, color: "#1a1a1a", background: "#fff", outline: "none", fontFamily: "inherit" };
  const label: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 6, display: "block" };
  const primaryBtn: React.CSSProperties = { ...btn, background: "#0A66C2", color: "white", border: "none", padding: "10px 20px" };
  const card: React.CSSProperties = { background: "#fff", borderRadius: 16, border: "1px solid #e0ddd6", padding: 28 };

  // ── Shared PostOutput ────────────────────────────────────────────────
  const wc = (s: string) => s.trim() ? s.trim().split(/\s+/).length : 0;
  function PostOutput({ content, loading, onPost }: { content: string; loading: boolean; onPost: () => void }) {
    if (!loading && !content) return null;
    return (
      <div style={{ marginTop: 20, background: "#fff", borderRadius: 12, border: "1px solid #e0ddd6", overflow: "hidden" }}>
        {loading && !content && (
          <div style={{ padding: "20px 24px", display: "flex", gap: 10, color: "#888" }}>
            <div style={{ width: 16, height: 16, border: "2px solid #ddd", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: 14 }}>Writing your post...</span>
          </div>
        )}
        {content && (
          <>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #f0ede6", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Your post</span>
                <span style={{ fontSize: 12, color: "#888", background: "#f5f3ef", padding: "2px 8px", borderRadius: 20 }}>{wc(content)} words</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => navigator.clipboard.writeText(content)} style={btn}>Copy</button>
                <button onClick={onPost} disabled={posting} style={{ ...btn, background: posting ? "#ccc" : "#0A66C2", color: "white", border: "none" }}>
                  {posting ? "Posting..." : "Post to LinkedIn ↗"}
                </button>
              </div>
            </div>
            <div style={{ padding: "18px 20px", fontSize: 15, lineHeight: 1.75, color: "#1a1a1a", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{content}</div>
          </>
        )}
        {postResult && (
          <div style={{ padding: "12px 20px", borderTop: "1px solid #f0ede6", background: postResult.error ? "#fff5f5" : "#f0fdf4" }}>
            {postResult.error
              ? <span style={{ fontSize: 13, color: "#dc2626" }}>✕ {postResult.error}</span>
              : <span style={{ fontSize: 13, color: "#16a34a" }}>✓ Posted! {postResult.url && <a href={postResult.url} target="_blank" rel="noreferrer" style={{ color: "#0A66C2", marginLeft: 6 }}>View on LinkedIn →</a>}</span>}
          </div>
        )}
      </div>
    );
  }

  // ── Image panel ──────────────────────────────────────────────────────
  function ImagePanel({ hasArticleUrl, articleUrl, articleImgSrc, aiPrompt, imgSrc, setImgSrc, genLoading, setGenLoading }: {
    hasArticleUrl: boolean; articleUrl?: string; articleImgSrc?: string | null;
    aiPrompt: string; imgSrc: string | null; setImgSrc: (s: string | null) => void;
    genLoading: boolean; setGenLoading: (b: boolean) => void;
  }) {
    async function genAI() { setGenLoading(true); setImgSrc(null); const r = await fetch("/api/generate-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: aiPrompt }) }); const d = await r.json(); setImgSrc(d.url ?? null); setGenLoading(false); }
    async function useArticle() {
      if (articleImgSrc) { setImgSrc(articleImgSrc); return; }
      if (!articleUrl) return;
      setGenLoading(true); setImgSrc(null);
      const r = await fetch("/api/article-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: articleUrl }) }); const d = await r.json(); setImgSrc(d.imageUrl ?? null); setGenLoading(false);
    }
    return (
      <div style={{ marginTop: 16, border: "1px solid #e0ddd6", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0ede6", fontSize: 13, fontWeight: 600 }}>Add an image</div>
        <div style={{ padding: "12px 16px", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {hasArticleUrl && <button onClick={useArticle} disabled={genLoading} style={btn}>⚡ Use article image</button>}
          <button onClick={genAI} disabled={genLoading} style={{ ...btn, background: "#7c3aed", color: "white", border: "none" }}>✦ Generate AI image</button>
        </div>
        {genLoading && <div style={{ padding: "10px 16px", fontSize: 13, color: "#888", display: "flex", gap: 8 }}><div style={{ width: 14, height: 14, border: "2px solid #ddd", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginTop: 1 }} /> Working...</div>}
        {imgSrc && (
          <div style={{ padding: "0 16px 16px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgSrc} alt="" style={{ width: "100%", borderRadius: 8, display: "block" }} />
            <a href={imgSrc} download target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#0A66C2", marginTop: 8, display: "inline-block" }}>Download ↓</a>
          </div>
        )}
      </div>
    );
  }

  const isFlow = flow !== "home" && flow !== "profile" && flow !== "history";
  const flowLabel: Record<Flow, string> = { home: "", link: "I found a link", media: "I have a photo or video", discover: "Browse what's trending", scratch: "Write from scratch", profile: "Profile", history: "History" };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f2ee", padding: "24px 16px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} input:focus,textarea:focus,select:focus{outline:none;border-color:#0A66C2!important;box-shadow:0 0 0 2px rgba(10,102,194,0.15)} button:hover{opacity:0.88}`}</style>

      <div style={{ maxWidth: flow === "discover" ? 1100 : 720, margin: "0 auto", transition: "max-width 0.2s" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <button onClick={() => setFlow("home")} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            <div style={{ width: 38, height: 38, background: "#0A66C2", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="20" height="20" fill="white" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#1a1a1a", lineHeight: 1 }}>PostStudio</div>
              <div style={{ fontSize: 12, color: "#888" }}>LinkedIn content engine</div>
            </div>
          </button>

          {isFlow && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
              <span style={{ color: "#ccc" }}>›</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#0A66C2" }}>{flowLabel[flow]}</span>
            </div>
          )}

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button onClick={() => setFlow("history")} style={{ ...btn, fontSize: 12, padding: "6px 12px", background: flow === "history" ? "#0A66C2" : "#fff", color: flow === "history" ? "white" : "#555", borderColor: flow === "history" ? "#0A66C2" : "#ddd" }}>
              History
            </button>
            <button onClick={() => setFlow("profile")} style={{ ...btn, fontSize: 12, padding: "6px 12px", background: flow === "profile" ? "#0A66C2" : "#fff", color: flow === "profile" ? "white" : "#555", borderColor: flow === "profile" ? "#0A66C2" : "#ddd" }}>
              {profile.name ? `${profile.name.split(" ")[0]}` : "Profile"}
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            HOME SCREEN
        ══════════════════════════════════════════════════════ */}
        {flow === "home" && (
          <div>
            <div style={{ marginBottom: 28, textAlign: "center" }}>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1a1a1a", margin: "0 0 6px" }}>What do you want to post about today?</h2>
              <p style={{ fontSize: 14, color: "#888", margin: 0 }}>Pick a flow and PostStudio will guide you through it.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {[
                {
                  key: "link" as Flow, icon: "🔗",
                  title: "I found something interesting",
                  desc: "Paste any URL: article, tweet, product, blog post. Pick a tone and image, and get a post ready to publish.",
                  color: "#0A66C2",
                },
                {
                  key: "media" as Flow, icon: "📸",
                  title: "I have a photo or video",
                  desc: "Upload your media, describe the moment, and AI writes the perfect caption or story around it.",
                  color: "#7c3aed",
                },
                {
                  key: "discover" as Flow, icon: "🔥",
                  title: "Browse what's trending",
                  desc: "Pull live posts from OpenAI, Anthropic, Google, Apple, TechCrunch and more. React and post.",
                  color: "#dc2626",
                },
                {
                  key: "scratch" as Flow, icon: "✍️",
                  title: "Write from scratch",
                  desc: "Give a topic, choose your style and length, and stream a post tailored to your voice.",
                  color: "#16a34a",
                },
              ].map(({ key, icon, title, desc, color }) => (
                <button
                  key={key}
                  onClick={() => setFlow(key)}
                  style={{ background: "#fff", border: "1px solid #e0ddd6", borderRadius: 14, padding: "22px 20px", textAlign: "left", cursor: "pointer", transition: "all 0.15s", display: "flex", flexDirection: "column", gap: 10 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = color; (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px ${color}22`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "#e0ddd6"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                >
                  <div style={{ fontSize: 28 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", marginBottom: 5 }}>{title}</div>
                    <div style={{ fontSize: 13, color: "#666", lineHeight: 1.55 }}>{desc}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color, marginTop: "auto" }}>Start →</div>
                </button>
              ))}
            </div>
            {posts.length > 0 && (
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <button onClick={() => setFlow("history")} style={{ ...btn, fontSize: 13, color: "#888" }}>
                  View your {posts.length} recent posts →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            LINK FLOW
        ══════════════════════════════════════════════════════ */}
        {flow === "link" && (
          <div style={card}>
            <p style={{ fontSize: 13, color: "#888", marginBottom: 20, marginTop: 0 }}>Paste any URL (article, video, product, tweet) and create a LinkedIn post about it.</p>

            {/* Step 1: URL */}
            <div style={{ marginBottom: 16 }}>
              <label style={label}>Article or page URL</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && fetchLinkMeta()} placeholder="https://..." style={{ ...input, flex: 1 }} />
                <button onClick={fetchLinkMeta} disabled={fetchingLink} style={{ ...btn, background: "#0A66C2", color: "white", border: "none", whiteSpace: "nowrap" }}>
                  {fetchingLink ? "Fetching..." : "Fetch link"}
                </button>
              </div>
              {linkFetchError && <p style={{ fontSize: 13, color: "#dc2626", marginTop: 6 }}>✕ {linkFetchError}</p>}
            </div>

            {/* Link preview card */}
            {linkMeta && (
              <div style={{ marginBottom: 20, border: "1px solid #e0ddd6", borderRadius: 10, overflow: "hidden", display: "flex", gap: 0 }}>
                {linkMeta.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={linkMeta.image} alt="" style={{ width: 120, objectFit: "cover", flexShrink: 0 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div style={{ padding: "14px 16px", flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "#0A66C2", fontWeight: 600, marginBottom: 4 }}>{linkMeta.domain}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", marginBottom: 6, lineHeight: 1.4 }}>{linkMeta.title ?? linkUrl}</div>
                  {linkMeta.description && <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{linkMeta.description}</div>}
                </div>
              </div>
            )}

            {/* Step 2: Tone + Post type */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={label}>Your angle</label>
                <select value={linkTone} onChange={e => setLinkTone(e.target.value)} style={input}>
                  <option value="agree">I agree: expand on it</option>
                  <option value="disagree">I disagree: my take</option>
                  <option value="expand">Use it as a launchpad</option>
                  <option value="relate">I have a related story</option>
                </select>
              </div>
              <div>
                <label style={label}>Post style</label>
                <select value={linkPostType} onChange={e => setLinkPostType(e.target.value)} style={input}>
                  <option value="insight">Personal insight</option>
                  <option value="opinion">Hot take</option>
                  <option value="story">Short story</option>
                  <option value="tips">Tips / takeaways</option>
                </select>
              </div>
            </div>

            {/* Step 3: Image choice */}
            <div style={{ marginBottom: 20 }}>
              <label style={label}>Image for your post</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["article", "ai", "upload", "none"] as const).map(opt => (
                  <button key={opt} onClick={() => setLinkImageChoice(opt)} style={{ ...btn, borderColor: linkImageChoice === opt ? "#0A66C2" : "#ddd", background: linkImageChoice === opt ? "#E7F0FA" : "#fff", color: linkImageChoice === opt ? "#0A66C2" : "#555", fontWeight: linkImageChoice === opt ? 700 : 500 }}>
                    {opt === "article" ? "⚡ Article image" : opt === "ai" ? "✦ AI generate" : opt === "upload" ? "📎 Upload mine" : "No image"}
                  </button>
                ))}
              </div>
              {linkImageChoice === "upload" && (
                <div style={{ marginTop: 10 }}>
                  <input ref={linkFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => setLinkUploadFile(e.target.files?.[0] ?? null)} />
                  {linkUploadFile
                    ? <div style={{ fontSize: 13, color: "#1a1a1a", display: "flex", alignItems: "center", gap: 8 }}><span>📎 {linkUploadFile.name}</span><button onClick={() => setLinkUploadFile(null)} style={{ ...btn, fontSize: 12 }}>Remove</button></div>
                    : <button onClick={() => linkFileRef.current?.click()} style={btn}>Choose file</button>}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={generateLinkPost} disabled={generatingLinkPost || (!linkMeta && !linkUrl.trim())} style={primaryBtn}>
                {generatingLinkPost ? "Writing..." : "✦ Generate post"}
              </button>
              {linkPost && <button onClick={generateLinkPost} disabled={generatingLinkPost} style={btn}>↻ Regenerate</button>}
            </div>

            <PostOutput content={linkPost} loading={generatingLinkPost} onPost={() => handlePost(linkPost)} />

            {linkPost && !generatingLinkPost && (
              <ImagePanel
                hasArticleUrl={!!(linkMeta?.image || linkUrl)}
                articleUrl={linkUrl} articleImgSrc={linkMeta?.image}
                aiPrompt={linkMeta?.title ?? linkPost.slice(0, 120)}
                imgSrc={linkImageChoice !== "none" ? linkImage : null}
                setImgSrc={setLinkImage}
                genLoading={generatingLinkImage} setGenLoading={setGeneratingLinkImage}
              />
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            MEDIA FLOW
        ══════════════════════════════════════════════════════ */}
        {flow === "media" && (
          <div style={card}>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 20px" }}>Upload a photo or video, describe the moment, and AI writes the perfect post.</p>

            {!mediaFile ? (
              <div onClick={() => mediaFileRef.current?.click()} style={{ border: "2px dashed #ccc", borderRadius: 12, padding: "2.5rem", textAlign: "center", cursor: "pointer", background: "#fafafa", marginBottom: 16 }}>
                <input ref={mediaFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => { setMediaFile(e.target.files?.[0] ?? null); setMediaPost(""); }} />
                <div style={{ fontSize: 36, marginBottom: 8 }}>📎</div>
                <p style={{ fontSize: 14, color: "#888", margin: 0 }}><strong style={{ color: "#1a1a1a" }}>Drop your image or video here</strong><br />or click to browse. JPG, PNG, MP4, MOV</p>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f5f3ef", borderRadius: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 24 }}>{mediaFile.type.startsWith("image/") ? "🖼" : "🎬"}</span>
                <div><div style={{ fontSize: 14, fontWeight: 500 }}>{mediaFile.name}</div><div style={{ fontSize: 12, color: "#888" }}>{(mediaFile.size / 1024).toFixed(0)} KB</div></div>
                <button onClick={() => { setMediaFile(null); setMediaPost(""); }} style={{ marginLeft: "auto", ...btn, fontSize: 12 }}>Remove</button>
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={label}>What is this about? <span style={{ fontWeight: 400, color: "#888" }}>(optional but helps)</span></label>
              <textarea value={mediaContext} onChange={e => setMediaContext(e.target.value)} rows={3} placeholder="What's the story? Where was this? What were you working on?" style={{ ...input, resize: "vertical", lineHeight: 1.6 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={label}>Post type</label>
                <select value={mediaType} onChange={e => setMediaType(e.target.value)} style={input}>
                  <option value="caption">Engaging caption</option>
                  <option value="story">Story post</option>
                  <option value="bts">Behind the scenes</option>
                  <option value="lesson">Lesson from this</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>
              <div>
                <label style={label}>Vibe</label>
                <select value={mediaVibe} onChange={e => setMediaVibe(e.target.value)} style={input}>
                  <option value="professional">Professional</option>
                  <option value="raw">Raw & honest</option>
                  <option value="exciting">Exciting energy</option>
                  <option value="reflective">Reflective</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={generateFromMedia} disabled={generatingMedia} style={primaryBtn}>
                {generatingMedia ? "Analyzing..." : "✦ Write post"}
              </button>
              {mediaPost && <button onClick={generateFromMedia} disabled={generatingMedia} style={btn}>↻ Regenerate</button>}
            </div>

            <PostOutput content={mediaPost} loading={generatingMedia} onPost={() => handlePost(mediaPost)} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            DISCOVER FLOW
        ══════════════════════════════════════════════════════ */}
        {flow === "discover" && (
          <div style={card}>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 20px" }}>Browse the latest from OpenAI, Anthropic, Google, Apple and more. Or search a topic. Click any story to write a post.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={label}>Filter topic <span style={{ fontWeight: 400, color: "#888" }}>(optional)</span></label>
                <input value={articleTopic} onChange={e => setArticleTopic(e.target.value)} placeholder="Leave blank for full feed, or type a topic..." style={input} />
              </div>
              <div>
                <label style={label}>Your take on what you read</label>
                <select value={articleTake} onChange={e => setArticleTake(e.target.value)} style={input}>
                  <option value="agree">I agree: expand on it</option>
                  <option value="disagree">I disagree: my take</option>
                  <option value="expand">Use it as a launchpad</option>
                  <option value="relate">I have a related story</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
              <button onClick={fetchLiveArticles} disabled={fetchingLive || loadingArticles} style={primaryBtn}>
                {fetchingLive ? "Fetching..." : "⚡ Fetch latest news"}
              </button>
              <button onClick={findArticles} disabled={loadingArticles || fetchingLive || !articleTopic.trim()} style={{ ...btn, background: "#1d4ed8", color: "white", border: "none", padding: "10px 20px" }}>
                {loadingArticles ? "Generating..." : "✦ AI article ideas for topic"}
              </button>
            </div>

            {fetchError && <div style={{ marginTop: 10, fontSize: 13, color: "#dc2626", background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px" }}>✕ {fetchError}</div>}

            {fetchingLive && articles.length === 0 && (
              <div style={{ marginTop: 16, display: "flex", gap: 10, color: "#888", fontSize: 14 }}>
                <div style={{ width: 16, height: 16, border: "2px solid #ddd", borderTopColor: "#0A66C2", borderRadius: "50%", animation: "spin 0.7s linear infinite", flexShrink: 0, marginTop: 2 }} />
                Fetching from OpenAI, Anthropic, Google, Apple, TechCrunch...
              </div>
            )}

            {/* Two-col layout once articles load */}
            <div style={{ display: "flex", gap: 16, marginTop: articles.length > 0 ? 20 : 0, alignItems: "flex-start" }}>

              {articles.length > 0 && <div style={{ flex: "0 0 52%", minWidth: 0 }}>
                {(() => {
                  const cats = ["All", "AI Labs", "Big Tech", "News"];
                  const filtered = articleCategory === "All" ? articles : articles.filter(a => a.category === articleCategory);
                  const counts: Record<string, number> = { All: articles.length };
                  for (const a of articles) { counts[a.category ?? "News"] = (counts[a.category ?? "News"] ?? 0) + 1; }
                  return (
                    <>
                      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                        {cats.map(c => (
                          <button key={c} onClick={() => setArticleCategory(c)} style={{ fontSize: 12, fontWeight: 600, padding: "4px 11px", borderRadius: 20, border: "1px solid", borderColor: articleCategory === c ? "#0A66C2" : "#ddd", background: articleCategory === c ? "#0A66C2" : "#fff", color: articleCategory === c ? "white" : "#555", cursor: "pointer" }}>
                            {c} {counts[c] ? <span style={{ opacity: 0.75 }}>({counts[c]})</span> : null}
                          </button>
                        ))}
                        <span style={{ fontSize: 11, color: "#aaa", marginLeft: "auto", alignSelf: "center" }}>{filtered.length} stories</span>
                      </div>

                      {selectedArticle && (
                        <div style={{ marginBottom: 12, border: "1px solid #0A66C2", borderRadius: 10, overflow: "hidden", background: "#f0f7ff" }}>
                          {selectedArticle.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={selectedArticle.image} alt="" style={{ width: "100%", maxHeight: 180, objectFit: "cover", display: "block" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          )}
                          <div style={{ padding: "12px 14px" }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 11, fontWeight: 700, background: "#0A66C2", color: "white", padding: "2px 8px", borderRadius: 20 }}>{selectedArticle.source}</span>
                              {selectedArticle.date && <span style={{ fontSize: 11, color: "#aaa", marginLeft: "auto" }}>{new Date(selectedArticle.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
                            </div>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: "0 0 6px", lineHeight: 1.4 }}>{selectedArticle.title}</p>
                            {selectedArticle.summary && <p style={{ fontSize: 12, color: "#555", margin: "0 0 10px", lineHeight: 1.6 }}>{selectedArticle.summary}</p>}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button onClick={() => writeArticlePost(selectedArticle)} disabled={generatingArticlePost} style={{ ...btn, background: "#0A66C2", color: "white", border: "none" }}>
                                {generatingArticlePost ? "Writing..." : "✦ Write post about this"}
                              </button>
                              {selectedArticle.url && <a href={selectedArticle.url} target="_blank" rel="noreferrer" style={{ ...btn, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Open ↗</a>}
                              <button onClick={() => { setSelectedArticle(null); setArticlePost(""); setArticleImage(null); }} style={{ ...btn, marginLeft: "auto" }}>✕</button>
                            </div>
                          </div>
                        </div>
                      )}

                      <div style={{ border: "1px solid #e0ddd6", borderRadius: 10, overflow: "hidden" }}>
                        {filtered.length === 0 && <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "#888" }}>No stories in this category.</div>}
                        {filtered.map((a, i) => {
                          const sel = selectedArticle?.url === a.url;
                          return (
                            <div key={i} onClick={() => setSelectedArticle(sel ? null : a)} style={{ padding: "11px 13px", borderBottom: i < filtered.length - 1 ? "1px solid #f0ede6" : "none", cursor: "pointer", background: sel ? "#E7F0FA" : "#fff", transition: "background 0.15s", display: "flex", gap: 10, alignItems: "flex-start" }}>
                              {a.image
                                ? <img src={a.image} alt="" style={{ width: 68, height: 50, objectFit: "cover", borderRadius: 6, flexShrink: 0, marginTop: 2 }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                                : <div style={{ width: 68, height: 50, borderRadius: 6, background: "#f0ede6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#bbb", fontWeight: 700, textAlign: "center", padding: 4 }}>{a.source.split(" ")[0]}</div>
                              }
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 500, color: sel ? "#0A66C2" : "#1a1a1a", lineHeight: 1.4, marginBottom: 4 }}>{a.title}</div>
                                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: "#555" }}>{a.source}</span>
                                  {a.category && <span style={{ fontSize: 10, background: a.category === "AI Labs" ? "#ede9fe" : a.category === "Big Tech" ? "#dbeafe" : "#fef9c3", color: a.category === "AI Labs" ? "#6d28d9" : a.category === "Big Tech" ? "#1d4ed8" : "#713f12", padding: "1px 6px", borderRadius: 10, fontWeight: 600 }}>{a.category}</span>}
                                  {a.date && <span style={{ fontSize: 10, color: "#bbb" }}>{new Date(a.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                                </div>
                                {a.summary && <div style={{ fontSize: 11, color: "#888", marginTop: 3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{a.summary}</div>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>}

              {(generatingArticlePost || articlePost || generatingImage || articleImage) && (
                <div style={{ flex: 1, minWidth: 0 }}>
                  <PostOutput content={articlePost} loading={generatingArticlePost} onPost={() => handlePost(articlePost)} />
                  {articlePost && !generatingArticlePost && (
                    <ImagePanel
                      hasArticleUrl={!!(selectedArticle?.image || selectedArticle?.url)}
                      articleUrl={selectedArticle?.url} articleImgSrc={selectedArticle?.image}
                      aiPrompt={selectedArticle?.title ?? articlePost.slice(0, 120)}
                      imgSrc={articleImage} setImgSrc={setArticleImage}
                      genLoading={generatingImage} setGenLoading={setGeneratingImage}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            SCRATCH FLOW
        ══════════════════════════════════════════════════════ */}
        {flow === "scratch" && (
          <div style={card}>
            <div style={{ marginBottom: 16 }}>
              <label style={label}>What do you want to post about?</label>
              <textarea value={topic} onChange={e => setTopic(e.target.value)} rows={3} placeholder="e.g. Just shipped a new feature, thoughts on TypeScript vs JavaScript, lessons from a recent client project..." style={{ ...input, resize: "vertical", lineHeight: 1.6 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={label}>Post type</label>
                <select value={postType} onChange={e => setPostType(e.target.value)} style={input}>
                  <option value="insight">Personal insight</option>
                  <option value="story">Short story</option>
                  <option value="tips">Tips / takeaways</option>
                  <option value="opinion">Hot take</option>
                  <option value="milestone">Milestone</option>
                  <option value="lesson">Lesson learned</option>
                </select>
              </div>
              <div>
                <label style={label}>Length</label>
                <select value={postLen} onChange={e => setPostLen(e.target.value)} style={input}>
                  <option value="short">Short (150–250 words)</option>
                  <option value="medium">Medium (250–400 words)</option>
                  <option value="long">Long (400–600 words)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={label}>Extra context <span style={{ fontWeight: 400, color: "#888" }}>(optional)</span></label>
              <input value={context} onChange={e => setContext(e.target.value)} placeholder="Any specific angle, story, or detail to include..." style={input} />
            </div>

            {[
              { l: "Add hook line", s: "Strong first line to stop the scroll", v: useHook, set: setUseHook },
              { l: "End with CTA", s: "Subtle call to action or question", v: useCTA, set: setUseCTA },
              { l: "Add hashtags", s: "3–5 relevant hashtags appended", v: useHashtags, set: setUseHashtags },
            ].map(({ l, s, v, set }) => (
              <div key={l} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #f5f3ef" }}>
                <div><div style={{ fontSize: 14, color: "#1a1a1a", fontWeight: 500 }}>{l}</div><div style={{ fontSize: 12, color: "#888" }}>{s}</div></div>
                <button onClick={() => set(!v)} style={{ width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer", background: v ? "#0A66C2" : "#ddd", position: "relative", transition: "background 0.2s" }}>
                  <span style={{ position: "absolute", top: 3, left: v ? 22 : 3, width: 18, height: 18, borderRadius: "50%", background: "white", transition: "left 0.2s" }} />
                </button>
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => generatePost()} disabled={generating} style={primaryBtn}>{generating ? "Writing..." : "✦ Generate post"}</button>
              {generatedPost && <button onClick={() => generatePost()} disabled={generating} style={btn}>↻ Regenerate</button>}
            </div>

            <PostOutput content={generatedPost} loading={generating} onPost={() => handlePost(generatedPost)} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PROFILE
        ══════════════════════════════════════════════════════ */}
        {flow === "profile" && (
          <div style={card}>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 20px" }}>This shapes every post AI generates. Be specific and honest about your voice.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><label style={label}>Your name</label><input value={profile.name} onChange={e => setProfile({ ...profile, name: e.target.value })} placeholder="Your name" style={input} /></div>
              <div><label style={label}>Role / title</label><input value={profile.role} onChange={e => setProfile({ ...profile, role: e.target.value })} placeholder="e.g. Full-stack developer" style={input} /></div>
            </div>
            {([
              { l: "Short bio", k: "bio", ph: "1–2 sentences. What you do, what you build...", rows: 2 },
              { l: "Skills & stack", k: "skills", ph: "e.g. React, Next.js, Node, TypeScript..." },
              { l: "Your audience", k: "audience", ph: "Who do you want to reach?" },
              { l: "Voice / writing style", k: "voice", ph: "e.g. Casual but sharp. I write like I talk...", rows: 2 },
              { l: "Topics I post about", k: "topics", ph: "e.g. Web dev tips, freelancing, AI tools...", rows: 2 },
            ] as { l: string; k: string; ph: string; rows?: number }[]).map(({ l, k, ph, rows }) => (
              <div key={k} style={{ marginBottom: 16 }}>
                <label style={label}>{l}</label>
                {rows
                  ? <textarea value={(profile as Record<string, string>)[k]} onChange={e => setProfile({ ...profile, [k]: e.target.value })} rows={rows} placeholder={ph} style={{ ...input, resize: "vertical", lineHeight: 1.6 }} />
                  : <input value={(profile as Record<string, string>)[k]} onChange={e => setProfile({ ...profile, [k]: e.target.value })} placeholder={ph} style={input} />}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={saveProfile} style={primaryBtn}>Save profile</button>
              {profileSaved && <span style={{ fontSize: 13, color: "#16a34a" }}>✓ Saved</span>}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            HISTORY
        ══════════════════════════════════════════════════════ */}
        {flow === "history" && (
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: "#666", margin: 0 }}>Your recent posts</p>
              <button onClick={loadHistory} style={btn}>↻ Refresh</button>
            </div>
            {loadingHistory && <div style={{ fontSize: 14, color: "#888", textAlign: "center", padding: 32 }}>Loading...</div>}
            {!loadingHistory && posts.length === 0 && <div style={{ fontSize: 14, color: "#888", textAlign: "center", padding: 40 }}>No posts yet. Create your first one!</div>}
            {posts.map(p => (
              <div key={p.id} style={{ padding: 16, border: "1px solid #e0ddd6", borderRadius: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: p.status === "posted" ? "#dcfce7" : p.status === "failed" ? "#fee2e2" : "#fef9c3", color: p.status === "posted" ? "#166534" : p.status === "failed" ? "#991b1b" : "#713f12" }}>{p.status}</span>
                  <span style={{ fontSize: 12, color: "#888" }}>{new Date(p.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ fontSize: 14, color: "#1a1a1a", lineHeight: 1.6, margin: 0, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.content}</p>
                {p.linkedInUrl && <a href={p.linkedInUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: "#0A66C2", marginTop: 8, display: "inline-block" }}>View on LinkedIn →</a>}
                {p.error && <p style={{ fontSize: 12, color: "#dc2626", marginTop: 6 }}>Error: {p.error}</p>}
              </div>
            ))}
          </div>
        )}

        <p style={{ fontSize: 12, color: "#aaa", textAlign: "center", marginTop: 16 }}>PostStudio · GPT-4o + Playwright · Running locally</p>
      </div>
    </div>
  );
}
