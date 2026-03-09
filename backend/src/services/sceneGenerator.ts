export const buildScenePrompt = (
    productName: string,
    scene: any
) => {
    return `
cinematic product advertisement photography

product: ${productName}

scene description:
${scene.visualDescription}

style:
commercial product photography
dramatic lighting
luxury advertisement
4k
studio lighting
`;
};
