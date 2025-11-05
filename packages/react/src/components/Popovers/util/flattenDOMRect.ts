export const flattenDOMRect = (domRect: DOMRect): DOMRect => {
  const { x, y, width, height } = domRect;
  return new DOMRect(
    Math.round(x),
    Math.round(y),
    Math.round(width),
    Math.round(height),
  );
};
