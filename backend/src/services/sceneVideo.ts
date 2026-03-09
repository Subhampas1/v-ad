import ffmpeg from "fluent-ffmpeg";

export const createSceneVideo = async (
    imagePath: string,
    audioPath: string | null,
    outputPath: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        let command = ffmpeg(imagePath)
            .loop(5)
            .fps(30);

        if (audioPath) {
            command = command.input(audioPath);
        }

        command = command
            .videoCodec("libx264")
            .size("1080x1920")
            .outputOptions([
                "-t 5",
                "-pix_fmt yuv420p"
            ]);

        if (audioPath) {
            // use shortest taking audio track length in case voiceover > 5s?
            // or just let it cut off at 5s
            // -c:a aac -shortest
            command = command.outputOptions([
                "-c:a aac"
            ]);
        }

        command
            .save(outputPath)
            .on("end", () => resolve(outputPath))
            .on("error", (err) => reject(err));
    });
};
