// The whole wish: open the box, write the wish, let go once, snap it, the dark ending, the card, a revisit
// (one wish only), and the debug reset. No AI calls: the page does everything itself.
import puppeteer from "puppeteer-core";
import fs from "fs";
fs.mkdirSync("out", { recursive: true });
const BASE = "http://localhost:8767";
const browser = await puppeteer.launch({ executablePath: "/usr/bin/google-chrome", headless: "new", args: ["--no-sandbox"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
const width = Number(process.argv[2] ?? 390);
await browser.defaultBrowserContext().overridePermissions(BASE, ["clipboard-read", "clipboard-write", "clipboard-sanitized-write"]);
const page = await browser.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.setViewport({ width, height: width < 500 ? 844 : 900, isMobile: width < 500, hasTouch: width < 500 });
await page.goto(BASE, { waitUntil: "networkidle0" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });
await sleep(500);
await page.screenshot({ path: `out/f${width}_1_ad.png` });
await page.click("#open-box");
await sleep(1700);
await page.type("#wish", "I wish I never had to work again");
await page.click("#make-wish");
console.log("confirm is a modal:", await page.$eval("#confirm", (e) => e.open && e.matches(":modal")), "|", await page.$eval("#confirm", (e) => e.innerText.replace(/\s+/g, " ")));
await page.screenshot({ path: `out/f${width}_2_confirm.png` });
await page.click("#confirm-no");
console.log("wait closes it:", await page.$eval("#confirm", (e) => !e.open), "| still wishing:", await page.evaluate(() => window.willow.scene));
await page.click("#make-wish");
await page.click("#confirm-yes");
const cdp = await page.createCDPSession();
// The two fists on the stage (drawn at 176x160): left one at (44, 84), right one at (132, 84)
const fist = (x, y) => page.$eval("#stage", (e, [x, y]) => { const r = e.getBoundingClientRect(), k = r.width / 176; return { x: r.x + x * k, y: r.y + y * k }; }, [x, y]);
const L = await fist(44, 84), R = await fist(132, 84);
// One hand alone does nothing, however long
if (width < 500) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: L.x, y: L.y, id: 1 }] });
} else {
  await page.keyboard.down("ArrowLeft");
}
await sleep(1200);
await page.screenshot({ path: `out/f${width}_3_one_hand.png` });
await sleep(1400);
console.log("one hand, 2.6s:", await page.evaluate(() => [window.willow.scene, window.willow.tension.toFixed(2)]), "|", await page.$eval("#snap-hint", (e) => e.textContent));
// Both hands: it bends; let go once, then hold both until it breaks
const both = async () => {
  if (width < 500) await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: L.x, y: L.y, id: 1 }, { x: R.x, y: R.y, id: 2 }] });
  else await page.keyboard.down("ArrowRight");
};
const none = async () => {
  if (width < 500) await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  else { await page.keyboard.up("ArrowLeft"); await page.keyboard.up("ArrowRight"); }
};
await both();
await sleep(700);
await page.screenshot({ path: `out/f${width}_3_snap.png` });
console.log("both hands, 0.7s:", await page.evaluate(() => window.willow.tension.toFixed(2)));
await none();
await sleep(300);
console.log("let go:", await page.$eval("#snap-hint", (e) => e.textContent));
if (width >= 500) await page.keyboard.down("ArrowLeft");
await both();
await page.waitForFunction(() => window.willow.scene !== "snap", { timeout: 8000, polling: 50 });
await none();
console.log("snapped:", await page.evaluate(() => JSON.parse(localStorage.getItem("owwillow.wish.v1")).pieces));
// The words come one at a time in the dark
const said = [];
for (let i = 0; i < 60; i++) {
  const now = await page.evaluate(() => [document.getElementById("headline-line").textContent, document.getElementById("headline-small").textContent].filter(Boolean).join(" / "));
  if (now && said.at(-1) !== now) said.push(now);
  if (i === 8) await page.screenshot({ path: `out/f${width}_4_wall.png` });
  if (i === 30) await page.screenshot({ path: `out/f${width}_5_granted.png` });
  if (!(await page.$eval("#panel-granted", (e) => e.hidden))) break;
  await sleep(250);
}
console.log("the dark says:", said.join("  →  "));
console.log("no fine print:", !(await page.$(".fine, #fine-text")));
await sleep(1800);
await page.screenshot({ path: `out/f${width}_6_end.png`, fullPage: true });
console.log("panel:", await page.$eval("#panel-granted", (e) => e.innerText.replace(/\n+/g, " ⏎ ")));
await page.evaluate(() => scrollTo(0, 400));
await sleep(200);
console.log("top bar stays at the top after scrolling:", await page.$eval(".top", (e) => Math.round(e.getBoundingClientRect().top)));
const card = await page.evaluate(async () => {
  const { drawCard } = await import("/js/card.js");
  const s = JSON.parse(localStorage.getItem("owwillow.wish.v1"));
  const scene = document.createElement("canvas");
  scene.width = 176; scene.height = 160;
  scene.getContext("2d").drawImage(document.getElementById("stage"), 0, 0);
  return (await drawCard({ wish: s.wish, scene, at: s.at, url: location.origin + "/" })).toDataURL("image/png");
});
fs.writeFileSync(`out/f${width}_card.png`, Buffer.from(card.split(",")[1], "base64"));
await page.click("#save-card");
await sleep(600);
console.log("save button:", await page.$eval("#save-card", (e) => e.textContent), "| copied:", await page.evaluate(() => navigator.clipboard.readText().catch((e) => `(${e.name})`)));
await page.reload({ waitUntil: "load" });
await sleep(800);
console.log("revisit:", await page.evaluate(() => window.willow.scene), "|", await page.$eval("#headline-line", (e) => e.textContent), "| granted panel:", await page.$eval("#panel-granted", (e) => !e.hidden), "| ad panel:", await page.$eval("#panel-ad", (e) => !e.hidden));
// The Reset chip in the top bar starts over from the box
await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click("#reset")]);
await sleep(400);
console.log("after reset:", await page.evaluate(() => window.willow.scene), "| saved:", await page.evaluate(() => localStorage.getItem("owwillow.wish.v1")));
console.log("errors:", errors.join(" | ") || "none");
await browser.close();
