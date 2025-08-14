export const parseAudioElement = (audioElement: HTMLAudioElement) => {
  const url = audioElement.src || undefined;

  return { url };
};
