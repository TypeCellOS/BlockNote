import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";

/** Collect the link marks in document order, with their text and ranges. */
export function getLinksInDocument(editor: BlockNoteEditor) {
  return editor.transact(({ doc }) => {
    const links: Array<{
      text: string;
      href: string;
      from: number;
      to: number;
    }> = [];
    const linkType = doc.type.schema.marks.link;

    doc.descendants((node, pos) => {
      if (node.isText) {
        const linkMark = node.marks.find((mark) => mark.type === linkType);
        if (linkMark) {
          links.push({
            text: node.text ?? "",
            href: linkMark.attrs.href,
            from: pos,
            to: pos + node.nodeSize,
          });
        }
      }
    });
    return links;
  });
}
