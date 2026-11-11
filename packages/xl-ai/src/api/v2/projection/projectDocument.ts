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
   * text (for example an image without a URL in markdown, or a block without
   * text in plain text). The text cannot change them, thus they stay where
   * they are.
   */
  invisibleIds: Set<string>;
  /** The source blocks with links from more than one view block: the indexes of these view blocks, in order. */
  multiParts: Map<string, number[]>;
};

/**
 * A view block that a source block gives alone (a part), and the index of that source block in `sources`.
 */
type Part = { part: FlatBlock; sourceIndex: number };

/**
 * Renders the source document in the format and parses it back. Then links
 * each view block to the source block that gave it:
 *
 *     view  = parse(serialize(source))
 *     parts = for each source block: parse(serialize(the block alone))
 *     links = linkBlocks(parts, view)
 *
 * The format loses the block IDs, and it does not always give one view block
 * for each source block: a block can give no view block or more than one
 * (see `Projection`). The source of each part is known, thus the parts give
 * the links.
 *
 * Method: our own design: a round trip through the format, and links by
 * `linkBlocks`.
 *
 * @internal
 */
export function projectDocument(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  source: readonly LensBlock[],
  /** The text of the source document in the format, if the caller has it. */
  text = format.serialize(editor, source),
): Projection {
  const view = viewOf(editor, format, source, text);
  const sources = flattenBlocks(source);
  return projectWithParts(
    sources,
    view,
    partsOf(editor, format, sources, view, text),
  );
}

/**
 * The projection that the parts of the source blocks give (see `projectDocument`).
 *
 * @internal
 */
export function projectWithParts(
  sources: readonly FlatBlock[],
  view: readonly FlatBlock[],
  parts: readonly Part[],
): Projection {
  const links = linkBlocks(
    parts.map(({ part }) => part),
    view,
  );
  /** The view blocks of each source block. */
  const viewsOf = new Map<string, number[]>();
  const viewBlocks = view.map((flat, v): ViewBlock => {
    const link = links[v];
    const sourceId =
      link === undefined
        ? undefined
        : sources[parts[link].sourceIndex].block.id;
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
  return {
    view: viewBlocks,
    invisibleIds: new Set(
      sources.map(({ block }) => block.id).filter((id) => !viewsOf.has(id)),
    ),
    multiParts: new Map([...viewsOf].filter(([, views]) => views.length > 1)),
  };
}

/**
 * The parts of each source block: the view blocks that the block gives alone,
 * without its children, with one round trip for each block. This is the
 * definition of the parts. {@link partsOf} gives the same projection faster.
 *
 * - A block that the format renders as no text (for example an image
 *   without a URL, in markdown) has no parts. A block can have more than one
 *   part (for example a code block with a blank line, in plain text).
 * - A layout block (for example a column) is not a document without its
 *   children: the parse fills it with new blocks. Thus, a layout block is
 *   its own part.
 * - The round trip puts the block between two separator paragraphs (see
 *   {@link roundTripAlone}).
 *
 * @internal
 */
export function partsOfEachBlock(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  sources: readonly FlatBlock[],
  text: string,
): Part[] {
  const { layoutRuleOf } = schemaRulesOf(editor);
  return sources.flatMap((flat, sourceIndex) => {
    if (layoutRuleOf(flat.block.type) !== undefined) {
      return [{ part: { ...flat, parentIndex: undefined }, sourceIndex }];
    }
    const [own] = roundTripAlone(editor, format, [flat.block], text);
    return own.map((part) => ({ part, sourceIndex }));
  });
}

/**
 * The parts of each source block, with two optimizations of
 * {@link partsOfEachBlock}. The two give the same projection
 * (`api.fuzz.test.ts` examines this on random documents).
 *
 * 1. A block that the view shows as it is (see {@link shownBlocks}) is its
 *    own part, without a round trip: alone, it gives one block with the same
 *    key. Most blocks are such blocks.
 * 2. The other blocks make one round trip together: one serialize and one
 *    parse, not one for each block (see {@link roundTripAlone}).
 */
function partsOf(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  sources: readonly FlatBlock[],
  view: readonly FlatBlock[],
  text: string,
): Part[] {
  const shown = shownBlocks(sources, view);
  const alone = notLayoutBlocks(editor, sources).filter(
    (sourceIndex) => !shown.has(sourceIndex),
  );
  const groups = roundTripAlone(
    editor,
    format,
    alone.map((sourceIndex) => sources[sourceIndex].block),
    text,
  );
  const partsOfAlone = new Map(
    alone.map((sourceIndex, k) => [sourceIndex, groups[k]]),
  );
  return sources.flatMap((flat, sourceIndex) =>
    (
      partsOfAlone.get(sourceIndex) ?? [{ ...flat, parentIndex: undefined }]
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
 * A source without blocks has no view blocks. Only a version as `base` can
 * have no blocks: the current document always has a block, because the
 * schema needs one. For the same reason, the parse of its text (an empty
 * text) gives one empty paragraph. That paragraph comes from no source
 * block. This is not a workaround of a problem in the parse: a parse
 * without that block gives a document that the schema does not allow (a
 * test of core without the fill broke 20 PutGet tests).
 */
function viewOf(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  source: readonly LensBlock[],
  text: string,
): FlatBlock[] {
  if (source.length === 0) {
    return [];
  }
  const parsed = parseText(editor, format, text);
  if (parsed.error !== undefined) {
    throw new Error("The text of the document does not fit its schema");
  }
  return flattenBlocks(parsed.blocks);
}

/**
 * The round trip of each block alone, without its children, in one
 * serialize and one parse: the blocks at the top level, each between two
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
