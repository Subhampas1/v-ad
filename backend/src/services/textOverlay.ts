import sharp from "sharp";
import { logger } from "../utils/logger.js";

// ─── Config ────────────────────────────────────────────────────────────────
const FONT = "Arial, Helvetica, sans-serif";
const AD_W = 1080;

// ─── Public layer presets ──────────────────────────────────────────────────

export interface TextOverlayOptions {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  fontColor: string;
  fontFamily?: string;
  background?: string;
  isCTA?: boolean;
}

/**
 * Generic text overlay (kept for backward compat with old callers).
 * Prefer the named helpers below for the ad pipeline.
 */
export async function createTextOverlay(
  outputPath: string,
  options: TextOverlayOptions
): Promise<void> {
  if (options.isCTA) {
    return createCTALayer(outputPath, options.text);
  }
  return createGenericLayer(outputPath, options);
}

// ─── Named layer creators for the 4-layer ad pipeline ─────────────────────

/**
 * Brand name — small, white, centered, light weight
 * Suggested: 54px, y=120 in final comp
 */
export async function createBrandLayer(
  outputPath: string,
  text: string
): Promise<void> {
  logger.info(`Creating BRAND layer: "${text}"`);
  const w = AD_W;
  const h = 160;

  const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="s"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000" flood-opacity="0.7"/></filter>
  </defs>
  <text
    x="50%" y="52%"
    text-anchor="middle" dominant-baseline="central"
    font-family="${FONT}" font-size="80" font-weight="900"
    letter-spacing="2" fill="#FFFFFF" filter="url(#s)"
  >${escapeXml(text)}</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

/**
 * Hook — biggest text, bold, centered, up to 2 lines
 * Suggested: 96px, y=300 in final comp
 */
export async function createHookLayer(
  outputPath: string,
  text: string
): Promise<void> {
  logger.info(`Creating HOOK layer: "${text}"`);
  const w = AD_W;
  const h = 200;

  const lines = wrapText(text, 10);
  const lineH = 80;
  const totalH = lines.length * lineH;
  const startY = (h - totalH) / 2 + lineH / 2;

  const textEls = lines
    .map(
      (line, i) => `
  <text
    x="50%" y="${startY + i * lineH}"
    text-anchor="middle" dominant-baseline="central"
    font-family="${FONT}" font-size="58" font-weight="600"
    letter-spacing="1" fill="#FFFFFF" filter="url(#s)"
  >${escapeXml(line)}</text>`
    )
    .join("");

  const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="s"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#000" flood-opacity="0.75"/></filter>
  </defs>
  ${textEls}
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

/**
 * Support / benefit line — smaller, light gray, centered
 * Suggested: 48px, y=500 in final comp
 */
export async function createSupportLayer(
  outputPath: string,
  text: string
): Promise<void> {
  logger.info(`Creating SUPPORT layer: "${text}"`);
  const w = AD_W;
  const h = 90;

  const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="s"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.7"/></filter>
  </defs>
  <text
    x="50%" y="50%"
    text-anchor="middle" dominant-baseline="central"
    font-family="${FONT}" font-size="48" font-weight="300"
    letter-spacing="1" fill="#E0E0E0" filter="url(#s)"
  >${escapeXml(text)}</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

/**
 * CTA button — warm yellow pill with dark bold text.
 * Suggested: y=1640 in final comp
 */
export async function createCTALayer(
  outputPath: string,
  text: string
): Promise<void> {
  logger.info(`Creating CTA layer: "${text}"`);
  const w = 560;
  const h = 130;

  const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="btn-shadow">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>
  <!-- Pill background — rust-orange matching reference image -->
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}"
    rx="55" ry="55" fill="#E05C14" filter="url(#btn-shadow)"/>
  <!-- Button text -->
  <text
    x="50%" y="54%"
    text-anchor="middle" dominant-baseline="central"
    font-family="${FONT}" font-size="62" font-weight="900"
    letter-spacing="2" fill="#FFFFFF"
  >${escapeXml(text)}</text>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

/**
 * Semi-transparent dark gradient strip for the top text zone —
 * improves readability against busy backgrounds.
 * h = 680px (covers brand + hook + support)
 */
export async function createTopGradient(outputPath: string): Promise<void> {
  logger.info("Creating top gradient overlay");
  const w = AD_W;
  const h = 700;

  const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.00"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
</svg>`;

  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Naive word-wrap: break into lines of at most `maxWords` words */
function wrapText(text: string, maxWords: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current: string[] = [];
  for (const w of words) {
    current.push(w);
    if (current.length >= maxWords) {
      lines.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) lines.push(current.join(" "));
  return lines.slice(0, 2); // max 2 lines
}

/** Generic fallback for backward compatibility */
async function createGenericLayer(
  outputPath: string,
  options: TextOverlayOptions
): Promise<void> {
  const w = options.width;
  const h = options.height;
  const svg = `
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <filter id="s"><feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.8"/></filter>
  </defs>
  <text
    x="50%" y="52%"
    text-anchor="middle" dominant-baseline="central"
    font-family="${options.fontFamily || FONT}"
    font-size="${options.fontSize}" font-weight="bold"
    letter-spacing="2" fill="${options.fontColor}" filter="url(#s)"
  >${escapeXml(options.text)}</text>
</svg>`;
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
}
