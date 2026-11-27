import { parseMediaUrl } from "./parseMediaUrl.js";

export const parseEmbedElement = (embedElement: HTMLEmbedElement) => {
  const url = parseMediaUrl(embedElement);

  return { url };
};
