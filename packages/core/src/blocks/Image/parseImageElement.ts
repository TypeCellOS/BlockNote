export const parseImageElement = (imageElement: HTMLImageElement) => {
  const url = imageElement.src || undefined;
  const previewWidth = imageElement.width || undefined;

  return { url, previewWidth };
};
