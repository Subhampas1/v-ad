import sharp from "sharp";
import { logger } from "../utils/logger.js";

interface TextOverlayOptions {
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
 * Generates high quality transparent PNGs containing styled text via SVG+Sharp.
 */
export async function createTextOverlay(outputPath: string, options: TextOverlayOptions): Promise<void> {
    logger.info(`Generating text overlay for "${options.text}" at ${outputPath}`);

    const fontFamily = options.fontFamily || "Arial, sans-serif";

    // Adjust colors to match user's image reference
    const ctaBgColor = "#D95C14"; // Orange/rust color
    const ctaTextColor = "#FFFFFF";

    const bgRect = options.isCTA
        ? `<rect x="5%" y="10%" width="90%" height="80%" rx="40" fill="${ctaBgColor}" opacity="1.0" filter="url(#drop-shadow)"/>`
        : "";

    const textColor = options.isCTA ? ctaTextColor : options.fontColor;
    const txtShadow = options.isCTA
        ? ""
        : `<filter id="text-shadow"><feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.8"/></filter>`;
    const applyShadow = options.isCTA ? "" : `filter="url(#text-shadow)"`;

    const svgContent = `
        <svg width="${options.width}" height="${options.height}" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <filter id="drop-shadow">
                    <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#000000" flood-opacity="0.5"/>
                </filter>
                ${txtShadow}
            </defs>
            ${bgRect}
            <text
                x="50%"
                y="52%"
                text-anchor="middle"
                alignment-baseline="middle"
                dominant-baseline="central"
                font-family="${fontFamily}"
                font-size="${options.fontSize}"
                font-weight="bold"
                letter-spacing="${options.isCTA ? '1' : '2'}"
                fill="${textColor}"
                ${applyShadow}
            >
                ${options.text}
            </text>
        </svg>
    `;

    await sharp(Buffer.from(svgContent))
        .png()
        .toFile(outputPath);
}
