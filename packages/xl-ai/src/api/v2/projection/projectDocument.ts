import type { BlockNoteEditor } from "@blocknote/core";

import { linkBlocks } from "../alignment/alignBlocks.js";
import { flattenBlocks, withoutChildren } from "../blocks/flatten.js";
import { blockToText } from "../blocks/text.js";
import type { FlatBlock, LensBlock } from "../blocks/types.js";
import { toStoredBlocks } from "../formats/stored.js";
import type { TextFormat } from "../formats/types.js";

export type ViewBlock = FlatBlock & {
  /**
   * The ID of the source block that gave this view block. `undefined` if the
   * projection did not find a link.
   */
  sourceId: string | undefined;
};

/** A document as a text format shows it, with links to the blocks of the document. */
export type Projection = {
  /** The document, rendered in the format. A client reads this text. */
  text: string;
  /** `text`, parsed back into a flat list: the document as the format shows it. */
  view: ViewBlock[];
  /**
   * Source blocks without a link from a view block, because they render as no
   * text (for example empty paragraphs in markdown). The text cannot change
   * them, thus they stay where they are.
   */
  invisibleIds: Set<string>;
  /** Source blocks with links from more than one view block. */
  multiPartIds: Set<string>;
};

/**
 * Renders the document in the format and parses it back. Then links each view
 * block to the source block that gave it: each source block also makes the
 * round trip alone, and the view blocks of the document link to these parts
 * (see `linkBlocks`).
 */
export function projectDocument(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  document: readonly LensBlock[],
  /** The text of the document in the format, if the caller has it. */
  text = format.serialize(editor, document),
): Projection {
  // The parse of the text of an empty document can give a block (for example
  // one empty paragraph). That block comes from no document block, thus an
  // empty document has no view blocks.
  const viewBlocks =
    document.length === 0 ? [] : flattenBlocks(parseStored(text));
  const sourceBlocks = flattenBlocks(document);
  const parts = partsOf(sourceBlocks, text);
  const links = linkBlocks(
    parts.map(({ part }) => part),
    viewBlocks,
  ).map((index) => (index === undefined ? undefined : parts[index].source));

  const linkCounts = new Map<string, number>();
  const view: ViewBlock[] = viewBlocks.map((flat, v) => {
    const sourceIndex = links[v];
    const sourceId =
      sourceIndex === undefined
        ? undefined
        : sourceBlocks[sourceIndex].block.id;
    if (sourceId !== undefined) {
      linkCounts.set(sourceId, (linkCounts.get(sourceId) ?? 0) + 1);
    }
    return { ...flat, sourceId };
  });

  const invisibleIds = new Set<string>();
  const multiPartIds = new Set<string>();
  for (const { block } of sourceBlocks) {
    const count = linkCounts.get(block.id) ?? 0;
    if (count === 0) {
      invisibleIds.add(block.id);
    } else if (count > 1) {
      multiPartIds.add(block.id);
    }
  }

  return { text, view, invisibleIds, multiPartIds };

  /**
   * The parts of each source block: the view blocks that the block gives
   * alone, without its children. Thus, the source of each part is known. A
   * block that the format renders as no text (for example an image without a
   * URL, in markdown) has no parts. A block can have more than one part (for
   * example a code block with a blank line, in plain text). A layout block
   * (for example a column) is not a document without its children: the parse
   * fills it with new blocks. Thus, its part is the block.
   *
   * One round trip gives the parts of all blocks: the blocks alone, at the
   * top level, with a separator between them. The separator is a paragraph
   * with only a character that the text does not contain. A format that does
   * not keep these paragraphs apart from the blocks is a bug.
   */
  function partsOf(
    sources: readonly FlatBlock[],
    text: string,
  ): { part: FlatBlock; source: number }[] {
    const marker = unusedMarker(text);
    const separator: LensBlock = {
      id: "",
      type: "paragraph",
      props: {},
      content: [{ type: "text", text: marker, styles: {} }],
      children: [],
    };
    const isLayout = ({ block }: FlatBlock) =>
      editor.schema.blockSchema[block.type]?.layoutOnly === true;
    const alone = sources.flatMap((flat, source) =>
      isLayout(flat) ? [] : [source],
    );
    const own = format.serialize(
      editor,
      alone.flatMap((source, k) => {
        const block = withoutChildren(sources[source].block);
        return k === 0 ? [block] : [separator, block];
      }),
    );
    const parsed = own.trim() === "" ? [] : flattenBlocks(parseStored(own));
    const groups: FlatBlock[][] = [[]];
    for (const flat of parsed) {
      if (
        flat.parentIndex === undefined &&
        blockToText(flat.block) === marker
      ) {
        groups.push([]);
      } else {
        groups[groups.length - 1].push(flat);
      }
    }
    if (alone.length > 0 && groups.length !== alone.length) {
      throw new Error("The format did not keep the blocks apart");
    }
    let next = 0;
    return sources.flatMap((flat, source) =>
      (isLayout(flat)
        ? [{ ...flat, parentIndex: undefined }]
        : groups[next++]
      ).map((part) => ({ part, source })),
    );
  }

  /**
   * The parse of a text of the document, in the form that the document
   * stores blocks (as the blocks of a text of a client, see `api.ts`). The
   * text comes from the document, thus its blocks fit the schema.
   */
  function parseStored(source: string): LensBlock[] {
    const blocks = toStoredBlocks(editor, format.parse(editor, source));
    if (blocks === undefined) {
      throw new Error("The text of the document does not fit its schema");
    }
    return blocks;
  }
}

/**
 * A string of characters of the Unicode private use area that `text` does
 * not contain: one character, or else two.
 */
function unusedMarker(text: string): string {
  const first = 0xe000;
  const count = 0xf8ff - first + 1;
  for (let code = first; code < first + count; code++) {
    const char = String.fromCharCode(code);
    if (!text.includes(char)) {
      return char;
    }
  }
  for (let a = first; a < first + count; a++) {
    for (let b = first; b < first + count; b++) {
      const pair = String.fromCharCode(a, b);
      if (!text.includes(pair)) {
        return pair;
      }
    }
  }
  throw new Error("The text contains all pairs of private use characters");
}
