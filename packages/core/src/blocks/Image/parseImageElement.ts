export const parseImageElement = (imageElement: HTMLImageElement) => {
  const url = imageElement.src || undefined;
  const previewWidth = imageElement.width || undefined;
  const name = imageElement.alt || undefined;
  const alt = imageElement.alt || undefined;

  return { url, previewWidth, name, alt };
};
