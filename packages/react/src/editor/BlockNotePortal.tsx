import { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  PortalElementOverride,
  usePortalElement,
} from "./PortalElementOverride.js";

/**
 * Renders BlockNote UI into an element outside the editor container while
 * preserving the view's theme and treating the content as editor UI for focus.
 * Render this inside the corresponding BlockNoteView's React tree.
 */
export function BlockNotePortal(props: {
  target: HTMLElement;
  children?: ReactNode;
}) {
  return (
    <PortalElementOverride target={props.target}>
      <PortalContent>{props.children}</PortalContent>
    </PortalElementOverride>
  );
}

function PortalContent(props: { children?: ReactNode }) {
  const portalElement = usePortalElement();
  return portalElement ? createPortal(props.children, portalElement) : null;
}
