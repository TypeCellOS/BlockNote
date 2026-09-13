export const parseImageElement = (imageElement: HTMLImageElement) => {
  const url = imageElement.src || undefined;
  const previewWidth = imageElement.width || undefined;
  // The `<img>` `alt` attribute is the accessibility label, so it maps to the
  // `alt` prop. We deliberately don't also read `name` (the file name) from it:
  // export writes `alt || name` into the single `alt` attribute, so deriving
  // both back from it would let alt text overwrite the file name on round-trip.
  const alt = imageElement.alt || undefined;

  return { url, previewWidth, alt };
};
