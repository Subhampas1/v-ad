import sharp from "sharp";
import { logger } from "../utils/logger.js";

// Linux-safe font stack (available on Debian/Ubuntu/Render by default)
// Liberation Sans = Arial-compatible. DejaVu Sans is always present on Debian.
const FONT = "Liberation Sans, DejaVu Sans, FreeSans, sans-serif";
const AD_W = 1080;

// ─── Public types ──────────────────────────────────────────────────────────

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

/** Backward-compat wrapper */
export async function createTextOverlay(
  outputPath: string,
  options: TextOverlayOptions
): Promise<void> {
  if (options.isCTA) return createCTALayer(outputPath, options.text);
  return _genericLayer(outputPath, options);
}

// ─── Brand layer ───────────────────────────────────────────────────────────
// Large, bold, white — sits at the top of the frame

export async function createBrandLayer(
  outputPath: string,
  text: string
): Promise<void> {
  logger.info(`Creating BRAND layer: "${text}"`);

  const w = AD_W;
  const h = 160;

  const svg = buildSvg(w, h, `
    <defs>
      <filter id="s">
        <feDropShadow dx="0" dy="3" stdDeviation="6"
          flood-color="#000000" flood-opacity="0.80"/>
      </filter>
    </defs>
    <text
      x="50%" y="50%"
      text-anchor="middle" dominant-baseline="central"
      font-family="${FONT}"
      font-size="78" font-weight="bold"
      fill="#FFFFFF" filter="url(#s)"
    >${esc(text)}</text>
  `);

  await svgToPng(svg, outputPath);
}

// ─── CTA button layer ──────────────────────────────────────────────────────
// Orange pill, white bold text — sits at the very bottom

export async function createCTALayer(
  outputPath: string,
  text: string
): Promise<void> {
  logger.info(`Creating CTA layer: "${text}"`);

  const w = 560;
  const h = 130;

  const svg = buildSvg(w, h, `
    <defs>
      <filter id="sh">
        <feDropShadow dx="0" dy="6" stdDeviation="10"
          flood-color="#000000" flood-opacity="0.50"/>
      </filter>
    </defs>
    <!-- Orange pill matching reference image #E05C14 -->
    <rect x="8" y="8" width="${w - 16}" height="${h - 16}"
      rx="55" ry="55" fill="#E05C14" filter="url(#sh)"/>
    <text
      x="50%" y="54%"
      text-anchor="middle" dominant-baseline="central"
      font-family="${FONT}"
      font-size="60" font-weight="bold"
      fill="#FFFFFF"
    >${esc(text)}</text>
  `);

  await svgToPng(svg, outputPath);
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildSvg(w: number, h: number, inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink">
  ${inner}
</svg>`;
}

async function svgToPng(svg: string, outputPath: string): Promise<void> {
  await sharp(Buffer.from(svg, "utf8"))
    .png()
    .toFile(outputPath);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Generic fallback for old callers
async function _genericLayer(
  outputPath: string,
  options: TextOverlayOptions
): Promise<void> {
  const { width: w, height: h, fontSize, fontColor, text } = options;
  const svg = buildSvg(w, h, `
    <defs>
      <filter id="s">
        <feDropShadow dx="2" dy="2" stdDeviation="3"
          flood-color="#000000" flood-opacity="0.8"/>
      </filter>
    </defs>
    <text
      x="50%" y="52%"
      text-anchor="middle" dominant-baseline="central"
      font-family="${FONT}" font-size="${fontSize}" font-weight="bold"
      fill="${fontColor}" filter="url(#s)"
    >${esc(text)}</text>
  `);
  await svgToPng(svg, outputPath);
}
