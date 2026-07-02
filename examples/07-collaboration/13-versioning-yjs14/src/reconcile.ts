import type { BlockNoteEditor, PartialBlock, Block } from "@blocknote/core";

/**
 * A version of the document is described as a tree of {@link PartialBlock}s,
 * each carrying a *stable* `id`. These ids are what lets us tell apart "this is
 * the same block, its text changed" from "this block was removed and a new one
 * added" — exactly the distinction a naive positional diff gets wrong.
 */
export type VersionBlock = PartialBlock<any, any, any> & {
  id: string;
  children?: VersionBlock[];
};

// ---------------------------------------------------------------------------
// Signature helpers — a "rough diff" key per block.
//
// We hash everything that defines a block *except* its position and its
// children (`type`, `props`, `content`). Two blocks with the same id are
// considered "changed" iff their signatures differ; this is what we use to
// decide whether to emit an `updateBlock` op.
//
// The subtlety: a *live* block (read from `editor.document`) always carries
// its props **fully resolved with schema defaults** (e.g. a paragraph has
// `{ textColor: "default", backgroundColor: "default", textAlignment: "left" }`)
// and every inline text node carries an explicit `styles` object (`{}` when
// unstyled). The *target* blocks (static version JSON) omit default props and
// omit `styles` on unstyled text. A naive hash of the two would therefore
// differ on essentially every block, emitting a spurious `updateBlock` for
// blocks that did not actually change. To compare apples to apples we
// normalize BOTH sides to the same fully-resolved canonical form before
// hashing: props are filled from the editor's block schema, and inline
// content is canonicalized (every text node gets a `styles` object, links get
// normalized content).
// ---------------------------------------------------------------------------

/** Fill a block's props with schema defaults so both sides hash identically. */
function resolveProps(
  editor: BlockNoteEditor<any, any, any>,
  type: string | undefined,
  props: Record<string, any> | undefined,
): Record<string, any> {
  const spec = type ? (editor.schema.blockSpecs as any)[type] : undefined;
  const propSchema = spec?.config?.propSchema as
    | Record<string, { default?: unknown }>
    | undefined;

  // Unknown type or string-keyed prop schema: fall back to the given props.
  if (!propSchema || typeof propSchema !== "object") {
    return { ...(props ?? {}) };
  }

  const resolved: Record<string, any> = {};
  for (const key of Object.keys(propSchema)) {
    const given = props?.[key];
    resolved[key] = given !== undefined ? given : propSchema[key]?.default;
  }
  // Preserve any extra props not described by the schema (defensive).
  for (const key of Object.keys(props ?? {})) {
    if (!(key in resolved)) {
      resolved[key] = props![key];
    }
  }
  return resolved;
}

/** Canonicalize a single inline content node (text / link / custom). */
function canonInline(node: any): any {
  if (node == null || typeof node !== "object") {
    return node;
  }
  if (node.type === "text") {
    return {
      type: "text",
      text: node.text ?? "",
      styles: node.styles ?? {},
    };
  }
  if (node.type === "link") {
    return {
      type: "link",
      href: node.href,
      content: canonContent(node.content),
    };
  }
  return node;
}

/**
 * Canonicalize a block's `content` (array, plain string, or undefined).
 *
 * Crucially, an *absent* `content` (target JSON omits it for empty blocks) and
 * an *empty* inline array (a live empty paragraph carries `content: []`) are
 * the same thing — "no inline content" — and must canonicalize identically, or
 * every empty paragraph would diff as changed and emit a spurious update.
 */
function canonContent(content: any): any {
  if (content === undefined || content === null) {
    return undefined;
  }
  if (typeof content === "string") {
    // A plain-string shorthand is equivalent to a single unstyled text node;
    // the empty string means "no content".
    return content === ""
      ? undefined
      : [{ type: "text", text: content, styles: {} }];
  }
  if (Array.isArray(content)) {
    // Empty inline array == no content.
    return content.length === 0 ? undefined : content.map(canonInline);
  }
  // Table content and other structured content: hash as-is.
  return content;
}

function signature(
  editor: BlockNoteEditor<any, any, any>,
  block: {
    type?: string;
    props?: Record<string, any>;
    content?: any;
  },
): string {
  return JSON.stringify({
    type: block.type,
    props: resolveProps(editor, block.type, block.props),
    content: canonContent(block.content),
  });
}

function walk(
  blocks: { id: string; children?: any[] }[],
  visit: (block: any, parentId: string | undefined) => void,
  parentId?: string,
): void {
  for (const block of blocks) {
    visit(block, parentId);
    if (block.children?.length) {
      walk(block.children, visit, block.id);
    }
  }
}

function collectIds(blocks: { id: string; children?: any[] }[]): Set<string> {
  const ids = new Set<string>();
  walk(blocks, (b) => ids.add(b.id));
  return ids;
}

/**
 * Strip a {@link VersionBlock} down to the partial block we hand to
 * `insertBlocks`. Crucially we keep the explicit `id` (so the inserted block
 * keeps its identity across versions) and the nested `children`.
 *
 * `liveIds`, when provided, marks blocks that *already exist* in the document.
 * Such descendants are **omitted** from the inserted subtree: they were not
 * created here, they were *reparented* into this new block, so they must be
 * carried over by an explicit move (done by the recursion in `reconcileList`)
 * rather than duplicated as a fresh copy. Without this, a new parent that
 * adopts existing children would clone them, leaving two blocks with one id.
 */
function toPartial(
  block: VersionBlock,
  liveIds?: Set<string>,
): PartialBlock<any, any, any> {
  const partial: any = { id: block.id, type: block.type };
  if (block.props) {
    partial.props = block.props;
  }
  if (block.content !== undefined) {
    partial.content = block.content;
  }
  const children = block.children as VersionBlock[] | undefined;
  if (children?.length) {
    const freshChildren = liveIds
      ? children.filter((c) => !liveIds.has(c.id))
      : children;
    if (freshChildren.length) {
      partial.children = freshChildren.map((c) => toPartial(c, liveIds));
    }
  }
  return partial;
}

/**
 * Reconcile the editor's current document so it exactly matches `target`,
 * emitting the *minimal* set of BlockNote ops to get there:
 *
 *   - `removeBlocks` for ids that disappeared,
 *   - `updateBlock`  for ids whose type/props/content changed,
 *   - `insertBlocks` for brand-new ids (whole subtrees at once),
 *   - a move (remove + re-insert, preserving id) for blocks whose parent or
 *     sibling order changed.
 *
 * Because ids are stable, an edit that *looks* like "delete + re-add" in a
 * positional diff is correctly recognised here as an in-place update or a move,
 * which is the semantic operation a human actually performed.
 */
export function applyVersion(
  editor: BlockNoteEditor<any, any, any>,
  target: VersionBlock[],
): void {
  editor.transact(() => {
    const targetIds = collectIds(target);

    // --- Fast path: building from scratch. If none of the live blocks survive
    // into the target (e.g. the very first version applied to a fresh editor,
    // whose only block is the default empty paragraph), replacing the whole
    // document in one op avoids transiently emptying it — which would leave a
    // transient id-less placeholder block that the incremental insert path
    // cannot anchor against.
    const liveIds = collectIds(editor.document);
    const anySurvive = [...liveIds].some((id) => targetIds.has(id));
    if (!anySurvive) {
      editor.replaceBlocks(
        editor.document,
        target.map((b) => toPartial(b)),
      );
      return;
    }

    // --- 1. Removals. Only remove "roots" of removed subtrees: if a block is
    // gone, all of its descendants go with it, so removing the topmost gone
    // ancestor is enough (and removing a child after its parent would throw).
    const toRemove: string[] = [];
    walk(editor.document, (block, parentId) => {
      if (targetIds.has(block.id)) {
        return;
      }
      // Skip if an ancestor is already being removed.
      if (parentId && toRemove.includes(parentId)) {
        return;
      }
      toRemove.push(block.id);
    });
    if (toRemove.length > 0) {
      editor.removeBlocks(toRemove);
    }

    // --- 2 & 3. Walk the target tree in document order and reconcile each
    // block: insert if new, update if changed, move if mis-placed. Recursing in
    // order means earlier siblings are already in place to anchor against.
    reconcileList(editor, target, undefined);
  });
}

/** Look up a block in the live document by id (depth-first). */
function getLiveBlock(
  editor: BlockNoteEditor<any, any, any>,
  id: string,
): Block<any, any, any> | undefined {
  let found: Block<any, any, any> | undefined;
  walk(editor.document, (b) => {
    if (!found && b.id === id) {
      found = b as Block<any, any, any>;
    }
  });
  return found;
}

function reconcileList(
  editor: BlockNoteEditor<any, any, any>,
  targetSiblings: VersionBlock[],
  parent: VersionBlock | undefined,
): void {
  let prevId: string | undefined;

  for (const targetBlock of targetSiblings) {
    const live = getLiveBlock(editor, targetBlock.id);

    if (!live) {
      // --- Brand-new block. Insert it together with its *new* descendants,
      // but omit any descendants that already exist elsewhere in the document
      // (they were reparented in): those are placed by the recursion below,
      // which moves them rather than cloning them.
      const liveIds = collectIds(editor.document);
      insertAt(editor, toPartial(targetBlock, liveIds), parent, prevId);
      // Recurse so reparented (already-live) children get moved into place and
      // any further new descendants are positioned correctly.
      reconcileList(editor, targetBlock.children ?? [], targetBlock);
    } else {
      // --- Existing block. Does its own signature differ? (children handled
      // by recursion, so compare without them.)
      if (signature(editor, live) !== signature(editor, targetBlock)) {
        const update: PartialBlock<any, any, any> = { type: targetBlock.type };
        if (targetBlock.props) {
          update.props = targetBlock.props as any;
        }
        if (targetBlock.content !== undefined) {
          update.content = targetBlock.content as any;
        } else if (
          Array.isArray((live as any).content) &&
          (live as any).content.length > 0
        ) {
          // Target has no inline content but the live block still does: the
          // block was *emptied* (its text cleared). An update that simply omits
          // `content` would leave the stale text in place, so clear it
          // explicitly. (Content-less block types like `divider`/`image` never
          // hit this branch because their live `content` isn't an array.)
          update.content = [] as any;
        }
        editor.updateBlock(targetBlock.id, update);
      }

      // --- Is it in the right place (correct parent + after prevId)?
      if (!isPlacedAfter(editor, targetBlock.id, parent, prevId)) {
        moveAfter(editor, targetBlock.id, parent, prevId);
      }

      // --- Recurse into children.
      reconcileList(editor, targetBlock.children ?? [], targetBlock);
    }

    prevId = targetBlock.id;
  }
}

/** True if `id`'s previous sibling is `prevId` and its parent is `parent`. */
function isPlacedAfter(
  editor: BlockNoteEditor<any, any, any>,
  id: string,
  parent: VersionBlock | undefined,
  prevId: string | undefined,
): boolean {
  const liveParent = parentOf(editor, id);
  if ((liveParent?.id ?? undefined) !== (parent?.id ?? undefined)) {
    return false;
  }
  const siblings = liveParent
    ? (getLiveBlock(editor, liveParent.id)?.children ?? [])
    : editor.document;
  const idx = siblings.findIndex((b) => b.id === id);
  const actualPrev = idx > 0 ? siblings[idx - 1].id : undefined;
  return actualPrev === prevId;
}

/** Find the live parent block of `id` (undefined => top level). */
function parentOf(
  editor: BlockNoteEditor<any, any, any>,
  id: string,
): Block<any, any, any> | undefined {
  let parent: Block<any, any, any> | undefined;
  walk(editor.document, (block) => {
    if (block.children?.some((c: any) => c.id === id)) {
      parent = block as Block<any, any, any>;
    }
  });
  return parent;
}

/**
 * Insert `partial` so it lands after `prevId` inside `parent` (or as the first
 * child of `parent`, or at the very top of the document).
 */
function insertAt(
  editor: BlockNoteEditor<any, any, any>,
  partial: PartialBlock<any, any, any>,
  parent: VersionBlock | undefined,
  prevId: string | undefined,
): void {
  if (prevId) {
    editor.insertBlocks([partial], prevId, "after");
    return;
  }
  // First in its sibling list.
  if (parent) {
    const liveParent = getLiveBlock(editor, parent.id);
    const firstChild = liveParent?.children?.[0];
    if (firstChild) {
      editor.insertBlocks([partial], firstChild.id, "before");
    } else {
      // Parent has no children yet: attach as its only child via updateBlock.
      editor.updateBlock(parent.id, { children: [partial] } as any);
    }
    return;
  }
  // Top of the document.
  const firstTop = editor.document[0];
  if (firstTop?.id) {
    editor.insertBlocks([partial], firstTop.id, "before");
  } else {
    // Empty document (or a transient id-less placeholder block): replace it
    // wholesale rather than trying to anchor against a block with no id.
    editor.replaceBlocks(editor.document, [partial]);
  }
}

/**
 * Move an existing block (by id) so it sits after `prevId` within `parent`.
 * Implemented as remove + re-insert, carrying the block's *current* content and
 * children so nothing is lost — only its position changes.
 */
function moveAfter(
  editor: BlockNoteEditor<any, any, any>,
  id: string,
  parent: VersionBlock | undefined,
  prevId: string | undefined,
): void {
  const live = getLiveBlock(editor, id);
  if (!live) {
    return;
  }
  const partial = blockToPartial(live);
  editor.removeBlocks([id]);
  insertAt(editor, partial, parent, prevId);
}

/** Turn a live {@link Block} back into a {@link PartialBlock}, keeping its id. */
function blockToPartial(
  block: Block<any, any, any>,
): PartialBlock<any, any, any> {
  const partial: any = {
    id: block.id,
    type: block.type,
    props: block.props,
  };
  if (block.content !== undefined) {
    partial.content = block.content;
  }
  if (block.children?.length) {
    partial.children = block.children.map(blockToPartial);
  }
  return partial;
}
