import type { BlockNoteEditor } from "@blocknote/core";

import { alignmentKey } from "../alignment/index.js";
import type { BlockWithoutChildren, FlatBlock, LensBlock } from "../model.js";
import {
  blockToText,
  flattenBlocks,
  schemaRulesOf,
} from "../util/blocks/index.js";
import { anchoredMatch } from "../util/sequence/index.js";
import type { TextFormat } from "../formats/index.js";
import { parseText } from "../parse/index.js";

/** A block of the view: a block of the parse of the text of the document, with its link to a source block. */
export type ViewBlock = FlatBlock & {
  /** The ID of the source block that gave this view block (see `projectDocument`). */
  sourceId: string;
};

/** A document as a text format shows it, with links to the blocks of the document. */
export type Projection = {
  /** The text of the document, parsed back into a flat list: the document as the format shows it. */
  view: ViewBlock[];
  /**
   * Source blocks without a link from a view block, because they render as no
   * text (for example an image without a URL in markdown, or a block without
   * text in plain text). The text cannot change them, thus they stay where
   * they are.
   */
  invisibleIds: Set<string>;
};

/**
 * Renders the source document in the format and parses it back: the view.
 * Then finds the source block of each view block.
 *
 * The format loses the block IDs, but not the order of the blocks. Each
 * source block gives none or one view block, and the view has these blocks
 * in document order. Thus, the first view block comes from the first source
 * block that gives a view block, the second view block from the second, and
 * so on. The isolated round trip of a block tells if the block gives a view
 * block (see {@link roundTripIsolated}).
 *
 * Example, in plain text:
 *
 *     source:   code block "first\n\nsecond", image, paragraph "End"
 *     text:     "first\nsecond\n\nEnd"
 *     view:     paragraph "first\nsecond", paragraph "End"
 *     isolated: code block: paragraph "first\nsecond"; image: no block;
 *               "End": paragraph "End"
 *     links:    view block 0 to the code block, view block 1 to "End"
 *
 * Plain text writes the blank line of the code block as one newline. Thus,
 * the code block gives one paragraph, not two. Plain text does not show the
 * image. Thus, the image gives no view block: it is an invisible block.
 *
 * A format that does not keep this order is a bug (see `TextFormat`). The
 * function throws for a block that gives more than one view block, and for a
 * view that does not agree with the blocks that the source blocks give.
 *
 * Method: our own design.
 */
export function projectDocument(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  source: readonly LensBlock[],
  /** The text of the source document in the format, if the caller has it. */
  text = format.serialize(editor, source),
): Projection {
  const sources = flattenBlocks(source);
  const parsed = viewOf(editor, format, text);
  const sourceOf = sourcesOfView(editor, format, sources, parsed, text);
  const view = sourceOf.length === 0 && isSchemaFill(parsed) ? [] : parsed;
  if (view.length !== sourceOf.length) {
    throw new Error(
      `The format shows ${view.length} blocks, but the blocks of the document give ${sourceOf.length}. The parse of a format must give only the blocks that its serialize shows.`,
    );
  }
  const linked = new Set(sourceOf);
  return {
    view: view.map((flat, k) => ({
      ...flat,
      sourceId: sources[sourceOf[k]].block.id,
    })),
    invisibleIds: new Set(
      sources.flatMap(({ block }, i) => (linked.has(i) ? [] : [block.id])),
    ),
  };
}

/**
 * The isolated round trip of each block of `blocks`: returns, for each block,
 * the block that its round trip gives, or `undefined` if the format does not
 * show the block. An isolated block is a document of its own: the block at
 * the top level, without its children, between two separator paragraphs.
 * Thus, the result comes only from that block: the blocks around it in the
 * document cannot change it, and its children give their own results.
 *
 * A block gives one block at most. A block that gives more is a bug of its
 * block type, and the function throws.
 *
 * Example: for the code block and the image of the example of
 * {@link projectDocument}, the batch is `[S, code block, S, image, S]` (S is
 * a separator). In plain text, its parse is
 * `[S, paragraph "first\nsecond", S, S]`. Thus, the result is
 * `[paragraph "first\nsecond", undefined]`.
 *
 * All blocks go through one serialize and one parse, and each block is still
 * isolated. The separator is a paragraph with only a character that `text`
 * does not contain. A format that does not keep these paragraphs apart from
 * the blocks is a bug.
 *
 * @internal
 */
export function roundTripIsolated(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  blocks: readonly BlockWithoutChildren[],
  text: string,
): (FlatBlock | undefined)[] {
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
    ...blocks.flatMap((block) => [{ ...block, children: [] }, separator]),
  ];
  const parsed = parseText(editor, format, format.serialize(editor, batch));
  if (parsed.error !== undefined) {
    throw new Error("The round trip of a block does not fit the schema");
  }
  const groups: FlatBlock[][] = [[]];
  for (const flat of flattenBlocks(parsed.blocks)) {
    if (flat.parentIndex === undefined && blockToText(flat.block) === marker) {
      groups.push([]);
    } else {
      groups[groups.length - 1].push(flat);
    }
  }
  // The groups before the first separator and after the last one are empty.
  const result = groups.slice(1, -1);
  if (result.length !== blocks.length) {
    throw new Error("The format did not keep the blocks apart");
  }
  return result.map((group, k) => {
    if (group.length > 1) {
      throw new Error(
        `The format shows a block of type "${blocks[k].type}" as more than one block. The export of a block type must read back as one block, or as no block.`,
      );
    }
    return group[0];
  });
}

/**
 * Returns the indexes of the source blocks that give a view block, in
 * document order: view block `k` comes from source block `result[k]` (see
 * `projectDocument`).
 *
 * This is an optimized function. The simple version is in
 * `projectDocument.fuzz.test.ts`: the isolated round trip of each source
 * block, one block at a time. That is slow for a large document. This
 * function gives the same result with two shortcuts, and the fuzz test
 * compares the two on random documents:
 *
 * 1. A block that the view shows as it is (see {@link shownBlocks}) gives
 *    a view block, without a round trip. Most blocks are such blocks.
 * 2. The other blocks share one isolated round trip (see
 *    {@link roundTripIsolated}).
 *
 * A layout block (for example a column) gets no round trip: isolated, the
 * parse would fill it with new blocks. HTML shows a layout block as it is
 * (shortcut 1). Markdown and plain text do not show it.
 *
 * In the example of {@link projectDocument}, "End" gives its view block
 * without a round trip. The code block and the image share one round trip.
 */
function sourcesOfView(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  sources: readonly FlatBlock[],
  view: readonly FlatBlock[],
  text: string,
): number[] {
  const shown = shownBlocks(sources, view);
  const { layoutRuleOf } = schemaRulesOf(editor);
  const needRoundTrip = sources.flatMap(({ block }, i) =>
    shown.has(i) || layoutRuleOf(block.type) !== undefined ? [] : [i],
  );
  const results = roundTripIsolated(
    editor,
    format,
    needRoundTrip.map((i) => sources[i].block),
    text,
  );
  const roundTripGives = new Set(
    needRoundTrip.filter((_, k) => results[k] !== undefined),
  );
  const sourceOf = sources.flatMap((_, i) =>
    shown.has(i) || roundTripGives.has(i) ? [i] : [],
  );
  // A block that the view shows as it is gives the view block at its place in
  // the document order, thus that view block has its key. A format that
  // changes the order of the blocks breaks this (the count does not change).
  sourceOf.forEach((i, k) => {
    if (
      shown.has(i) &&
      k < view.length &&
      alignmentKey(view[k].block) !== alignmentKey(sources[i].block)
    ) {
      throw new Error("The format does not show the blocks in document order");
    }
  });
  return sourceOf;
}

/**
 * The view: the text of the source document, parsed back with the parse of
 * the text of a client (see `parseText`). The text comes from the document,
 * thus its blocks fit the schema.
 *
 * For a text without blocks, the parse gives one empty paragraph: the fill
 * of the schema (see {@link isSchemaFill}). This is not a problem of the
 * parse: a parse without the fill gives a document that the schema does not
 * allow (a test of core without the fill broke 20 PutGet tests).
 */
function viewOf(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  text: string,
): FlatBlock[] {
  const parsed = parseText(editor, format, text);
  if (parsed.error !== undefined) {
    throw new Error("The text of the document does not fit its schema");
  }
  return flattenBlocks(parsed.blocks);
}

/**
 * Returns the indexes of the source blocks that the view shows as they are:
 * the view has a block with the same key (see `alignmentKey`) at the place of
 * the block. For a block with content, the key is its text and its content
 * shape. For a block without content, it is all its fields. The anchored
 * match of the keys gives the places. Example (plain text): the view shows
 * the paragraph "End" as it is, but not the code block "first\n\nsecond"
 * (its view block has the text "first\nsecond").
 *
 * Only the set of blocks counts, not the view block of each pair: the
 * document order gives the view block of each block (see `sourcesOfView`).
 * Two view blocks can have the same key, and the match can pair a block
 * with the wrong one of the two.
 *
 * A block with content that has no text (or only white space) does not
 * count, for example an empty paragraph: all these blocks have almost the
 * same key, and the formats often hide them.
 *
 * The isolated round trip of such a block gives one block with the same key.
 * Thus, the block needs no round trip. The three formats have this property.
 * A format that hides a block with text can break it: if the view block next
 * to the hidden block has the same key, the hidden block can get the link.
 */
function shownBlocks(
  sources: readonly FlatBlock[],
  view: readonly FlatBlock[],
): Set<number> {
  const matches = anchoredMatch(sources, view, ({ block }) =>
    alignmentKey(block),
  ).filter(({ aIndex }) => {
    const { block } = sources[aIndex];
    return block.content === undefined || blockToText(block).trim() !== "";
  });
  return new Set(matches.map(({ aIndex }) => aIndex));
}

/**
 * Returns true if `view` is only the fill of the schema. The parse of a text
 * without blocks gives one empty paragraph, because a document needs a block
 * (markdown and HTML). `projectDocument` asks this only if no source block
 * gives a view block, thus the text has no blocks. Example: a document with
 * only an image without a URL, in markdown (its text is empty) or in HTML
 * (its text is `<img>`).
 */
function isSchemaFill(view: readonly FlatBlock[]): boolean {
  return (
    view.length === 1 &&
    Array.isArray(view[0].block.content) &&
    blockToText(view[0].block) === ""
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
