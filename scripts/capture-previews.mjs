import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const imagesDir = path.join(root, "images");
const projectsPath = path.join(__dirname, "projects.json");
const indexPath = path.join(root, "index.html");

const VIEWPORT = { width: 1440, height: 900 };
const OUT_WIDTH = 1200;
const OUT_HEIGHT = 750;
const NAV_TIMEOUT = 60_000;

const COOKIE_SELECTORS = [
  "button:has-text('Принять')",
  "button:has-text('Согласен')",
  "button:has-text('Accept')",
  "button:has-text('Allow all')",
  "button:has-text('OK')",
  "[aria-label*='accept' i]",
  "#onetrust-accept-btn-handler",
];

function stamp() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

async function dismissOverlays(page, extraClick = []) {
  const selectors = [...extraClick, ...COOKIE_SELECTORS];
  for (const sel of selectors) {
    try {
      const loc = page.locator(sel).first();
      if (await loc.isVisible({ timeout: 1200 })) {
        await loc.click({ timeout: 2000 });
        await page.waitForTimeout(400);
      }
    } catch {
      // ignore missing overlays
    }
  }
}

async function captureOne(browser, project) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: "ru-RU",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);

  try {
    let lastError;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await page.goto(project.url, {
          waitUntil: attempt === 1 ? "domcontentloaded" : "commit",
          timeout: NAV_TIMEOUT,
        });
        lastError = null;
        break;
      } catch (err) {
        lastError = err;
        if (attempt === 2) throw err;
        await page.waitForTimeout(1500);
      }
    }
    if (lastError) throw lastError;

    await dismissOverlays(page, project.click || []);
    await page.waitForTimeout(1800);
    try {
      await page.waitForLoadState("networkidle", { timeout: 12_000 });
    } catch {
      // some shops never go idle
    }
    await dismissOverlays(page, project.click || []);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    const png = await page.screenshot({
      type: "png",
      clip: { x: 0, y: 0, width: VIEWPORT.width, height: VIEWPORT.height },
    });

    const pipeline = sharp(png).resize(OUT_WIDTH, OUT_HEIGHT, {
      fit: "cover",
      position: "top",
    });

    const jpgBuf = await pipeline
      .clone()
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    const webpBuf = await pipeline.clone().webp({ quality: 78 }).toBuffer();

    const jpgPath = path.join(imagesDir, `${project.id}.jpg`);
    const webpPath = path.join(imagesDir, `${project.id}.webp`);
    await fs.writeFile(jpgPath, jpgBuf);
    await fs.writeFile(webpPath, webpBuf);

    return { id: project.id, ok: true };
  } catch (err) {
    return { id: project.id, ok: false, error: String(err?.message || err) };
  } finally {
    await context.close();
  }
}

async function bumpCacheInIndex(version) {
  let html = await fs.readFile(indexPath, "utf8");
  const next = html.replace(
    /(\.\/images\/[a-z0-9_-]+\.(?:webp|jpg))(?:\?v=[^"'\s]*)?/gi,
    `$1?v=${version}`
  );
  if (next !== html) {
    await fs.writeFile(indexPath, next, "utf8");
    return true;
  }
  return false;
}

async function main() {
  const projects = JSON.parse(await fs.readFile(projectsPath, "utf8"));
  await fs.mkdir(imagesDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const project of projects) {
      process.stdout.write(`capture ${project.id} … `);
      const result = await captureOne(browser, project);
      results.push(result);
      console.log(result.ok ? "ok" : `fail: ${result.error}`);
    }
  } finally {
    await browser.close();
  }

  const okCount = results.filter((r) => r.ok).length;
  if (okCount === 0) {
    console.error("All captures failed — leaving images untouched.");
    process.exit(1);
  }

  const version = stamp();
  await bumpCacheInIndex(version);
  console.log(`done: ${okCount}/${results.length}, cache v=${version}`);

  const failed = results.filter((r) => !r.ok);
  if (failed.length) {
    console.warn("Failed:", failed.map((f) => f.id).join(", "));
    // keep exit 0 so successful shots still get committed
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
