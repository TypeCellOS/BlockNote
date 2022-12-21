import { HyperlinkHoverMenuUpdateProps } from "./types";

export function getHyperlinkHoverMenuUpdateProps(
  hyperlinkUrl: string,
  hyperlinkText: string,
  hyperlinkBoundingBox: DOMRect
): HyperlinkHoverMenuUpdateProps {
  return {
    hyperlinkUrl: hyperlinkUrl,
    hyperlinkText: hyperlinkText,
    hyperlinkBoundingBox: hyperlinkBoundingBox,
  };
}
