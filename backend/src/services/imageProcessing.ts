import sharp from "sharp";
import { logger } from "../utils/logger.js";
import path from "path";
import fs from "fs/promises";
import { removeBackground } from "./clipdropEditor.js";

/**
 * 1. Isolates product by removing background.
 * 2. Trims transparent pixels and resizes safely.
 */
export async function isolateProduct(inputPath: string, outputPath: string): Promise<void> {
    logger.info(`Isolating product from ${inputPath}`);
    const tempRemoved = `${outputPath}.temp.png`;

    // Remove Background via ClipDrop
    await removeBackground(inputPath, tempRemoved);

    // Trim and resize to fit within an 800x800 box
    await sharp(tempRemoved)
        .trim()
        .resize({ width: 800, height: 800, fit: "inside" })
        .toFile(outputPath);

    // cleanup temp
    await fs.unlink(tempRemoved).catch(() => { });
    logger.info(`Product isolated at ${outputPath}`);
}

/**
 * Generates a drop shadow layer for the isolated product.
 */
export async function generateDropShadow(inputPath: string, outputPath: string): Promise<void> {
    logger.info(`Generating drop shadow for ${inputPath}`);

    const imageInfo = await sharp(inputPath).metadata();

    // Create shadow by blackening the image, blurring it, and scaling it
    await sharp(inputPath)
        // Extract alpha channel
        .extractChannel('alpha')
        .toBuffer()
        .then(alphaBuffer => {
            // Re-apply alpha channel to a black rectangle
            return sharp({
                create: {
                    width: imageInfo.width || 800,
                    height: imageInfo.height || 800,
                    channels: 3,
                    background: { r: 0, g: 0, b: 0 }
                }
            })
                .joinChannel(alphaBuffer)
                .png()
                .toBuffer();
        })
        .then(blackened => {
            return sharp(blackened)
                // Add blur for shadow effect
                .blur(20)
                // We add some padding to avoid clipping the blur
                .extend({
                    top: 50, bottom: 50, left: 50, right: 50,
                    background: { r: 0, g: 0, b: 0, alpha: 0 }
                })
                .resize({ width: 800, height: 800, fit: "inside" })
                .toFile(outputPath);
        });

    logger.info(`Drop shadow generated at ${outputPath}`);
}

/**
 * Prepares an image for ClipDrop Replace Background.
 * 1. Removes the background so the AI knows exactly what the product is.
 * 2. Centers it on a 1080x1920 transparent canvas so ClipDrop returns a 9:16 video frame directly.
 */
export async function prepareImageForReplaceBackground(inputPath: string, outputPath: string): Promise<void> {
    logger.info(`Preparing image for background replacement: ${inputPath}`);
    const tempRemoved = `${outputPath}.temp.png`;

    try {
        // Step 1: Isolate Product
        await removeBackground(inputPath, tempRemoved);

        // Step 2: Resize and pad to 1080x1920
        const productBuffer = await sharp(tempRemoved)
            .trim()
            .resize({ width: 800, height: 800, fit: "inside" })
            .toBuffer();

        await sharp({
            create: {
                width: 1080,
                height: 1920,
                channels: 4,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            }
        })
            .composite([{
                input: productBuffer,
                gravity: 'center' // Place product in the middle of the frame
            }])
            .toFile(outputPath);

        logger.info(`Image prepared for replacement perfectly sized to 1080x1920 at ${outputPath}`);
    } finally {
        await fs.unlink(tempRemoved).catch(() => { });
    }
}
