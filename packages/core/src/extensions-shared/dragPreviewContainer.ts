import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";

/**
 * Returns the element that native drag previews (`DataTransfer.setDragImage`)
 * should be attached to.
 *
 * `setDragImage` rasterizes the element in place, so whatever is passed to it
 * has to be in the DOM *and* has to resolve the same CSS as the content it's a
 * preview of. Attaching it to `document.body` breaks the second half: styling
 * that comes from an ancestor of the editor - theme classes, and especially
 * custom properties set on a wrapper element - stops applying, and the preview
 * renders unstyled.
 *
 * `editor.portalElement` avoids that: it's mounted inside the editor's
 * container by default, so it inherits the same cascade, and apps that need it
 * somewhere else can already move it with the `portalTarget` option.
 *
 * Falls back to the document/shadow root when the portal element isn't in the
 * DOM (an editor that was never mounted), since an unattached drag image is
 * worse than a badly styled one - the browser replaces it with a ghost of the
 * entire editor.
 */
function getDragPreviewContainer(
  editor: BlockNoteEditor<any, any, any>,
): HTMLElement | ShadowRoot {
  const portalElement = editor.portalElement;

  if (portalElement.isConnected) {
    return portalElement;
  }

  const root = editor.prosemirrorView.root;

  return root instanceof ShadowRoot ? root : root.body;
}

/**
 * Puts `preview` where the browser can rasterize it for `setDragImage`, and
 * takes it back out once it has.
 *
 * The preview can't be hidden with `opacity`, `visibility` or `display` while
 * it sits there: Firefox and WebKit rasterize the element as painted, so
 * anything that makes it invisible on the page makes it invisible in the drag
 * image too (Chrome ignores `opacity` here, which is why an `opacity: 0.001`
 * workaround looked like it worked). It's rendered normally instead and removed
 * on the next tick - the snapshot is taken as `dragstart` finishes, so that's
 * all the time it needs to exist, and `.bn-drag-preview` keeps it behind the
 * page's content in the meantime.
 *
 * Callers still clear the preview on `dragend` as a backstop, which by then is
 * normally a no-op.
 */
export function attachDragPreview(
  editor: BlockNoteEditor<any, any, any>,
  preview: Element,
) {
  getDragPreviewContainer(editor).appendChild(preview);

  setTimeout(() => preview.remove(), 0);
}
