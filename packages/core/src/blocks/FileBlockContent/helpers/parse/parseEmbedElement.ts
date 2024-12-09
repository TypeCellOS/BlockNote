export const parseEmbedElement = (embedElement: HTMLEmbedElement) => {
  const url = embedElement.src || undefined;

  return { url };
};
