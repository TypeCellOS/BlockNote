# Suggestion content-spec blast radius

This document tracks the conceptual fallout of the `blockContainer` content-spec
change and complements the inline `// ...` annotations scattered across the
codebase. Search the source for the root-cause counter comments
(`(Affects ~N callsites)`) to find the systemic entry points.

## The change

`packages/core/src/pm-nodes/BlockContainer.ts:27`

```
- content: "blockContent blockGroup?"
+ content: "suggestionBlockContent* blockContent suggestionBlockContent* blockGroup?"
```

A `blockContainer` can now hold 0-N `suggestionBlockContent` nodes both **before**
and **after** its `blockContent`. These extra nodes hold the *old* content of a
block that has a pending "modify" suggestion.

## Two distinct suggestion mechanisms

1. **Block-level marks** — `y-attributed-insert` / `y-attributed-format` /
   `y-attributed-delete` (`SuggestionMarks.ts`), allowed on `blockContainer`,
   `blockGroup`, `column`, table nodes, etc. These mark a *real* block/structure
   as inserted, deleted, or modified.
2. **Shadow nodes** — `${type}--attributed` nodes (e.g. `paragraph--attributed`),
   created in `schema/blocks/createSpec.ts`. Group is the COMPOUND string
   `"suggestionBlockContent blockContent"`. They sit inside a `blockContainer`
   alongside `blockContent` and hold the old content of a modified block.

## Footguns

- **Compound group string.** `node.type.spec.group === "blockContent"` and
  `=== "suggestionBlockContent"` are BOTH `false` for a shadow node, because the
  spec string is `"suggestionBlockContent blockContent"`. Always use
  `node.type.isInGroup("blockContent")` / `isInGroup("suggestionBlockContent")`.
  Several pre-existing guards (`splitBlock.ts:50`, `internal.ts:104`,
  `nodeToBlock.ts:608`) are effectively dead because of strict-equality or a
  `"suggestion-"` name prefix that the real `*--attributed` nodes never match.
- **Naming.** Real nodes are `*--attributed`, NOT `suggestion-*`.
  `SpecialNode.test.ts` asserts the non-existent `suggestion-*` names.
- **`firstChild` is no longer `blockContent`.** Any code reading
  `blockContainer.firstChild`, `nodeAt(pos + 1)`, or `childCount === 1` on a
  container now risks landing on / miscounting a leading shadow node.
- **Editable shadow content.** Shadow nodes are `selectable: false` but render
  with an editable `contentDOM` and have NO node view, so
  `applyNonSelectableBlockFix` never runs. A caret/text-selection can land
  inside a shadow node, which makes those positions genuinely reachable.

## What is safe vs. exposed

- **Safe:** positions derived from `getBlockInfo*` (`bnBlock`, `blockContent`,
  `childContainer` carry suggestion-aware offsets); walks filtered by the
  `bnBlock` group (shadow nodes are not `bnBlock`); operations at the
  blockGroup / column / columnList sibling level (their children are
  containers, never shadow nodes); DOM and Block-JSON code paths;
  freshly-parsed, suggestion-free fragments.
- **Exposed:** raw caret/click positions that read `$pos.parent` or step across
  a node boundary (`$pos.after()`, `pos ± 1`, `nodeBefore`/`nodeAfter`) without
  re-deriving from `getBlockInfo`.

## Conceptual questions to resolve

### What is inside `editor.document`?

`editor.document` is produced by `nodeToBlock` (`(Affects ~23 callsites)`), which
builds `Block = {id, type, props, content, children}` only. It **strips all
suggestion state**: shadow nodes are dropped and `y-attributed-*` marks are
ignored. Consequences:

- `block.content` is always the *new* content; the old (shadow) content is
  invisible to the entire Block API.
- The public `Block` type has no field describing suggestion state. There is no
  supported way to ask "is this block inserted/deleted/modified?".
- Every consumer of `editor.document` / `getSelection().blocks` / `getBlock` is
  suggestion-blind, including all public export APIs (`ExportManager`).

### What does a "deleted" block mean?

A suggested-deleted block still:

- has its `data-id`,
- is in the `bnBlock` group,
- resolves through `getNodeById` / `getBlock` / `forEachBlock` as a normal,
  live block, with **no deletion flag**.

So menus and commands happily read and mutate content the user believes is
deleted. This is the most acute hazard: the API cannot distinguish a live block
from one pending deletion.

### How do menu items interact with this?

Every side-menu / formatting-toolbar / table-handle action resolves a
suggestion-blind `Block` and mutates it through `updateBlock` / `removeBlocks` /
`insertBlocks`, none of which are suggestion-aware. So:

- Type conversion, color, alignment, file ops on a suggested block are
  **untracked** edits that corrupt the diff.
- The "+" button inserts an untracked block next to tracked content.
- Drag-and-drop moves a suggested block and `deleteSelection`s the origin,
  again untracked.
- `BlockTypeSelect` etc. display the *new* content's type, never reflecting that
  the block is a tracked change.

When suggestions are enabled, these need to be either disabled or routed through
accept/reject semantics.

### How would the unique-id extension rewrite ids?

`UniqueID.ts` assigns / dedupes `data-id`. Shadow nodes do not carry their own
`data-id` (it lives on the outer `blockContainer`), so they should not be
assigned ids. But dedupe logic (`UniqueID.ts:208`) can regenerate an id when a
suggestion transiently produces a duplicate, potentially detaching a block from
its tracked history. Verify dedupe ignores shadow-bearing transitions.

### Multi-column

- `column` content is `"blockContainer+"` and `column` carries `y-attributed-*`
  marks, so a whole column can be a tracked insert/delete.
- `multiColumnDropCursor.ts` / `ColumnResizeExtension.ts` operate at the
  column / columnList level (safe for shadow ordering) but resolve blocks via
  `getNodeById` (suggestion-blind).
- `multiColumnHandleDropPlugin.ts` reconstructs an entire `columnList` from
  `nodeToBlock` output, so any suggestion state inside the moved columns is
  dropped on drop. This is the highest-risk multi-column path.

### Round-trips and serialization

- `blockToNode` (`(Affects ~7 callsites)`) emits only `[contentNode, groupNode]`,
  so any Block-JSON round-trip drops suggestions.
- Clipboard copy uses ProseMirror's native serializer on the raw slice, which
  *does* emit shadow nodes — so copy/paste can duplicate or inject shadow
  content, and the `text/html` / markdown clipboard branches (Block-JSON based)
  disagree with the `blocknote/html` branch about whether suggestions exist.

### Schema-validity hazards

- `updateBlock` inserts a `blockGroup` at `blockContent.afterPos`, which is
  *before* a trailing shadow node — violating the `... blockGroup?` ordering.
- `mergeBlocks` is partly suggestion-aware but drops `prev.suggestionBefore` and
  `next.suggestionAfter`, and reconstructs with `type.create` (no validation).
- `BlockInfo.suggestionBefore` / `suggestionAfter` are singular while the schema
  allows `*`; containers with ≥2 shadows on a side are not fully represented.

## Where to look

- Systemic counters: `nodeToBlock.ts`, `blockToNode.ts`, `getBlockInfoFromPos.ts`
  (the `(Affects ~N callsites)` comments).
- Everything else: grep for the single-line `// ... suggestion ...` annotations.
