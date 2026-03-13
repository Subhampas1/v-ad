import ffmpeg from "fluent-ffmpeg";

export const mergeVideos = async (
    clips: string[],
    output: string
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const command = ffmpeg();

        clips.forEach(c => command.input(c));

        command
            .on("end", () => {
                console.log("video merged successfully to", output);
                resolve(output);
            })
            .on("error", (e: Error) => {
                console.error("error merging videos", e);
                reject(e);
            })
            .mergeToFile(output, process.env.VIDEO_OUTPUT_DIR || "./videos");
    });
};
