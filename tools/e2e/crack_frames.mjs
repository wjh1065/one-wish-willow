// The snap, frame by frame: the stage canvas captured at set moments after the break (faces rain down)
import puppeteer from "puppeteer-core";
import fs from "fs";
fs.mkdirSync("out", { recursive: true });
const BASE = "http://localhost:8767";
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.setViewport({ width: 1440, height: 900 });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });
await sleep(400);
await page.screenshot({ path: "out/cf_ad.png" });
await page.click("#open-box");
await sleep(1700);
await page.type("#wish", "I wish to be famous");
await page.click("#make-wish");
await page.click("#confirm-yes");
await page.evaluate(() => {
  window.__frames = [];
  const moments = [0.02, 0.15, 0.3, 0.5, 0.75, 1.0, 1.5, 7.0];
  const watch = () => {
    if (!["crack", "rest"].includes(window.willow.scene)) return requestAnimationFrame(watch);
    const start = performance.now();
    const grab = () => {
      const age = (performance.now() - start) / 1000;
      if (moments.length && age >= moments[0]) {
        moments.shift();
        window.__frames.push(document.getElementById("stage").toDataURL());
      }
      if (moments.length) requestAnimationFrame(grab);
    };
    grab();
  };
  watch();
});
await page.keyboard.down("ArrowLeft");
await page.keyboard.down("ArrowRight");
await page.waitForFunction(() => window.willow.scene !== "snap", { timeout: 8000, polling: 50 });
await page.keyboard.up("ArrowLeft");
await page.keyboard.up("ArrowRight");
await page.waitForFunction(() => window.__frames.length === 8, { timeout: 12000, polling: 100 });
const frames = await page.evaluate(() => window.__frames);
frames.forEach((f, i) => fs.writeFileSync(`out/cf_${i}.png`, Buffer.from(f.split(",")[1], "base64")));
console.log("frames:", frames.length, "| errors:", errors.join(" | ") || "none");
await browser.close();
