import { createExtension } from "../../editor/BlockNoteExtension.js";

/**
 * Announces short status messages to screen readers through a polite live
 * region, for editor changes that only show visually (e.g. indenting a block
 * with Tab).
 *
 * The region is a visually hidden sibling of the editor's `contenteditable`
 * element, so ProseMirror never sees it and it stays near the editor in the
 * accessibility tree (e.g. inside the same modal dialog).
 */
export const LiveAnnouncerExtension = createExtension(() => {
  let region: HTMLElement | undefined;

  return {
    key: "liveAnnouncer",
    mount({ dom, signal }) {
      const liveRegion = dom.ownerDocument.createElement("div");
      liveRegion.className = "bn-live-announcer";
      liveRegion.setAttribute("role", "status");
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.setAttribute("aria-atomic", "true");
      // Visually hidden, but still exposed to assistive technologies. Inline
      // so it holds without any stylesheet.
      Object.assign(liveRegion.style, {
        position: "absolute",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        clipPath: "inset(50%)",
        whiteSpace: "nowrap",
      });
      // The region has to be in the DOM before its content changes for the
      // change to be announced, so it's added up front rather than on demand.
      dom.after(liveRegion);
      region = liveRegion;

      signal.addEventListener(
        "abort",
        () => {
          liveRegion.remove();
          if (region === liveRegion) {
            region = undefined;
          }
        },
        { once: true },
      );
    },
    /**
     * Announces a message to screen readers. Does nothing while the editor
     * isn't mounted.
     */
    announce(message: string) {
      if (!region) {
        return;
      }
      // Replacing the text node, rather than editing it, makes screen readers
      // repeat a message that's identical to the previous one.
      region.replaceChildren(region.ownerDocument.createTextNode(message));
    },
  };
});
