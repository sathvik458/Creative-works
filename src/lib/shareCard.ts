"use client";

import type { Character, Ending, Episode, Story } from "@/content/schema";
import { APP_NAME, APP_TAGLINE, ENDING_TYPE_META } from "./config";
import { spriteDataUrl } from "./sprite";

/**
 * Draws the shareable ending card on a <canvas> (1080×1350, Instagram 4:5).
 * Canvas uses the page's loaded web fonts and same-origin art, so the PNG
 * matches what players see — no external services involved.
 */

const W = 1080;
const H = 1350;
const DISPLAY = `"M PLUS Rounded 1c", "Noto Sans JP", system-ui, sans-serif`;
const SANS = `"Noto Sans JP", system-ui, sans-serif`;

export type CardInput = {
  story: Story;
  episode: Episode;
  ending: Ending;
  character?: Character;
  found: number;
  total: number;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const iw = img.naturalWidth || 800;
  const ih = img.naturalHeight || 1000;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  // Works for both spaced (English) and unspaced (Japanese) text.
  const tokens = /\s/.test(text) ? text.split(/(\s+)/) : [...text];
  const lines: string[] = [];
  let cur = "";
  for (const t of tokens) {
    const test = cur + t;
    if (ctx.measureText(test).width > maxWidth && cur.trim()) {
      lines.push(cur.trim());
      cur = t.trimStart();
      if (lines.length === maxLines) break;
    } else cur = test;
  }
  if (lines.length < maxLines && cur.trim()) lines.push(cur.trim());
  if (lines.length === maxLines && tokens.join("").length > lines.join(" ").length + 2) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/.{1}$/, "…");
  }
  return lines;
}

export async function renderEndingCard(input: CardInput): Promise<Blob> {
  const { story, episode, ending, character, found, total } = input;
  const meta = ENDING_TYPE_META[ending.type];

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Make sure the right font subsets are loaded for the glyphs we draw.
  const allText = `${ending.title}${ending.titleNative ?? ""}${story.title}${episode.title}${APP_NAME}${APP_TAGLINE}0123456789/★✿☂✦`;
  try {
    await Promise.all([
      document.fonts.load(`800 80px "M PLUS Rounded 1c"`, allText),
      document.fonts.load(`700 40px "M PLUS Rounded 1c"`, allText),
      document.fonts.load(`400 30px "Noto Sans JP"`, allText),
    ]);
  } catch {
    /* fall back to system fonts */
  }

  const [bg, sprite] = await Promise.all([
    loadImage(ending.image ?? story.coverImage),
    character ? loadImage(character.sprites?.[ending.expression ?? "happy"] ?? spriteDataUrl(character.look, ending.expression ?? "happy")) : null,
  ]);

  // Paper background with dots
  ctx.fillStyle = "#fff7ec";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(43,35,64,0.05)";
  for (let y = 10; y < H; y += 26) for (let x = 10; x < W; x += 26) ctx.fillRect(x, y, 3, 3);

  // Art frame
  const ax = 60, ay = 60, aw = W - 120, ah = 700;
  ctx.save();
  ctx.shadowColor = "rgba(43,35,64,0.25)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 16;
  roundRect(ctx, ax, ay, aw, ah, 48);
  ctx.fillStyle = meta.bg;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, ax, ay, aw, ah, 48);
  ctx.clip();
  if (bg) drawCover(ctx, bg, ax, ay, aw, ah);
  ctx.fillStyle = "rgba(255,247,236,0.18)";
  ctx.fillRect(ax, ay, aw, ah);
  const grad = ctx.createLinearGradient(0, ay + ah * 0.45, 0, ay + ah);
  grad.addColorStop(0, "rgba(43,35,64,0)");
  grad.addColorStop(1, "rgba(43,35,64,0.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(ax, ay, aw, ah);
  if (sprite) {
    const sh = 600;
    const sw = (sprite.naturalWidth / sprite.naturalHeight || 300 / 440) * sh;
    ctx.drawImage(sprite, ax + aw / 2 - sw / 2, ay + ah - sh + 10, sw, sh);
  }
  ctx.restore();

  // Ending type ribbon
  ctx.font = `800 34px ${DISPLAY}`;
  const ribbon = `${meta.icon}  ${meta.label.toUpperCase()}`;
  const rw = ctx.measureText(ribbon).width + 56;
  roundRect(ctx, ax + 32, ay + 32, rw, 66, 33);
  ctx.fillStyle = meta.color;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(ribbon, ax + 60, ay + 66);

  // Level chip (top right)
  const lvl = `Lv ${episode.level ?? story.level}`;
  ctx.font = `800 30px ${DISPLAY}`;
  const lw = ctx.measureText(lvl).width + 44;
  roundRect(ctx, ax + aw - 32 - lw, ay + 36, lw, 58, 29);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fill();
  ctx.fillStyle = "#2b2340";
  ctx.fillText(lvl, ax + aw - 32 - lw + 22, ay + 66);

  // Title block
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#2b2340";
  ctx.font = `800 84px ${DISPLAY}`;
  const titleLines = wrapLines(ctx, ending.title, W - 140, 2);
  let y = ay + ah + 110;
  for (const l of titleLines) {
    ctx.fillText(l, 70, y);
    y += 92;
  }
  y -= 30;
  if (ending.titleNative) {
    ctx.font = `700 44px ${DISPLAY}`;
    ctx.fillStyle = "#ff6f91";
    ctx.fillText(ending.titleNative, 72, y + 20);
    y += 64;
  }
  ctx.font = `400 32px ${SANS}`;
  ctx.fillStyle = "#5d5470";
  ctx.fillText(`${story.title} · ${episode.title}`, 72, y + 22);

  // Summary (fills the space above the footer)
  ctx.font = `400 30px ${SANS}`;
  ctx.fillStyle = "#2b2340";
  let sy = y + 82;
  const maxSummaryLines = Math.max(0, Math.floor((H - 150 - sy) / 42) + 1);
  for (const l of wrapLines(ctx, ending.summary, W - 150, Math.min(3, maxSummaryLines))) {
    ctx.fillText(l, 72, sy);
    sy += 42;
  }

  // Footer: endings found + app name
  const fy = H - 92;
  ctx.font = `800 34px ${DISPLAY}`;
  ctx.fillStyle = "#2b2340";
  const foundText = `${found}/${total} endings found`;
  ctx.fillText(foundText, 72, fy);
  const dotsX = 72 + ctx.measureText(foundText).width + 24;
  for (let i = 0; i < total; i++) {
    ctx.beginPath();
    ctx.arc(dotsX + i * 34, fy - 12, 11, 0, Math.PI * 2);
    ctx.fillStyle = i < found ? "#ff6f91" : "rgba(43,35,64,0.15)";
    ctx.fill();
  }
  ctx.textAlign = "right";
  ctx.font = `800 34px ${DISPLAY}`;
  ctx.fillStyle = "#ff6f91";
  ctx.fillText(APP_NAME, W - 70, fy);
  ctx.font = `400 24px ${SANS}`;
  ctx.fillStyle = "#5d5470";
  ctx.fillText(APP_TAGLINE, W - 70, fy + 38);
  ctx.textAlign = "left";

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not render card"))), "image/png"),
  );
}

export type ShareResult = "shared" | "downloaded" | "cancelled";

export async function shareOrDownload(blob: Blob, fileName: string, text: string): Promise<ShareResult> {
  const file = new File([blob], fileName, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: APP_NAME, text });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancelled";
      // fall through to download
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "downloaded";
}
