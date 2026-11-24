export const parseAudioElement = (audioElement: HTMLAudioElement) => {
  // The URL can be in a `<source>` child.
  const url =
    audioElement.src ||
    audioElement.querySelector<HTMLSourceElement>("source[src]")?.src ||
    undefined;

  return { url };
};
