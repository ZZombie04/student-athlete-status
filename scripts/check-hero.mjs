import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const outDir = path.join(process.cwd(), "data");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

const img = page.locator('img[src*="hero-deco"]');
const count = await img.count();
console.log("hero img count", count);

if (count === 0) {
  console.error("FAIL: hero image not found in DOM");
  process.exit(1);
}

const box = await img.first().boundingBox();
console.log("img box", box);

const natural = await img.first().evaluate((el) => ({
  complete: el.complete,
  nw: el.naturalWidth,
  nh: el.naturalHeight,
  opacity: getComputedStyle(el).opacity,
  visibility: getComputedStyle(el).visibility,
}));
console.log("img state", natural);

if (!natural.complete || natural.nw < 10) {
  console.error("FAIL: image not loaded");
  process.exit(1);
}

const sample = await page.evaluate(() => {
  const el = document.querySelector('img[src*="hero-deco"]');
  if (!el) return { error: "missing" };
  const c = document.createElement("canvas");
  c.width = el.naturalWidth;
  c.height = el.naturalHeight;
  const ctx = c.getContext("2d");
  ctx.drawImage(el, 0, 0);
  const pick = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data);
  return {
    mid: pick(Math.floor(c.width * 0.7), Math.floor(c.height * 0.7)),
    br: pick(c.width - 8, c.height - 8),
    tl: pick(8, 8),
  };
});
console.log("pixel sample", sample);

// non-white check: mid/br should not be pure white opaque only
function isVisibleColor(rgba) {
  const [r, g, b, a] = rgba;
  if (a < 30) return false;
  // not near pure white
  return !(r > 245 && g > 245 && b > 245);
}

const midOk = isVisibleColor(sample.mid);
const brOk = isVisibleColor(sample.br);
console.log("mid visible?", midOk, "br visible?", brOk);

const section = page.locator("main section").first();
await section.screenshot({ path: path.join(outDir, "hero-check.png") });
await page.screenshot({ path: path.join(outDir, "home-full.png") });

// Analyze screenshot bottom-right region variance
const { createRequire } = await import("module");
// use pure node: read png with playwright screenshot already done
// Sample via page screenshot canvas
const vis = await page.evaluate(() => {
  const sec = document.querySelector("main section");
  if (!sec) return null;
  const r = sec.getBoundingClientRect();
  // grab via foreignObject not easy; use elementsFromPoint color approx by img presence
  const x = r.right - 60;
  const y = r.bottom - 50;
  const stack = document.elementsFromPoint(x, y).map((e) => e.tagName + (e.className ? "." + String(e.className).slice(0, 40) : ""));
  return { x, y, stack };
});
console.log("bottom-right elements", vis);

if (!midOk && !brOk) {
  console.error("FAIL: hero image pixels look white/invisible");
  process.exit(1);
}

console.log("PASS: hero image is present and has visible non-white pixels");
await browser.close();
