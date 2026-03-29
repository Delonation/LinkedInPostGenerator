# PostStudio 🚀
**AI-powered LinkedIn content engine with Playwright auto-posting**

Built with: Next.js 14 · GPT-4o · Playwright · SQLite + Prisma

Built by [Hammad Abid Hussain](https://www.linkedin.com/in/hammad-abid-hussain/) · hammadabidhussain@hotmail.com

---

## Quick Start

### 1. Install dependencies
```bash
npm install
npx playwright install chromium
```

### 2. Set up your environment
Edit `.env.local` with your credentials:
```
OPENAI_API_KEY=sk-your-openai-key-here
LINKEDIN_EMAIL=you@email.com
LINKEDIN_PASSWORD=yourpassword
DATABASE_URL="file:./dev.db"
```

### 3. Set up the database
```bash
npm run db:push
```

### 4. Run it
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

---

## How it works

### AI Generation
- Fill in your profile (name, role, voice, skills) in the **Profile** tab
- This shapes every post GPT-4o writes — the more detail, the better
- All posts stream in real time

### Auto-posting with Playwright
- Click "Post to LinkedIn ↗" from any generated post
- First run: Playwright logs in with your credentials and saves the session
- All future posts reuse the saved session — no logins, no captchas
- If the session expires, delete `playwright-data/linkedin-session.json` and it re-authenticates

### Tabs
- **Create** — write a post from any topic or idea
- **Article** — find articles and write your take on them
- **Media** — attach an image, describe it, get a post
- **Profile** — your identity that shapes all AI output
- **History** — all posts with their LinkedIn URLs and status

---

## Deploying to Hostinger VPS

```bash
# Build
npm run build

# Install pm2 globally
npm install -g pm2

# Start
pm2 start npm --name poststudio -- start
pm2 save
pm2 startup
```

---

## Troubleshooting

**Login fails / 2FA required**
LinkedIn sometimes requires verification on new IPs. Run Playwright in headed mode once:
```typescript
// In lib/linkedin-poster.ts, temporarily change:
const browser = await chromium.launch({ headless: false });
```
Log in manually, save the session, then switch back to `headless: true`.

**Session expired**
```bash
rm playwright-data/linkedin-session.json
```
Next post will re-authenticate automatically.

**LinkedIn selectors changed**
LinkedIn updates their UI frequently. Check `lib/linkedin-poster.ts` and update the selectors if posting fails.

---

## Project structure
```
poststudio/
├── app/
│   ├── page.tsx                 ← Full UI
│   └── api/
│       ├── generate/route.ts    ← GPT-4o streaming
│       ├── post/route.ts        ← Playwright trigger
│       ├── articles/route.ts    ← Article ideas
│       └── profile/route.ts     ← Profile CRUD
├── lib/
│   ├── openai.ts               ← OpenAI client
│   ├── linkedin-poster.ts      ← Playwright automation
│   └── prisma.ts               ← DB singleton
├── prisma/schema.prisma        ← SQLite schema
├── playwright-data/            ← Session storage (git-ignored)
└── .env.local                  ← Your secrets
```
