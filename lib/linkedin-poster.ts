import { chromium, Browser, BrowserContext } from "playwright";
import path from "path";
import fs from "fs";

const SESSION_PATH = path.join(
  process.cwd(),
  "playwright-data",
  "linkedin-session.json"
);

async function getContext(browser: Browser): Promise<BrowserContext> {
  // Reuse saved session. Only logs in once.
  if (fs.existsSync(SESSION_PATH)) {
    console.log("[PostStudio] Reusing saved LinkedIn session");
    return browser.newContext({ storageState: SESSION_PATH });
  }

  console.log("[PostStudio] No session found. Logging in to LinkedIn...");
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto("https://www.linkedin.com/login");
  await page.fill("#username", process.env.LINKEDIN_EMAIL!);
  await page.fill("#password", process.env.LINKEDIN_PASSWORD!);
  await page.click('[type="submit"]');

  // Handle potential 2FA or checkpoint. Wait up to 30s.
  await page.waitForURL("**/feed**", { timeout: 30000 }).catch(() => {
    throw new Error(
      "LinkedIn login failed or requires 2FA. Check your credentials or log in manually once."
    );
  });

  fs.mkdirSync(path.dirname(SESSION_PATH), { recursive: true });
  await context.storageState({ path: SESSION_PATH });
  console.log("[PostStudio] Session saved successfully");

  return context;
}

export async function postToLinkedIn(
  content: string,
  mediaPath?: string
): Promise<string> {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await getContext(browser);
    const page = await context.newPage();

    console.log("[PostStudio] Navigating to LinkedIn feed...");
    await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);

    // Click "Start a post". Try multiple selectors for resilience.
    const startPostSelectors = [
      '[data-control-name="share.sharebox_text"]',
      ".share-box-feed-entry__trigger",
      '[placeholder*="Start a post"]',
      "button:has-text('Start a post')",
    ];

    let clicked = false;
    for (const sel of startPostSelectors) {
      try {
        await page.click(sel, { timeout: 5000 });
        clicked = true;
        break;
      } catch {}
    }
    if (!clicked) throw new Error("Could not find 'Start a post' button");

    // Wait for the editor
    await page.waitForSelector(".ql-editor", { timeout: 10000 });
    await page.waitForTimeout(800);

    console.log("[PostStudio] Typing post content...");
    await page.click(".ql-editor");

    // Type content. Use clipboard for speed and accuracy.
    await page.evaluate((text) => {
      const editor = document.querySelector(".ql-editor") as HTMLElement;
      if (editor) {
        editor.focus();
        document.execCommand("insertText", false, text);
      }
    }, content);

    await page.waitForTimeout(500);

    // Attach media if provided
    if (mediaPath && fs.existsSync(mediaPath)) {
      console.log("[PostStudio] Attaching media...");
      try {
        const mediaBtn = page
          .locator('[aria-label*="photo"]')
          .or(page.locator('[aria-label*="Add a photo"]'))
          .first();
        await mediaBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);

        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(mediaPath);
        await page.waitForTimeout(3000);
        console.log("[PostStudio] Media attached");
      } catch (e) {
        console.warn("[PostStudio] Media attach failed, posting without media:", e);
      }
    }

    // Click Post button
    console.log("[PostStudio] Clicking Post button...");
    const postBtn = page
      .locator("button.share-actions__primary-action")
      .or(page.locator("button:has-text('Post')").last());

    await postBtn.waitFor({ state: "visible", timeout: 10000 });
    await postBtn.click();
    await page.waitForTimeout(4000);

    // Try to grab the confirmation URL
    let postUrl = "https://www.linkedin.com/feed/";
    try {
      const toast = page.locator(".artdeco-toast-item__link");
      if (await toast.isVisible({ timeout: 5000 })) {
        postUrl = (await toast.getAttribute("href")) ?? postUrl;
      }
    } catch {}

    // Persist the refreshed session
    await context.storageState({ path: SESSION_PATH });
    await context.close();

    console.log("[PostStudio] Post published:", postUrl);
    return postUrl;
  } finally {
    await browser.close();
  }
}

export function clearSession() {
  if (fs.existsSync(SESSION_PATH)) {
    fs.unlinkSync(SESSION_PATH);
    console.log("[PostStudio] Session cleared. Will re-login on next post.");
  }
}
