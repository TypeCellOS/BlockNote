import type { BlockNoteEditor } from "@blocknote/core";

import type { LensInlineContent } from "../model.js";
import { inlineContentToText, stableStringify } from "../util/blocks/index.js";
import type { TextFormat } from "../formats/index.js";
import { formatCache } from "./cache.js";

/**
 * Returns the text that the format shows for an inline item that its parse
 * does not give back, for example "@Bob" for a mention in markdown (see
 * `MergeOptions.shadowOf`). `undefined` if the parse gives back an item of
 * that type. One serialize and one parse for each different item, kept in
 * the cache of the editor and the format.
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
  const { shadows } = formatCache(editor, format);
  const key = stableStringify(item);
  if (!shadows.has(key)) {
    const [block] = format.parse(
      editor,
      format.serialize(editor, [
        {
          id: "",
          type: "paragraph",
          props: {},
          content: [item],
          children: [],
        },
      ]),
    );
    const content = block?.content;
    shadows.set(
      key,
      Array.isArray(content) && !content.some((part) => part.type === item.type)
        ? inlineContentToText(content)
        : undefined,
    );
  }
  return shadows.get(key);
}
