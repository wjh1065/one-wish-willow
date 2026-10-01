// The confirm modal once it has settled, on a phone and a desktop
import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, isMobile: w < 500, hasTouch: w < 500 });
  await page.goto("http://localhost:8767", { waitUntil: "networkidle0" });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle0" });
  await page.click("#open-box");
  await sleep(1700);
  await page.type("#wish", "I wish my sister would forgive me");
  await page.click("#make-wish");
  await sleep(900);
  await page.screenshot({ path: `out/modal_${w}.png` });
  await page.close();
}
await browser.close();
