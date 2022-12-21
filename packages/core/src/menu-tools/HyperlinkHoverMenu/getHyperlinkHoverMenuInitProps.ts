import { HyperlinkHoverMenuInitProps } from "./types";

export function getHyperlinkHoverMenuInitProps(
  editHyperlink: (url: string, text: string) => void,
  deleteHyperlink: () => void,
  editorElement: Element
): HyperlinkHoverMenuInitProps {
  return {
    editHyperlink: editHyperlink,
    deleteHyperlink: deleteHyperlink,
    editorElement: editorElement,
  };
}
