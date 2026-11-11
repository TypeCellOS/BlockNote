import type { PartialBlock } from "@blocknote/core";

import type { BlockWithoutChildren, LensBlock } from "../model.js";
import { blockToText } from "../util/blocks/text.js";
import { type Random, words } from "./random.js";

/**
 * Random documents with nested lists, and random edits of the nesting that
 * a text shows. Each block has a unique token ("w" and a number) in its text
 * or URL. The token identifies the block in the document, in the view and
 * in the text, also after a move.
 */

/** The list item types that markdown and HTML show as list items. */
const LIST_TYPES = [
  "bulletListItem",
  "numberedListItem",
  "checkListItem",
] as const;

type ListType = (typeof LIST_TYPES)[number];

export type NestedDocumentOptions = {
  /**
   * If true, some paragraphs, headings and quotes have children, and some
   * list items have paragraphs with children. Markdown does not show these
   * nestings. If false, only list items have children: markdown shows all
   * the nesting.
   */
  hidden: boolean;
  /**
   * If true, the children of a list item are only list items. HTML shows
   * only this nesting (the HTML parse ignores `data-nesting-level`).
   */
  listChildrenOnly?: boolean;
};

/** Returns a random document with nested lists, with 2 to 8 top-level blocks. */
export function randomNestedDocument(
  random: Random,
  options: NestedDocumentOptions,
): PartialBlock[] {
  let counter = 0;
  function text(): string {
    return `${words(random, 1 + random.int(3))} w${counter++}`;
  }

  function listItem(depth: number): PartialBlock {
    const type = random.pick([
      "bulletListItem",
      "bulletListItem",
      "numberedListItem",
      "checkListItem",
      "toggleListItem",
    ] as const);
    return {
      type,
      props: type === "checkListItem" ? { checked: random.chance(0.5) } : {},
      content: text(),
      children:
        depth < 4 && random.chance(0.45)
          ? Array.from({ length: 1 + random.int(3) }, () =>
              childOfListItem(depth + 1),
            )
          : [],
    } as PartialBlock;
  }

  function childOfListItem(depth: number): PartialBlock {
    if (options.listChildrenOnly || random.chance(0.6)) {
      return listItem(depth);
    }
    if (options.hidden && random.chance(0.3)) {
      return withHiddenChildren({ type: "paragraph", content: text() }, depth);
    }
    return leaf();
  }

  /** A block that is not a list item, without children. */
  function leaf(): PartialBlock {
    switch (random.int(6)) {
      case 0:
        return {
          type: "heading",
          props: { level: (1 + random.int(3)) as 1 | 2 | 3 },
          content: text(),
        };
      case 1:
        return { type: "quote", content: text() };
      case 2:
        return {
          type: "codeBlock",
          props: { language: "javascript" },
          content: text(),
        };
      case 3:
        return {
          type: "table",
          content: {
            type: "tableContent",
            rows: [{ cells: [text(), "x"] }, { cells: ["y", "z"] }],
          },
        };
      case 4:
        return {
          type: "image",
          props: { url: `https://example.com/w${counter++}.png` },
        };
      default:
        return { type: "paragraph", content: text() };
    }
  }

  /** The block with 1 or 2 children that markdown does not show as its children. */
  function withHiddenChildren(block: PartialBlock, depth: number) {
    return {
      ...block,
      children: Array.from({ length: 1 + random.int(2) }, () =>
        random.chance(0.6)
          ? listItem(depth + 1)
          : { type: "paragraph", content: text() },
      ),
    } as PartialBlock;
  }

  function topBlock(): PartialBlock {
    if (random.chance(0.5)) {
      return listItem(0);
    }
    const block = leaf();
    const canHide = ["paragraph", "heading", "quote"].includes(block.type!);
    return options.hidden && canHide && random.chance(0.5)
      ? withHiddenChildren(block, 0)
      : block;
  }

  return Array.from({ length: 2 + random.int(7) }, topBlock);
}

/** Returns the token of a block ("w" and a number), or `undefined`. */
export function tokenOf(block: BlockWithoutChildren): string | undefined {
  const url = typeof block.props.url === "string" ? block.props.url : "";
  return (blockToText(block) + " " + url).match(/w\d+/)?.[0];
}

/**
 * An edit of the nesting that a text shows, for the model of the expected
 * result (see {@link expectedParents}). A parent is a token, or `null` for
 * the top level.
 */
export type TreeEdit =
  /**
   * The block goes into the parent (the last child). `after` is the block
   * before it, if both are list items of one list.
   */
  | { kind: "move"; token: string; parent: string | null; after?: string }
  /** The block goes after `sibling`, in the parent of `sibling`. */
  | { kind: "moveAfter"; token: string; sibling: string }
  /** The block changes its type. */
  | { kind: "type"; token: string; type: ListType }
  /** Two adjacent blocks change places. */
  | { kind: "swap"; first: string; second: string }
  /** A new block after the block. */
  | { kind: "insert"; after: string }
  /** The block and the blocks that the view shows in it go. */
  | { kind: "remove"; tokens: string[] }
  /**
   * The block goes, and the blocks that the view shows in it take its place.
   * `after` is the block before a child, if both are list items of one list.
   */
  | {
      kind: "lift";
      token: string;
      children: { token: string; after: string | undefined }[];
    }
  /** The text of the block changes. */
  | { kind: "text"; token: string };

type Place = { block: LensBlock; siblings: LensBlock[]; parent?: LensBlock };

function placesOf(blocks: LensBlock[], parent?: LensBlock): Place[] {
  return blocks.flatMap((block) => [
    { block, siblings: blocks, parent },
    ...placesOf(block.children, block),
  ]);
}

function isListItem(block: LensBlock | undefined): boolean {
  return block !== undefined && block.type.endsWith("ListItem");
}

/**
 * The list of each list item type, as the exporters of BlockNote group the
 * list items (numbered list items make an ordered list, the others a
 * bullet list). The same as `LISTS` in `target/hiddenNesting.ts`.
 */
const LISTS: ReadonlyMap<string, string> = new Map([
  ["numberedListItem", "ordered"],
  ["bulletListItem", "bullet"],
  ["checkListItem", "bullet"],
  ["toggleListItem", "bullet"],
]);

/** The token of the block before `block` in `siblings`, if both are list items of one list. */
function previousInList(
  siblings: readonly LensBlock[],
  block: LensBlock,
): string | undefined {
  const previous = siblings[siblings.indexOf(block) - 1];
  const list = LISTS.get(block.type);
  return previous !== undefined &&
    list !== undefined &&
    LISTS.get(previous.type) === list
    ? tokenOf(previous)
    : undefined;
}

function tokensIn(block: LensBlock): string[] {
  return [block, ...block.children.flatMap(subtree)]
    .map(tokenOf)
    .filter((token): token is string => token !== undefined);
}

function subtree(block: LensBlock): LensBlock[] {
  return [block, ...block.children.flatMap(subtree)];
}

/** The kinds of the edits of {@link randomTreeEdit}. */
export const EDIT_KINDS = [
  "indent",
  "outdent",
  "type",
  "swap",
  "insert",
  "remove",
  "moveTo",
  "text",
  "lift",
] as const;

export type EditKind = (typeof EDIT_KINDS)[number];

/**
 * Applies one random edit of the nesting to the view (the parse of the
 * text), of the kind `kind`. Returns the edited view and the edit, or
 * `undefined` if the view has no block for that kind of edit. The edits:
 *
 * - `indent`: a list item goes into the list item before it (the last child).
 * - `outdent`: the last child of a list item goes after the list item.
 * - `type`: a list item changes its type (bullet, numbered or check).
 * - `swap`: a list item and the list item after it change places.
 * - `insert`: a new list item after a list item.
 * - `remove`: a list item goes, with the blocks in it.
 * - `moveTo`: a list item goes into a different list item (the last child).
 * - `text`: a block gets a new word.
 * - `lift`: a list item goes, and the blocks in it take its place.
 */
export function randomTreeEdit(
  random: Random,
  view: readonly LensBlock[],
  kind: EditKind = random.pick(EDIT_KINDS),
): { blocks: LensBlock[]; edit: TreeEdit } | undefined {
  const blocks: LensBlock[] = structuredClone(view) as LensBlock[];
  const places = placesOf(blocks).filter(
    (place) => tokenOf(place.block) !== undefined,
  );
  const items = places.filter((place) => isListItem(place.block));
  function token(block: LensBlock): string {
    return tokenOf(block)!;
  }
  function remove(place: Place) {
    place.siblings.splice(place.siblings.indexOf(place.block), 1);
  }
  switch (kind) {
    case "indent": {
      const candidates = items.filter((place) => {
        const index = place.siblings.indexOf(place.block);
        return index > 0 && isListItem(place.siblings[index - 1]);
      });
      if (candidates.length === 0) {
        return undefined;
      }
      const place = random.pick(candidates);
      const previous = place.siblings[place.siblings.indexOf(place.block) - 1];
      remove(place);
      previous.children.push(place.block);
      return {
        blocks,
        edit: {
          kind: "move",
          token: token(place.block),
          parent: token(previous),
          after: previousInList(previous.children, place.block),
        },
      };
    }
    case "outdent": {
      // The last child of a list item goes after the list item.
      const candidates = places.filter(
        (place) =>
          isListItem(place.parent) && place.siblings.at(-1) === place.block,
      );
      if (candidates.length === 0) {
        return undefined;
      }
      const place = random.pick(candidates);
      const parent = place.parent!;
      const parentPlace = places.find((p) => p.block === parent)!;
      remove(place);
      parentPlace.siblings.splice(
        parentPlace.siblings.indexOf(parent) + 1,
        0,
        place.block,
      );
      return {
        blocks,
        edit: {
          kind: "moveAfter",
          token: token(place.block),
          sibling: token(parent),
        },
      };
    }
    case "type": {
      if (items.length === 0) {
        return undefined;
      }
      const place = random.pick(items);
      const type = random.pick(
        LIST_TYPES.filter((type) => type !== place.block.type),
      );
      place.block.type = type;
      place.block.props =
        type === "checkListItem"
          ? { ...place.block.props, checked: false }
          : {};
      return {
        blocks,
        edit: { kind: "type", token: token(place.block), type },
      };
    }
    case "swap": {
      const candidates = items.filter((place) => {
        const next = place.siblings[place.siblings.indexOf(place.block) + 1];
        return isListItem(next) && tokenOf(next) !== undefined;
      });
      if (candidates.length === 0) {
        return undefined;
      }
      const place = random.pick(candidates);
      const index = place.siblings.indexOf(place.block);
      const next = place.siblings[index + 1];
      place.siblings.splice(index, 2, next, place.block);
      return {
        blocks,
        edit: { kind: "swap", first: token(place.block), second: token(next) },
      };
    }
    case "insert": {
      if (items.length === 0) {
        return undefined;
      }
      const place = random.pick(items);
      const block: LensBlock = {
        id: "",
        type: place.block.type,
        props: {},
        content: [{ type: "text", text: "new item", styles: {} }],
        children: [],
      };
      place.siblings.splice(place.siblings.indexOf(place.block) + 1, 0, block);
      return { blocks, edit: { kind: "insert", after: token(place.block) } };
    }
    case "remove": {
      if (items.length === 0) {
        return undefined;
      }
      const place = random.pick(items);
      remove(place);
      return {
        blocks,
        edit: { kind: "remove", tokens: tokensIn(place.block) },
      };
    }
    case "moveTo": {
      const place = items.length === 0 ? undefined : random.pick(items);
      const own = place === undefined ? [] : subtree(place.block);
      const targets = items.filter(
        (target) =>
          !own.includes(target.block) && target.block !== place?.parent,
      );
      if (place === undefined || targets.length === 0) {
        return undefined;
      }
      const target = random.pick(targets);
      remove(place);
      target.block.children.push(place.block);
      return {
        blocks,
        edit: {
          kind: "move",
          token: token(place.block),
          parent: token(target.block),
          after: previousInList(target.block.children, place.block),
        },
      };
    }
    case "text": {
      const candidates = places.filter((place) =>
        Array.isArray(place.block.content),
      );
      if (candidates.length === 0) {
        return undefined;
      }
      const place = random.pick(candidates);
      (place.block.content as unknown[]).push({
        type: "text",
        text: " edited",
        styles: {},
      });
      return { blocks, edit: { kind: "text", token: token(place.block) } };
    }
    case "lift": {
      const candidates = items.filter((place) => place.block.children.length);
      if (candidates.length === 0) {
        return undefined;
      }
      const place = random.pick(candidates);
      const index = place.siblings.indexOf(place.block);
      place.siblings.splice(index, 1, ...place.block.children);
      return {
        blocks,
        edit: {
          kind: "lift",
          token: token(place.block),
          children: place.block.children.flatMap((child) => {
            const childToken = tokenOf(child);
            return childToken === undefined
              ? []
              : [
                  {
                    token: childToken,
                    after: previousInList(place.siblings, child),
                  },
                ];
          }),
        },
      };
    }
  }
}

/**
 * The parent of each block of the source document after the edit, by token
 * (`null` for the top level), and the blocks that the edit removed. This is
 * the model of the result: a block that the edit does not move keeps its
 * parent, also if the format does not show that nesting. List items that
 * the text shows as one list share the parent of that list: a moved list
 * item after a list item of the same list gets the parent of that item.
 */
export function expectedParents(
  source: readonly LensBlock[],
  edit: TreeEdit,
): Map<string, string | null> {
  const parents = new Map<string, string | null>();
  function visit(blocks: readonly LensBlock[], parent: string | null) {
    for (const block of blocks) {
      const token = tokenOf(block)!;
      parents.set(token, parent);
      visit(block.children, token);
    }
  }
  visit(source, null);
  switch (edit.kind) {
    case "move":
      parents.set(
        edit.token,
        edit.after === undefined ? edit.parent : parents.get(edit.after)!,
      );
      break;
    case "moveAfter":
      parents.set(edit.token, parents.get(edit.sibling)!);
      break;
    case "remove":
      for (const token of edit.tokens) {
        parents.delete(token);
      }
      break;
    case "lift": {
      const parent = parents.get(edit.token)!;
      for (const child of edit.children) {
        if (parents.get(child.token) === edit.token) {
          parents.set(
            child.token,
            child.after === undefined ? parent : parents.get(child.after)!,
          );
        }
      }
      parents.delete(edit.token);
      break;
    }
    case "swap":
      if (parents.get(edit.first) !== parents.get(edit.second)) {
        // The text does not tell which parent each block gets.
        parents.delete(edit.first);
        parents.delete(edit.second);
      }
      break;
    case "type":
    case "insert":
    case "text":
      break;
  }
  return parents;
}

/** The parent of each block of a document, by token (`null` for the top level). New blocks (without a token of the source) do not count. */
export function actualParents(
  blocks: readonly LensBlock[],
  known: ReadonlyMap<string, unknown>,
): Map<string, string | null> {
  const parents = new Map<string, string | null>();
  function visit(children: readonly LensBlock[], parent: string | null) {
    for (const block of children) {
      const token = tokenOf(block);
      if (token !== undefined && known.has(token)) {
        parents.set(token, parent);
      }
      visit(block.children, token ?? parent);
    }
  }
  visit(blocks, null);
  return parents;
}

/** The nesting of a document by token and type, as a string, for a comparison of two views. */
export function nestingShape(blocks: readonly LensBlock[]): string {
  return blocks
    .map((block) => {
      const own = `${block.type}:${tokenOf(block) ?? "new"}`;
      return block.children.length > 0
        ? `${own}[${nestingShape(block.children)}]`
        : own;
    })
    .join(" ");
}
