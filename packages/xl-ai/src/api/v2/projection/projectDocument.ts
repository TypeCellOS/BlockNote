import type { BlockNoteEditor } from "@blocknote/core";

import { alignmentKey, linkBlocks } from "../alignment/alignBlocks.js";
import { flattenBlocks, withoutChildren } from "../blocks/flatten.js";
import { schemaRulesOf } from "../blocks/schema.js";
import { blockToText } from "../blocks/text.js";
import type { FlatBlock, LensBlock } from "../blocks/types.js";
import { anchoredMatch } from "../diff/anchored.js";
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
  /** The text of the document, parsed back into a flat list: the document as the format shows it. */
  view: ViewBlock[];
  /**
   * Source blocks without a link from a view block, because they render as no
   * text (for example empty paragraphs in markdown). The text cannot change
   * them, thus they stay where they are.
   */
  invisibleIds: Set<string>;
  /** The source blocks with links from more than one view block: the indexes of these view blocks, in order. */
  multiParts: Map<string, number[]>;
};

/**
 * Renders the document in the format and parses it back. Then links each view
 * block to the source block that gave it: the view blocks of the document
 * link to the parts of the source blocks (see `partsOf` and `linkBlocks`).
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
  const parts = partsOf(sourceBlocks, viewBlocks, text);
  const links = linkBlocks(
    parts.map(({ part }) => part),
    viewBlocks,
  ).map((index) => (index === undefined ? undefined : parts[index].source));

  /** The view blocks of each source block. */
  const viewsOf = new Map<string, number[]>();
  const view: ViewBlock[] = viewBlocks.map((flat, v) => {
    const sourceIndex = links[v];
    const sourceId =
      sourceIndex === undefined
        ? undefined
        : sourceBlocks[sourceIndex].block.id;
    if (sourceId !== undefined) {
      const views = viewsOf.get(sourceId);
      if (views === undefined) {
        viewsOf.set(sourceId, [v]);
      } else {
        views.push(v);
      }
    }
    return { ...flat, sourceId };
  });

  const invisibleIds = new Set(
    sourceBlocks.map(({ block }) => block.id).filter((id) => !viewsOf.has(id)),
  );
  const multiParts = new Map(
    [...viewsOf].filter(([, views]) => views.length > 1),
  );
  return { view, invisibleIds, multiParts };

  /**
   * The parts of each source block: the view blocks that the block gives
   * alone, without its children. Thus, the source of each part is known. A
   * block that the format renders as no text (for example an image without a
   * URL, in markdown) has no parts. A block can have more than one part (for
   * example a code block with a blank line, in plain text).
   *
   * Most blocks are their own part, because the view shows them as they are
   * (see {@link shownBlocks}). A layout block (for example a column) is not a
   * document without its children: the parse fills it with new blocks.
   * Thus, a layout block is also its own part.
   *
   * One round trip gives the parts of the other blocks: the blocks alone, at
   * the top level, with a separator between them. The separator is a
   * paragraph with only a character that the text does not contain. A format
   * that does not keep these paragraphs apart from the blocks is a bug. A
   * separator also comes before the first block and after the last block of
   * the round trip, if the document has another block (not a layout block)
   * there. Thus, each block of the round trip is between two separators, or
   * at the start or the end of the text, as in the text of the document. The
   * parse of a block can depend on this: for example, plain text removes the
   * white space at the end of a block only before a blank line.
   */
  function partsOf(
    sources: readonly FlatBlock[],
    view: readonly FlatBlock[],
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
    const { layoutRuleOf } = schemaRulesOf(editor);
    const shown = shownBlocks(sources, view);
    const notLayout = sources.flatMap(({ block }, source) =>
      layoutRuleOf(block.type) === undefined ? [source] : [],
    );
    const alone = notLayout.filter((source) => !shown.has(source));
    const before = alone[0] !== notLayout[0];
    const after = alone[alone.length - 1] !== notLayout[notLayout.length - 1];
    const batch = [
      separator,
      ...alone.flatMap((source) => [
        withoutChildren(sources[source].block),
        separator,
      ]),
    ].slice(before ? 0 : 1, after ? undefined : -1);
    const own = alone.length === 0 ? "" : format.serialize(editor, batch);
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
    const ownGroups = groups.slice(before ? 1 : 0, after ? -1 : undefined);
    if (alone.length > 0 && ownGroups.length !== alone.length) {
      throw new Error("The format did not keep the blocks apart");
    }
    const partsOfAlone = new Map(
      alone.map((source, k) => [source, ownGroups[k]]),
    );
    return sources.flatMap((flat, source) =>
      (partsOfAlone.get(source) ?? [{ ...flat, parentIndex: undefined }]).map(
        (part) => ({ part, source }),
      ),
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
 * Returns the indexes of the source blocks that the view shows as they are:
 * the view block at the place of the block has the same key (see
 * `alignmentKey`). For a block with content, the key is its text and its
 * content shape. For a block without content, it is all its fields. The
 * anchored match of the keys gives the places. A block with content that
 * has no text (or only white space) does not count, for example an empty
 * paragraph: all these blocks have almost the same key, and the formats
 * often hide them.
 *
 * The round trip of such a block alone gives one block with the same key.
 * Thus, the block is its own part, without a round trip. The three formats
 * have this property (`api.fuzz.test.ts` examines it). A format that hides a
 * block with text can break it: if the view block next to the hidden block
 * has the same key, the hidden block is in the result, and that view block
 * can link to it.
 */
export function shownBlocks(
  sources: readonly FlatBlock[],
  view: readonly FlatBlock[],
): Set<number> {
  return new Set(
    anchoredMatch(sources, view, ({ block }) => alignmentKey(block))
      .filter(({ aIndex }) => {
        const { block } = sources[aIndex];
        return block.content === undefined || blockToText(block).trim() !== "";
      })
      .map(({ aIndex }) => aIndex),
  );
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
