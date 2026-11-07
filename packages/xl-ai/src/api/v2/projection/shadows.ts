import type { BlockNoteEditor } from "@blocknote/core";

import { stableStringify } from "../blocks/json.js";
import { inlineContentToText } from "../blocks/text.js";
import type { LensInlineContent } from "../blocks/types.js";
import type { TextFormat } from "../formats/types.js";
import { formatCache } from "./cache.js";

/**
 * Returns the text that the format shows for an inline item that its parse
 * does not give back, for example "@Bob" for a mention in markdown (see
 * `MergeOptions.shadowOf`). `undefined` if the parse gives back an item of
 * that type. One serialize and one parse for each different item.
 */
export function shadowsOf(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
): (item: LensInlineContent) => string | undefined {
  const { shadows } = formatCache(editor, format);
  return (item) => {
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
        Array.isArray(content) &&
          !content.some((part) => part.type === item.type)
          ? inlineContentToText(content)
          : undefined,
      );
    }
    return shadows.get(key);
  };
}
