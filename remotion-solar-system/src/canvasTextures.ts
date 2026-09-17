import * as THREE from "three";
import { random } from "remotion";

// All of these build small textures procedurally in a <canvas>, so they need no
// network access. They are memoised by the caller.

/** Soft radial glow used for the Sun's corona / bloom sprites. */
export const makeGlowTexture = (
  inner = "rgba(255,240,200,1)",
  mid = "rgba(255,170,60,0.5)",
): THREE.Texture => {
  const size = 512;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, inner);
  g.addColorStop(0.25, mid);
  g.addColorStop(0.55, "rgba(255,120,30,0.14)");
  g.addColorStop(1, "rgba(255,80,10,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** A round, soft star sprite so points render as dots, not squares. */
export const makeStarSprite = (): THREE.Texture => {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.7)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/**
 * A subtle deep-space nebula + faint Milky-Way band, painted onto the inside of
 * the sky sphere so the background isn't a flat black.
 */
export const makeNebulaTexture = (): THREE.Texture => {
  const w = 2048;
  const h = 1024;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;

  // Base near-black with a slight blue tint.
  ctx.fillStyle = "#03050c";
  ctx.fillRect(0, 0, w, h);

  // Diagonal Milky-Way band of faint dust.
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-0.35);
  const band = ctx.createLinearGradient(0, -h * 0.28, 0, h * 0.28);
  band.addColorStop(0, "rgba(60,70,120,0)");
  band.addColorStop(0.5, "rgba(90,95,140,0.16)");
  band.addColorStop(1, "rgba(60,70,120,0)");
  ctx.fillStyle = band;
  ctx.fillRect(-w, -h * 0.28, w * 2, h * 0.56);
  ctx.restore();

  // Soft coloured nebula patches.
  const patches: Array<[number, number, number, string]> = [
    [0.2, 0.35, 320, "rgba(40,60,150,0.20)"],
    [0.7, 0.6, 380, "rgba(120,40,110,0.16)"],
    [0.85, 0.25, 260, "rgba(30,90,120,0.16)"],
    [0.45, 0.75, 300, "rgba(70,30,120,0.14)"],
  ];
  for (const [px, py, r, col] of patches) {
    const g = ctx.createRadialGradient(px * w, py * h, 0, px * w, py * h, r);
    g.addColorStop(0, col);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // A scatter of faint background stars baked into the sky.
  for (let i = 0; i < 1400; i++) {
    const x = random(`nx-${i}`) * w;
    const y = random(`ny-${i}`) * h;
    const r = 0.3 + random(`nr-${i}`) * 1.1;
    const a = 0.2 + random(`na-${i}`) * 0.6;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
