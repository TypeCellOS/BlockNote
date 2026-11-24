import { parseMediaUrl } from "../File/helpers/parse/parseMediaUrl.js";

export const parseAudioElement = (audioElement: HTMLAudioElement) => {
  const url = parseMediaUrl(audioElement);

  return { url };
};
