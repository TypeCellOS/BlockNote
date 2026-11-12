import type { BlockNoteEditor } from "@blocknote/core";

import type { LensInlineContent } from "../model.js";
import { inlineContentToText } from "../util/blocks/index.js";
import type { TextFormat } from "../formats/index.js";

/**
 * Returns the text that the format shows for an inline item that its parse
 * does not give back, for example "@Bob" for a mention in markdown (see
 * `MergeRules.hiddenItems`). `undefined` if the parse gives back an item of
 * that type. One serialize and one parse for each call.
 *
 * The result is the text of the parse of the serialized item, not the
 * serialized text:
 *
 * - The parse tells if the format gives back the item. If it does, the item
 *   has no shadow.
 * - The merge aligns the shadow with the characters of parsed text: the view
 *   and the text of the client are parses. The serialized text is markup:
 *   HTML tags and entities, markdown escapes and line ends, and the link
 *   syntax for an item that the format writes as a link.
 */
export function shadowOf(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  item: LensInlineContent,
): string | undefined {
  const [block] = format.parse(
    editor,
    format.serialize(editor, [
      { id: "", type: "paragraph", props: {}, content: [item], children: [] },
    ]),
  );
  const content = block?.content;
  return Array.isArray(content) &&
    !content.some((part) => part.type === item.type)
    ? inlineContentToText(content)
    : undefined;
}
