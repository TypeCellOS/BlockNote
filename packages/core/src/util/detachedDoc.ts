let _detachedDoc: Document | null = null;

/**
 * The one document for content from outside the editor (a paste, a drop, an
 * HTML or markdown string, the HTML of an export). It has no browsing context:
 * content in it cannot load a resource or run an event handler.
 *
 * Do all DOM work on such content in this document, never in the global
 * `document` or in `node.ownerDocument` (that can be the active document):
 * - An HTML string: parse it in `detachedDoc().createElement("div")` (set its
 *   `innerHTML`), and make more elements for that tree with
 *   `detachedDoc().createElement(...)`.
 * - A node that a caller gives you can be in any document. Do not move it, and
 *   do not use `node.cloneNode`: a clone is in the document of its source.
 *   Copy it with `detachedDoc().importNode(node, true)`.
 *
 * All callers share the document. They only make elements and copies with it,
 * and do not change the document itself.
 *
 * Similar to https://github.com/ProseMirror/prosemirror-view/blob/1251b2b412656a2a06263e4187574beb43651273/src/clipboard.ts#L204
 * See https://github.com/TypeCellOS/BlockNote/issues/601
 */
export function detachedDoc(): Document {
  return (
    _detachedDoc ||
    (_detachedDoc = document.implementation.createHTMLDocument("title"))
  );
}
