import type { BlockNoteEditor } from "@blocknote/core";

import { alignmentKey, linkBlocks } from "../alignment/index.js";
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
  /** The ID of the source block that gave this view block (see `projectWithParts`). */
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
 * Renders the source document in the format and parses it back. Then links
 * each view block to the source block that gave it:
 *
 *     view  = parse(serialize(source))
 *     parts = for each source block: parse(serialize(the block alone))
 *     links = linkBlocks(parts, view)
 *
 * The format loses the block IDs, and it does not always give one view block
 * for each source block: a block can give no view block (see `Projection`).
 * A block that gives more than one view block throws (see
 * {@link assertOnePartEach}), and so does a view block that no block gives.
 * The source of each part is known, thus the parts give the links.
 *
 * Example, in plain text:
 *
 *     source: code block "first\n\nsecond", image, paragraph "End"
 *     text:   "first\nsecond\n\nEnd"
 *     view:   paragraph "first\nsecond", paragraph "End"
 *     parts:  code block: paragraph "first\nsecond"; image: none;
 *             "End": paragraph "End"
 *     links:  view block 0 to the code block, view block 1 to "End"
 *
 * Plain text writes the blank line of the code block as one newline. Thus,
 * the code block gives one paragraph: one part, not two (a block with more
 * parts throws). Plain text does not show the image. Thus, the image is an
 * invisible block.
 *
 * Method: our own design: a round trip through the format, and links by
 * `linkBlocks`.
 */
export function projectDocument(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  source: readonly LensBlock[],
  /** The text of the source document in the format, if the caller has it. */
  text = format.serialize(editor, source),
): Projection {
  const view = viewOf(editor, format, text);
  const sources = flattenBlocks(source);
  return projectWithParts(
    sources,
    view,
    partsOf(editor, format, sources, view, text),
  );
}

/**
 * The projection that the parts of the source blocks give (see `projectDocument`).
 * Each view block links to the source block of its part. A view block
 * without a part is a bug of the format: the function throws. The one
 * exception is the fill of the schema (see {@link isSchemaFill}).
 *
 * @internal
 */
export function projectWithParts(
  sources: readonly FlatBlock[],
  view: readonly FlatBlock[],
  parts: readonly Part[],
): Projection {
  assertOnePartEach(sources, parts);
  const blocks = isSchemaFill(view, parts) ? [] : view;
  // `links[v]` is the index of the part that gave view block `v`.
  const links = linkBlocks(
    parts.map(({ part }) => part),
    blocks,
  );
  const linked = new Set<string>();
  const viewBlocks = blocks.map((flat, v): ViewBlock => {
    const link = links[v];
    if (link === undefined) {
      throw new Error(
        `The format shows a block of type "${flat.block.type}" that no block of the document gives. The parse of a format must give only blocks that its serialize shows.`,
      );
    }
    const sourceId = sources[parts[link].sourceIndex].block.id;
    linked.add(sourceId);
    return { ...flat, sourceId };
  });
  return {
    view: viewBlocks,
    invisibleIds: new Set(
      sources.map(({ block }) => block.id).filter((id) => !linked.has(id)),
    ),
  };
}

/**
 * The round trip of each block alone. "A block alone" is the block as a
 * document of its own: at the top level, without its children, and apart
 * from the other blocks. Thus, the view blocks that a block gives come only
 * from that block.
 *
 * Example: for the code block and the image of the example of
 * {@link projectDocument}, the batch is `[S, code block, S, image, S]` (S is
 * a separator). In plain text, its parse is
 * `[S, paragraph "first\nsecond", S, S]`. Thus, the code block gives one
 * paragraph, and the image gives no block.
 *
 * All blocks go through one serialize and one parse, each block between two
 * separators. The separator is a paragraph with only a character that `text`
 * does not contain. A format that does not keep these paragraphs apart from
 * the blocks is a bug. Returns the view blocks that each block gives.
 *
 * @internal
 */
export function roundTripAlone(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  blocks: readonly BlockWithoutChildren[],
  text: string,
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
  return result;
}

/**
 * A view block that a source block gives alone (a part), and the index of that source block in `sources`.
 */
type Part = { part: FlatBlock; sourceIndex: number };

/**
 * The parts of each source block. Their definition is one round trip for
 * each block alone (see `projectDocument`). This function gives the same
 * parts with two shortcuts. Each shortcut needs a property of the format,
 * thus `projectDocument.fuzz.test.ts` compares the result with the
 * definition on random documents.
 *
 * 1. A block that the view shows as it is (see {@link shownBlocks}) is its
 *    own part, without a round trip: alone, it gives one block with the same
 *    key. Most blocks are such blocks.
 * 2. The other blocks make one round trip together: one serialize and one
 *    parse, not one for each block (see {@link roundTripAlone}).
 *
 * A layout block (for example a column) is its own part: alone, the parse
 * would fill it with new blocks.
 *
 * In the example of {@link projectDocument}, "End" is its own part. The code
 * block and the image make one round trip together.
 */
function partsOf(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  sources: readonly FlatBlock[],
  view: readonly FlatBlock[],
  text: string,
): Part[] {
  const shown = shownBlocks(sources, view);
  const needRoundTrip = notLayoutBlocks(editor, sources).filter(
    (sourceIndex) => !shown.has(sourceIndex),
  );
  const groups = roundTripAlone(
    editor,
    format,
    needRoundTrip.map((sourceIndex) => sources[sourceIndex].block),
    text,
  );
  const roundTripParts = new Map(
    needRoundTrip.map((sourceIndex, k) => [sourceIndex, groups[k]]),
  );
  // Each other block (a layout block, or a block that the view shows as it
  // is) is its own part.
  return sources.flatMap((flat, sourceIndex) =>
    (
      roundTripParts.get(sourceIndex) ?? [{ ...flat, parentIndex: undefined }]
    ).map((part) => ({ part, sourceIndex })),
  );
}

/** The indexes of the source blocks that are not layout blocks. */
function notLayoutBlocks(
  editor: BlockNoteEditor<any, any, any>,
  sources: readonly FlatBlock[],
): number[] {
  const { layoutRuleOf } = schemaRulesOf(editor);
  return sources.flatMap(({ block }, sourceIndex) =>
    layoutRuleOf(block.type) === undefined ? [sourceIndex] : [],
  );
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
 * the view block at the place of the block has the same key (see
 * `alignmentKey`). For a block with content, the key is its text and its
 * content shape. For a block without content, it is all its fields. The
 * anchored match of the keys gives the places. Example (plain text): the view
 * shows the paragraph "End" as it is, but not the code block
 * "first\n\nsecond" (its view block has the text "first\nsecond").
 *
 * A block with content that has no text (or only white space) does not
 * count, for example an empty paragraph: all these blocks have almost the
 * same key, and the formats often hide them.
 *
 * The round trip of such a block alone gives one block with the same key.
 * Thus, the block is its own part, without a round trip. The three formats
 * have this property. A format that hides a block with text can break it:
 * if the view block next to the hidden block has the same key, the hidden
 * block is in the result, and that view block can link to it.
 */
function shownBlocks(
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
 * Returns true if `view` is only the fill of the schema. The parse of a text
 * without blocks gives one empty paragraph, because a document needs a
 * block (markdown and HTML). No source block gave that paragraph. The text
 * has no blocks if no source block gives a part. Example: a document with
 * only an image without a URL, in markdown (its text is empty) or in HTML
 * (its text is `<img>`).
 */
function isSchemaFill(
  view: readonly FlatBlock[],
  parts: readonly Part[],
): boolean {
  return (
    parts.length === 0 &&
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

/**
 * Throws if the format shows a source block alone as more than one block. A
 * block type whose export reads back as more blocks is a bug of that block
 * type: the lens needs one view block at most for each block (see
 * `TextFormat`). The parts of a block are next to each other in `parts`.
 */
function assertOnePartEach(
  sources: readonly FlatBlock[],
  parts: readonly Part[],
): void {
  for (let k = 1; k < parts.length; k++) {
    if (parts[k].sourceIndex === parts[k - 1].sourceIndex) {
      const { type } = sources[parts[k].sourceIndex].block;
      throw new Error(
        `The format shows a block of type "${type}" as more than one block. The export of a block type must read back as one block, or as no block.`,
      );
    }
  }
}
