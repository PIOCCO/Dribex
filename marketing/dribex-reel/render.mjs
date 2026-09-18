import puppeteer from "puppeteer-core";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FPS = 24;
const DURATION = 20;
const FRAMES = FPS * DURATION;
const outDir = path.join(__dirname, "frames");
const htmlPath = path.join(__dirname, "reel.html");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH || "/usr/local/bin/google-chrome",
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--font-render-hinting=none",
  ],
});
const page = await browser.newPage();
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
await page.goto(`file://${htmlPath}`, { waitUntil: "load", timeout: 30000 });
await page.waitForFunction(() => typeof window.seekTo === "function", { timeout: 10000 });
await page.evaluate(() => document.documentElement.classList.add("render-mode"));
await page.evaluate(async () => {
  const imgs = [...document.images];
  await Promise.all(
    imgs.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res, rej) => {
              img.onload = res;
              img.onerror = res;
            })
    )
  );
});

for (let i = 0; i < FRAMES; i++) {
  const t = i / FPS;
  await page.evaluate((sec) => window.seekTo(sec), t);
  const framePath = path.join(outDir, `frame_${String(i).padStart(4, "0")}.png`);
  await page.screenshot({ path: framePath, type: "png" });
  if (i % 30 === 0) console.log(`frame ${i}/${FRAMES}`);
}
await browser.close();

const videoOut = path.join(__dirname, "dribex-reel-9x16.mp4");
const demoOut = path.join(__dirname, "recording_demo.mp4");

const ffmpegArgs = [
  "-y",
  "-framerate",
  String(FPS),
  "-i",
  path.join(outDir, "frame_%04d.png"),
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-crf",
  "18",
  "-preset",
  "medium",
  videoOut,
];
const res = spawnSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });
if (res.status !== 0) process.exit(res.status ?? 1);

fs.copyFileSync(videoOut, demoOut);
console.log("Wrote", videoOut);
