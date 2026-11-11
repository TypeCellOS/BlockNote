import type { BlockNoteEditor } from "@blocknote/core";

import type { LensBlock } from "../model.js";
import type { TextFormat } from "../formats/index.js";
import { projectDocument, type Projection } from "./projectDocument.js";

/**
 * The work of the format for one editor and one format, kept between calls:
 *
 * - The text and the projection of the last document. A read of the text
 *   and a write of a changed text both need the text of the same version,
 *   and a client can write more than one time from one version. The key is
 *   the JSON of the document: it costs milliseconds, and the serialize and
 *   the parse cost seconds for a large document.
 * - The shadow of each inline item (see `shadowOf` in `shadows.ts`). It
 *   depends only on the item.
 *
 * The cache keeps one document for each editor and format, and it goes with
 * the editor.
 */
type FormatCache = {
  last?: { key: string; text: string; projection?: Projection };
  shadows: Map<string, string | undefined>;
};

const caches = new WeakMap<
  BlockNoteEditor<any, any, any>,
  Map<TextFormat, FormatCache>
>();

/**
 * Returns the text of the source document in the format, and a function that
 * gives its projection. Both come from the cache if the source is the last
 * document of the editor and the format.
 */
export function documentText(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  source: readonly LensBlock[],
): { text: string; projection: () => Projection } {
  const cache = formatCache(editor, format);
  const key = JSON.stringify(source);
  if (cache.last?.key !== key) {
    cache.last = { key, text: format.serialize(editor, source) };
  }
  const last = cache.last;
  return {
    text: last.text,
    projection: () => {
      last.projection ??= projectDocument(editor, format, source, last.text);
      return last.projection;
    },
  };
}

/** @internal */
export function formatCache(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
): FormatCache {
  let byFormat = caches.get(editor);
  if (byFormat === undefined) {
    byFormat = new Map();
    caches.set(editor, byFormat);
  }
  let cache = byFormat.get(format);
  if (cache === undefined) {
    cache = { shadows: new Map() };
    byFormat.set(format, cache);
  }
  return cache;
}
