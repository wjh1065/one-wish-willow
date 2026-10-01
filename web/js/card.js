// The wish as one picture, dark, stamped with what the willow promised: to save or send.

const WIDTH = 720;
const PAD = 52;
const FONT = "Galmuri11";

// card: {wish, scene (the broken pieces in the dark, on their small stage), at, url}
// The card goes out with the link, so whoever gets it can make their own one wish
export async function shareCard(card) {
  const canvas = await drawCard(card);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const file = new File([blob], "one-wish-willow.png", { type: "image/png" });
  const text = "I made my one wish. You only get one.";
  // Phones: the share sheet, with the picture and the link; elsewhere: a download, and the link copied
  if (navigator.canShare?.({ files: [file], text, url: card.url })) {
    try {
      await navigator.share({ files: [file], text: `${text} ${card.url}`, url: card.url });
      return "shared";
    } catch (error) {
      if (error.name === "AbortError") return "cancelled";
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  try {
    await navigator.clipboard.writeText(`${text} ${card.url}`);
    return "saved+link";
  } catch {
    return "saved";
  }
}

const DARK = "#120a08";
const BLOOD = "#b8241b";
const PALE = "#ecd9c0";
const DIM = "#8f7462";

export async function drawCard({ wish, scene, at, url }) {
  await Promise.all([document.fonts.load(`16px ${FONT}`), document.fonts.load(`bold 16px ${FONT}`)]).catch(() => {});
  const inner = WIDTH - PAD * 2;
  const measure = document.createElement("canvas").getContext("2d");
  measure.font = `30px ${FONT}`;
  const wishLines = wrap(measure, `“${wish}”`, inner);
  const zoom = Math.floor(inner / scene.width);
  const sceneH = scene.height * zoom;
  const height = PAD + 44 + 24 + sceneH + 40 + 30 + wishLines.length * 44 + 36 + 60 + 40 + 56 + 50 + PAD;

  const canvas = Object.assign(document.createElement("canvas"), { width: WIDTH, height });
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = DARK;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.strokeStyle = BLOOD;
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, WIDTH - 28, height - 28);
  ctx.setLineDash([10, 8]);
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, WIDTH - 56, height - 56);
  ctx.setLineDash([]);

  let y = PAD;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillStyle = PALE;
  ctx.font = `bold 38px ${FONT}`;
  ctx.fillText("You only get one wish.", WIDTH / 2, y, inner);
  y += 44 + 24;
  const left = PAD + (inner - scene.width * zoom) / 2;
  ctx.drawImage(scene, left, y, scene.width * zoom, sceneH);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 4;
  ctx.strokeRect(left, y, scene.width * zoom, sceneH);
  y += sceneH + 40;
  ctx.fillStyle = DIM;
  ctx.font = `22px ${FONT}`;
  ctx.fillText("MY ONE WISH", WIDTH / 2, y);
  y += 30;
  ctx.fillStyle = PALE;
  ctx.font = `30px ${FONT}`;
  for (const line of wishLines) {
    ctx.fillText(line, WIDTH / 2, y, inner);
    y += 44;
  }
  y += 36;
  ctx.fillStyle = BLOOD;
  ctx.font = `bold 46px ${FONT}`;
  ctx.shadowColor = "rgb(208 38 28 / 0.6)";
  ctx.shadowBlur = 16;
  ctx.fillText("IT WILL BE GRANTED.", WIDTH / 2, y, inner);
  ctx.shadowBlur = 0;
  y += 60;
  ctx.fillStyle = DIM;
  ctx.font = `24px ${FONT}`;
  ctx.fillText("Whatever it takes.", WIDTH / 2, y);
  // Where to make yours
  y += 56;
  ctx.fillStyle = PALE;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText(`Make yours: ${(url ?? "").replace(/^https?:\/\//, "").replace(/\/$/, "")}`, WIDTH / 2, y, inner);
  ctx.fillStyle = DIM;
  ctx.font = `20px ${FONT}`;
  const d = new Date(at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  ctx.fillText(`${d}  ·  ONE WISH WILLOW`, WIDTH / 2, height - PAD - 20, inner);
  return canvas;
}

// Wraps between words (any language), like the page does
function wrap(ctx, text, width) {
  const lines = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}
