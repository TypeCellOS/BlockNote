import { HyperlinkHoverMenuProps } from "./types";

// TODO: remove nesting
export function getHyperlinkHoverMenuProps(
  url: string,
  text: string,
  editHyperlink: (url: string, text: string) => void,
  deleteHyperlink: () => void,
  hyperlinkBoundingBox: DOMRect,
  editorElement: Element
): HyperlinkHoverMenuProps {
  return {
    hyperlink: {
      url: url,
      text: text,
      edit: editHyperlink,
      delete: deleteHyperlink,
    },
    view: {
      hyperlinkBoundingBox: hyperlinkBoundingBox,
      editorElement: editorElement,
    },
  };
}
