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
    const { layoutRuleOf } = schemaRulesOf(editor);
    const shown = shownBlocks(sources, view);
    const notLayout = sources.flatMap(({ block }, source) =>
      layoutRuleOf(block.type) === undefined ? [source] : [],
    );
    const alone = notLayout.filter((source) => !shown.has(source));
    const ownGroups = roundTripAlone(
      editor,
      format,
      alone.map((source) => sources[source].block),
      text,
      {
        before: alone[0] !== notLayout[0],
        after: alone[alone.length - 1] !== notLayout[notLayout.length - 1],
      },
    );
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
 * The round trip of each block alone, without its children, in one
 * serialize and one parse: the blocks at the top level, with a separator
 * between them. The separator is a paragraph with only a character that
 * `text` does not contain. A format that does not keep these paragraphs
 * apart from the blocks is a bug. With `edges`, a separator also comes before
 * the first block or after the last block: the parse of a block can depend
 * on the block next to it (for example, plain text removes the white space
 * at the end of a block only before a blank line). Returns the view blocks
 * that each block gives.
 */
export function roundTripAlone(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  blocks: readonly LensBlock[],
  text: string,
  edges: { before: boolean; after: boolean },
): FlatBlock[][] {
  if (blocks.length === 0) {
    return [];
  }
  const marker = unusedMarker(text);
  const separator: LensBlock = {
    id: "",
    type: "paragraph",
    props: {},
    content: [{ type: "text", text: marker, styles: {} }],
    children: [],
  };
  const batch = [
    separator,
    ...blocks.flatMap((block) => [withoutChildren(block), separator]),
  ].slice(edges.before ? 0 : 1, edges.after ? undefined : -1);
  const own = format.serialize(editor, batch);
  const stored =
    own.trim() === "" ? [] : toStoredBlocks(editor, format.parse(editor, own));
  if (stored === undefined) {
    throw new Error("The round trip of a block does not fit the schema");
  }
  const groups: FlatBlock[][] = [[]];
  for (const flat of flattenBlocks(stored)) {
    if (flat.parentIndex === undefined && blockToText(flat.block) === marker) {
      groups.push([]);
    } else {
      groups[groups.length - 1].push(flat);
    }
  }
  const result = groups.slice(
    edges.before ? 1 : 0,
    edges.after ? -1 : undefined,
  );
  if (result.length !== blocks.length) {
    throw new Error("The format did not keep the blocks apart");
  }
  return result;
}

/**
 * Returns the blocks of a text without the blocks that the format does not
 * show: the round trip of such a block alone gives no block. An example is
 * an image without a URL in markdown, which a broken HTML tag in the text
 * can give. The text cannot keep such a block: after the write, the view
 * does not show it, thus each later write of the same text would add it
 * again (PutTwice). Only a block without text and without children that no
 * view block shows (by key) needs the round trip.
 */
export function withoutHiddenBlocks(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  blocks: readonly LensBlock[],
  view: readonly FlatBlock[],
  text: string,
): readonly LensBlock[] {
  const viewKeys = new Set(view.map(({ block }) => alignmentKey(block)));
  const candidates: LensBlock[] = [];
  function collect(list: readonly LensBlock[]) {
    for (const block of list) {
      if (
        block.children.length === 0 &&
        blockToText(block).trim() === "" &&
        !viewKeys.has(alignmentKey(block))
      ) {
        candidates.push(block);
      }
      collect(block.children);
    }
  }
  collect(blocks);
  const parts = roundTripAlone(editor, format, candidates, text, {
    before: true,
    after: true,
  });
  const hidden = new Set(candidates.filter((_, k) => parts[k].length === 0));
  if (hidden.size === 0) {
    return blocks;
  }
  function keep(list: readonly LensBlock[]): LensBlock[] {
    return list.flatMap((block) =>
      hidden.has(block) ? [] : [{ ...block, children: keep(block.children) }],
    );
  }
  return keep(blocks);
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
