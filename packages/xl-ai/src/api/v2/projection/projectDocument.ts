import type { BlockNoteEditor } from "@blocknote/core";

import { alignmentKey, linkBlocks } from "../alignment/alignBlocks.js";
import { flattenBlocks, withoutChildren } from "../blocks/flatten.js";
import { schemaRulesOf } from "../blocks/schema.js";
import { blockToText } from "../blocks/text.js";
import type { FlatBlock, LensBlock } from "../blocks/types.js";
import { anchoredMatch } from "../sequence/anchored.js";
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
   * text (for example an image without a URL in markdown, or a block without
   * text in plain text). The text cannot change them, thus they stay where
   * they are.
   */
  invisibleIds: Set<string>;
  /** The source blocks with links from more than one view block: the indexes of these view blocks, in order. */
  multiParts: Map<string, number[]>;
};

/** A view block that a source block gives alone (a part), and the index of that source block. */
export type Part = { part: FlatBlock; source: number };

/**
 * Renders the document in the format and parses it back. Then links each view
 * block to the source block that gave it:
 *
 *     view  = parse(serialize(document))
 *     parts = for each source block: parse(serialize(the block alone))
 *     links = linkBlocks(parts, view)
 *
 * The format loses the block IDs, and it does not always give one view block
 * for each source block: a block can give no view block or more than one
 * (see `Projection`). The source of each part is known, thus the parts give
 * the links.
 */
export function projectDocument(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  document: readonly LensBlock[],
  /** The text of the document in the format, if the caller has it. */
  text = format.serialize(editor, document),
): Projection {
  const view = viewOf(editor, format, document, text);
  const sources = flattenBlocks(document);
  return projectWithParts(
    sources,
    view,
    partsOf(editor, format, sources, view, text),
  );
}

/** The projection that the parts of the source blocks give (see `projectDocument`). */
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
      link === undefined ? undefined : sources[parts[link].source].block.id;
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
 * - The parse of a block can depend on its neighbors (for example, plain
 *   text removes the white space at the end of a block only before a blank
 *   line). Thus, the round trip has a separator before and after the block
 *   where the document has another block (see {@link roundTripAlone}).
 */
export function partsOfEachBlock(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  sources: readonly FlatBlock[],
  text: string,
): Part[] {
  const { layoutRuleOf } = schemaRulesOf(editor);
  const notLayout = notLayoutBlocks(editor, sources);
  const first = notLayout[0];
  const last = notLayout[notLayout.length - 1];
  return sources.flatMap((flat, source) => {
    if (layoutRuleOf(flat.block.type) !== undefined) {
      return [{ part: { ...flat, parentIndex: undefined }, source }];
    }
    const [own] = roundTripAlone(editor, format, [flat.block], text, {
      before: source !== first,
      after: source !== last,
    });
    return own.map((part) => ({ part, source }));
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
  const notLayout = notLayoutBlocks(editor, sources);
  const shown = shownBlocks(sources, view);
  const alone = notLayout.filter((source) => !shown.has(source));
  const groups = roundTripAlone(
    editor,
    format,
    alone.map((source) => sources[source].block),
    text,
    {
      before: alone[0] !== notLayout[0],
      after: alone[alone.length - 1] !== notLayout[notLayout.length - 1],
    },
  );
  const partsOfAlone = new Map(alone.map((source, k) => [source, groups[k]]));
  return sources.flatMap((flat, source) =>
    (partsOfAlone.get(source) ?? [{ ...flat, parentIndex: undefined }]).map(
      (part) => ({ part, source }),
    ),
  );
}

/** The indexes of the source blocks that are not layout blocks. */
function notLayoutBlocks(
  editor: BlockNoteEditor<any, any, any>,
  sources: readonly FlatBlock[],
): number[] {
  const { layoutRuleOf } = schemaRulesOf(editor);
  return sources.flatMap(({ block }, source) =>
    layoutRuleOf(block.type) === undefined ? [source] : [],
  );
}

/**
 * The view: the text of the document, parsed back in the form that the
 * document stores blocks (as the blocks of the text of a client). The text
 * comes from the document, thus its blocks fit the schema.
 *
 * The parse of the text of an empty document can give a block (for example
 * one empty paragraph: the schema needs a block). That block comes from no
 * document block, thus an empty document has no view blocks.
 */
function viewOf(
  editor: BlockNoteEditor<any, any, any>,
  format: TextFormat,
  document: readonly LensBlock[],
  text: string,
): FlatBlock[] {
  if (document.length === 0) {
    return [];
  }
  const blocks = toStoredBlocks(editor, format.parse(editor, text));
  if (blocks === undefined) {
    throw new Error("The text of the document does not fit its schema");
  }
  return flattenBlocks(blocks);
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
