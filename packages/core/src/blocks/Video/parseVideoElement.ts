export const parseVideoElement = (videoElement: HTMLVideoElement) => {
  const url = videoElement.src || undefined;
  const previewWidth = videoElement.width || undefined;
  const name = videoElement.getAttribute("data-name") || undefined;

  return { url, previewWidth, name };
};
