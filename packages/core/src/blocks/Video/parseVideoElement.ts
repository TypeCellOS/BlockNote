import { parseMediaUrl } from "../File/helpers/parse/parseMediaUrl.js";

export const parseVideoElement = (videoElement: HTMLVideoElement) => {
  const url = parseMediaUrl(videoElement);
  const previewWidth = videoElement.width || undefined;
  const name = videoElement.getAttribute("data-name") || undefined;

  return { url, previewWidth, name };
};
