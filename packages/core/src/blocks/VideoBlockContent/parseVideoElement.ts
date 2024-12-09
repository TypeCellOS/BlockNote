export const parseVideoElement = (videoElement: HTMLVideoElement) => {
  const url = videoElement.src || undefined;
  const previewWidth = videoElement.width || undefined;

  return { url, previewWidth };
};
