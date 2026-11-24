import { parseMediaUrl } from "../File/helpers/parse/parseMediaUrl.js";

export const parseImageElement = (imageElement: HTMLImageElement) => {
  const url = parseMediaUrl(imageElement);
  const previewWidth = imageElement.width || undefined;
  const name = imageElement.alt || undefined;

  return { url, previewWidth, name };
};
