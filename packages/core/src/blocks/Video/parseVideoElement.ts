export const parseVideoElement = (videoElement: HTMLVideoElement) => {
  // The URL can be in a `<source>` child.
  const url =
    videoElement.src ||
    videoElement.querySelector<HTMLSourceElement>("source[src]")?.src ||
    undefined;
  const previewWidth = videoElement.width || undefined;
  const name = videoElement.getAttribute("data-name") || undefined;

  return { url, previewWidth, name };
};
