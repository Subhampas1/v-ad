import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import { logger } from "../utils/logger.js";

export async function removeBackground(
    inputPath: string,
    outputPath: string
): Promise<string> {

    logger.info(`Sending image to ClipDrop for background removal: ${inputPath}`);

    // Check file exists
    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input image not found: ${inputPath}`);
    }

    // Detect real extension
    const ext = path.extname(inputPath).toLowerCase();

    let contentType = "image/png";

    if (ext === ".jpg" || ext === ".jpeg") {
        contentType = "image/jpeg";
    }

    const form = new FormData();

    form.append("image_file", fs.createReadStream(inputPath), {
        filename: `product${ext}`,
        contentType: contentType
    });

    try {
        const response = await axios.post(
            "https://clipdrop-api.co/remove-background/v1",
            form,
            {
                headers: {
                    "x-api-key": process.env.CLIPDROP_API_KEY || "",
                    ...form.getHeaders()
                },
                responseType: "arraybuffer",
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        fs.writeFileSync(outputPath, response.data);

        logger.info(`Background removed successfully → ${outputPath}`);

        return outputPath;

    } catch (error: any) {

        const status = error.response?.status || 500;

        const errorText =
            error.response?.data
                ? Buffer.from(error.response.data).toString("utf8")
                : error.message;

        logger.error(`ClipDrop background removal failed`, {
            status,
            errorText
        });

        throw new Error(`ClipDrop API error: ${status} - ${errorText}`);
    }
}

export async function replaceBackground(
    inputPath: string,
    outputPath: string,
    prompt: string
): Promise<string> {
    logger.info(`Sending image to ClipDrop for background replacement: ${inputPath} with prompt: "${prompt}"`);

    if (!fs.existsSync(inputPath)) {
        throw new Error(`Input image not found: ${inputPath}`);
    }

    const ext = path.extname(inputPath).toLowerCase();
    let contentType = "image/png";
    if (ext === ".jpg" || ext === ".jpeg") {
        contentType = "image/jpeg";
    }

    const form = new FormData();
    form.append("image_file", fs.createReadStream(inputPath), {
        filename: `product${ext}`,
        contentType: contentType
    });
    form.append("prompt", prompt);

    try {
        const response = await axios.post(
            "https://clipdrop-api.co/replace-background/v1",
            form,
            {
                headers: {
                    "x-api-key": process.env.CLIPDROP_API_KEY || "",
                    ...form.getHeaders()
                },
                responseType: "arraybuffer",
                maxContentLength: Infinity,
                maxBodyLength: Infinity
            }
        );

        fs.writeFileSync(outputPath, response.data);
        logger.info(`Background replaced successfully → ${outputPath}`);
        return outputPath;

    } catch (error: any) {
        const status = error.response?.status || 500;
        const errorText = error.response?.data
            ? Buffer.from(error.response.data).toString("utf8")
            : error.message;

        logger.error(`ClipDrop background replacement failed`, { status, errorText });
        throw new Error(`ClipDrop API error: ${status} - ${errorText}`);
    }
}