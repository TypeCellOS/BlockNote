# Attribution support in BlockNote — design & changes

This document explains how **attributed content** (suggestion mode + version
diffs) was implemented in BlockNote on top of the Yjs v14 rewrite
(`@y/y` 14, `@y/prosemirror` 2, `lib0` 1), what was changed and why, the two
non-obvious bugs that had to be fixed (one in BlockNote, one mitigated via
usage), and how to reproduce the implementation. It is written for review.

---

## 1. What "attribution" is here

The `@y/prosemirror` binding can render *who changed what* on top of a live
ProseMirror document. The same mechanism powers two product features:

- **Suggestion mode** — a user's edits are recorded in the Y document but shown
  as tracked suggestions (inserted / deleted / reformatted) until someone
  accepts or rejects them.
- **Version diffs** — given two snapshots, the difference is rendered inline.

The binding surfaces attribution as three **ProseMirror marks** whose names are
part of its public contract and may not be renamed:

| kind | mark | attrs (must match the binding's mapper) |
|---|---|---|
| insert | `y-attributed-insert` | `{ userIds, timestamp }` |
| delete | `y-attributed-delete` | `{ userIds, timestamp }` |
| format | `y-attributed-format` | `{ userIds, userIdsByAttr, timestamp }` |

For **block-level** attribution (a whole inserted/deleted block, or a block
whose type was changed), the binding can additionally render the block under a
`{name}--attributed` **variant node type** (via the `attributedNodes`
predicate). The Y document always stores the canonical name; the variant exists
only in the rendered PM document.

### The attribution-manager model (Yjs v14)

`createAttributionManagerFromDiff(baseDoc, suggestionDoc)` returns a
`DiffAttributionManager` that:

- **auto-forwards** `baseDoc → suggestionDoc` (committed content flows into the
  suggestion doc as un-attributed),
- computes `insert`/`delete` attribution from the diff between the two docs,
- forwards `suggestionDoc → baseDoc` **only** when `suggestionMode = false`
  (i.e. "view suggestions" / accept commits to base).

So the canonical setup is: create the AM(s) while the docs are empty → seed the
base once → it forwards to every peer as committed content → suggestion-doc edits
become attributed.

---

## 2. The schema (what changed and why)

### 2.1 Marks — A2 (parallel), not A1 (rename)

The original plan was to *rename* BlockNote's existing `insertion` / `deletion`
/ `modification` suggestion marks to the canonical names. That is **not viable**:
those names are pinned by **`@handlewithcare/prosemirror-suggest-changes`**,
which `@blocknote/xl-ai` depends on for its AI-suggestion engine
(`AIExtension.ts`, `rebaseTool.ts`, `suggestChangesTestUtil.ts`). Renaming them
throws `Failed to find insertion mark in schema`.

So we keep both families side by side (**A2**):

- `insertion` / `deletion` / `modification` stay in
  `packages/core/src/extensions/tiptap-extensions/Suggestions/SuggestionMarks.ts`
  (unchanged, for `@handlewithcare` / xl-ai).
- The three canonical attribution marks live in a new file
  `.../Suggestions/AttributionMarks.ts`.

Two subtle rules, verified against the binding's own reference schema
(`y-prosemirror/tests/complexSchema.js`):

1. **Default `excludes` (self-exclusion), NOT `excludes: ''`.** Self-exclusion
   makes re-applying a kind on a span *replace* the prior instance when its
   `userIds` change between renders, instead of stacking duplicates that churn
   the reconcile loop. The three are different mark *types*, so they already
   compose with each other. (The older `ATTRIBUTION.md` advice to use
   `excludes: ''` is superseded by this.)
2. **`attrs` must match exactly what `defaultMapAttributionToMark` emits**, or
   the PM↔Y reconcile diff is never empty and the sync plugin loops.

All six marks are listed **by name** on every container's `marks:` content
expression (`Doc`, `BlockContainer`, `BlockGroup`, `Table`×2, `Column`,
`ColumnList`) — by name, to avoid the `gatherMarks` group-shadowing trap that
`CAVEATS.md` warns about. Atom/leaf blocks (image, file, video, divider, …)
disallow marks by default, so `createSpec.ts` explicitly allows the attribution
marks on `content: "none"` blocks (otherwise a node-level deletion mark throws).

The marks render to `<ins data-attributed="insert">` / `<del data-attributed="delete">`
/ `<span|div data-type="y-attributed-format">` and use `display: contents` for
the block-level (node-mark) case.

### 2.2 Variant nodes + the relaxed `blockContainer` content expression

For inline-content blocks, `extensions.ts` generates a render-only variant node
via `node.extend(...)`:

- name `${name}--attributed`,
- `group: "blockContent attributed"` (also in a new `attributed` group),
- a binding-only `y-attributed` attribute,
- `parseHTML: []` so it can never be created from the clipboard.

`packages/core/src/pm-nodes/BlockContainer.ts` content changed from
`"blockContent blockGroup?"` to:

```
attributed* (blockContent | attributed) attributed* blockGroup?
```

**Why a `blockContainer` can't just be `blockContent+`** (the splitting
question): a node's *name is its identity* in Yjs — you can't mutate a node's
type in place, so a suggested `paragraph → heading` is a *delete-old +
insert-new*, which means the container must transiently hold *both* the deleted
paragraph and the inserted heading. The `attributed*` flanks admit exactly the
binding-produced variants while still forbidding two *canonical* blocks, so
ordinary user editing keeps the one-block-per-container invariant the whole
block API relies on.

`packages/core/src/schema/blocks/attributedNodes.ts` holds the shared constants
+ helpers (`ATTRIBUTED_NODE_SUFFIX`, `ATTRIBUTED_GROUP`, `canonicalBlockName`,
`isDeletedNode`, `getBlockNode`).

### 2.3 The `getBlockNode` abstraction (relaxing "firstChild is the block")

With attribution a `blockContainer` can hold several `blockContent` children, so
`blockContainer.firstChild` is no longer "the block." `getBlockNode(container)`
hides this: it returns the **first non-deleted** blockContent (the live block),
falling back to the first if the whole block is a pending deletion. The central
reader `getBlockInfoFromPos` now (a) uses `isInGroup("blockContent")` so variant
nodes are recognized, (b) prefers the non-deleted child, and (c) reports
`canonicalBlockName(...)` so the block API always sees the canonical type even
while a variant is rendered.

---

## 3. The bugs that blocked attribution

### 3.1 Two `blockGroup`s on independent init (CRDT-schema tension)

BlockNote's `doc` requires *exactly one* `blockGroup`. When a peer binds to an
*empty* Y.Doc, the binding `createAndFill`s a default `blockGroup` and writes it
to Y. If two peers do this **independently** and then merge, the CRDT keeps both
blockGroups → invalid (this is `CAVEATS.md`'s "schema mismatch under
concurrency").

**Fix: shared init, not a binding hack.** Real collaboration initializes a
document once; other peers receive that state before binding. The
`positionMapping` "remote editor" tests were reordered to sync the local peer's
state to the remote *before* the remote editor mounts. A reproduction +
regression pair lives in `y-prosemirror/tests/blocknote-nesting.test.js`
(`testIndependentInitIsKnownLimitation` pins the boundary;
`testSharedInitConverges` proves the realistic pattern converges).

### 3.2 The `createAndFill` cache dropped all binding-rendered content (BlockNote bug)

`BlockNoteEditor` monkey-patches `schema.nodes.doc.createAndFill` to give the
initial block a deterministic id. The original patch **cached the first result
and returned it for every call, ignoring arguments** — so when the binding's
`deltaToPNode` called `doc.createAndFill(attrs, [blockGroup with real content])`
to render attributed/collaborative content, it got back the cached *empty* doc.
The content was silently dropped, which then read back as a *deletion* (the base
text appeared struck-through in suggestion mode).

**Fix (`BlockNoteEditor.ts`):** only apply the deterministic-empty-doc cache
when `createAndFill` is asked to materialize a *blank* doc (no content); pass
through when real content is provided. This is the single change that made
attribution render correctly end to end. (Verified safe: 241 conversion/block-API
tests still pass; the one snapshot that legitimately changed is the v14
`fragment.toJSON()` format.)

### 3.3 Multi-variant containers broke the block NodeView (BlockNote bug)

When a block type is *suggested to change* (e.g. heading → paragraph), the
binding renders the container with **two** `blockContent` variants at once: a
deleted `heading--attributed` next to an inserted `paragraph--attributed`. Each
variant inherits the canonical block's `addNodeView`, which calls
`getBlockFromPos(getPos, editor, …, blockConfig.type)`. That helper resolved the
container's **primary** (non-deleted) block via `editor.getBlock(id)` and threw
`"Block type does not match"` whenever the NodeView's variant differed from it —
exactly the deleted-variant case. In the browser a NodeView that throws on every
render drives an unbounded re-render loop (one of the "freezes").

**Fix (`schema/blocks/internal.ts`):** when the resolved block's type doesn't
match the NodeView's `blockConfig.type`, look at the node actually at `pos`. If
it is the matching variant, build the block from *that* node — a synthetic
single-content container fed to `nodeToBlock`, which canonicalizes the variant
name — instead of the container's primary block. Both the deleted and the
inserted variant now render their own content side by side.

### 3.4 BlockNote injected random ids into y-prosemirror's reconcile (non-convergence)

The sync binding is a fixpoint loop: it renders `desiredPM` from Yjs, compares
it to the live PM document, and dispatches a reconcile on any difference.
BlockNote's `UniqueID` extension assigns a **random `v4()`** id to every id-less
`blockContainer`/`column`/`columnList` in an `appendTransaction` that fired on
*every* transaction — including the binding's own reconcile transactions. So a
reconcile that rendered an id-less container got a fresh random id, which made
the PM document differ from Yjs again, which reconciled again with *another*
random id… it never converged. This is the "random values" / infinite-loop the
feedback called out: *"y-prosemirror should take over control of attribution and
BlockNote should not add random values (like random ids)."*

**Fix (`extensions.ts`):** configure `UniqueID.filterTransaction` to skip
y-prosemirror's reconcile transactions (`y-sync-transaction` / `y-sync-append`
meta — the same "sync origin" set y-prosemirror's own `undo-plugin.js` uses).
Block ids are still assigned by *user* transactions and persisted to Yjs; the
binding owns whatever it reconciles out of Yjs. (The one-time `y-sync-hydration`
load is intentionally *not* skipped, so initially-loaded id-less content can
still be assigned ids once.) Net effect: y-prosemirror takes over control of
attributed content and BlockNote stops adding non-deterministic values to it.

### 3.5 Markdown input rules threw "mismatched transaction" → freeze

Turning a paragraph into a heading by typing the `# ` markdown shortcut froze
the editor in suggestion mode. BlockNote runs its block input rules through
`@handlewithcare/prosemirror-inputrules`, whose `run()` dispatches the inserted
text and the rule's transaction as **two separate** `view.dispatch` calls. The
y-prosemirror sync plugin reconciles **synchronously** from its plugin-view
`update()` (it runs inside `view.dispatch`), and in suggestion mode that
reconcile *rewrites* the just-inserted text (wrapping it in
`y-attributed-insert`), advancing the document. So the rule transaction - built
against the pre-reconcile state - was applied to a mismatched document and
ProseMirror threw `"Applying a mismatched transaction"`. Thrown mid-input, that
desynchronizes ProseMirror's DOM observer, which then spins trying to reconcile
the DOM against the editor state → the browser freeze. (Plain, non-attributed
collaboration is unaffected: the reconcile diff there is empty, so no extra
steps are inserted between the two dispatches.)

**Fix (`ExtensionManager/index.ts`):** when an attribution manager is active,
the block input-rule handler reports *no match* (so `@handlewithcare` never
dispatches the stale transaction) and instead re-applies the block-type change
on the next microtask, against the live, reconciled document, via the editor
API (`getBlockInfoFromSelection` → strip the markdown trigger → `updateBlockTr`).
The microtask runs before paint, so there is no visible flash. The synchronous
path is kept unchanged for non-collaborative editors. Regression test:
`attributionEditor.test.ts` types `# ` through the real input pipeline and
asserts it converts, converges, and never throws.

---

## 4. Rendering, read-only deletions, and paste filtering

- **CSS** (`packages/core/src/editor/attribution.css`, imported by
  `src/style.css`): insert = green + underline, delete = red + line-through,
  format = amber; attributed variant blocks get an accent bar. Themed with
  `--bn-colors-attribution-*` and a dark-mode override.
- **Deleted content is not editable**
  (`.../Collaboration/DeletedContentReadonly.ts`): a PM plugin adds
  `contenteditable=false` decorations on `y-attributed-delete` ranges and uses
  `filterTransaction` to reject *user* edits inside deleted ranges — while
  exempting sync transactions (`y-sync-transaction` meta / `ySyncPluginKey`
  origin / `addToHistory:false`) so the binding can still reconcile. Registered
  in `CollaborationExtension`.
- **Paste filter** (`packages/core/src/editor/transformPasted.ts`): a
  `transformPasted` step drops `y-attributed-delete` content, rewrites
  `*--attributed` blocks to their canonical type, and strips the three
  `y-attributed-*` marks — so copying suggestion content and pasting yields
  clean text.

---

## 5. Attribution-aware public API

`@blocknote/core` now re-exports:

- `acceptAllChanges`, `rejectAllChanges`, `acceptChanges`, `rejectChanges`
  (operate on the editor's PM view + its `DiffAttributionManager`),
- `getBlockNode`, `canonicalBlockName`, `isDeletedNode`, `isAttributedNodeName`,
  `ATTRIBUTED_NODE_SUFFIX`, `ATTRIBUTED_GROUP`.

This keeps consumers (and the demo) off `@y/prosemirror` internals.

---

## 6. Demo

`examples/01-basic/01-minimal/src/App.tsx` is a working four-pane demo: two
clients on a shared document, a "Review (view suggestions)" pane with
**Accept all / Reject all** buttons, and a "Suggestion Mode" pane whose edits
become tracked suggestions. It uses the shared-init + AM-first pattern from §1
and imports `@blocknote/core/style.css` for the attribution styling.

---

## 7. Tests

- `packages/core/src/extensions/Collaboration/attribution.test.ts` — integration
  scenarios on BlockNote's real schema, driven through **raw** ProseMirror views:
  suggestion-mode **insert** → `y-attributed-insert` (base stays clean),
  **delete** → `y-attributed-delete` (text retained), **accept** merges,
  **reject** discards, a **block-type flip** rendering both
  `paragraph--attributed` + `heading--attributed`, and an 80-op fuzz.
- `packages/core/src/extensions/Collaboration/attributionEditor.test.ts` —
  **production-readiness** suite on real `BlockNoteEditor` instances (so it
  exercises `UniqueID` and the variant NodeViews, where §3.3/§3.4 surfaced). It
  asserts every edit **converges in a bounded number of transactions** (a >300
  guard turns a runaway loop into a fast failure instead of a frozen runner):
  heading↔paragraph flips both directions, suggested insert/delete, sequential
  edits, cross-peer convergence (suggestion-mode peer === view-suggestions peer),
  and a 40-op fuzz where *each* random edit must converge and every document
  stays structurally valid.
- `packages/core/src/editor/transformPasted.test.ts` — paste filter.
- `y-prosemirror/tests/blocknote-nesting.test.js` — the independent-init / shared-init
  reproduction pair (added to the modified project, per the brief).

---

## 8. How to reproduce the implementation

1. **Link the v14 libs** (until they are published): build `dist` for
   `~/ylabs/{lib0,yjs,y-prosemirror}`, `npm pack` them into `BlockNote/vendor/*.tgz`,
   and set pnpm `overrides` → `file:./vendor/*.tgz` (in both `pnpm-workspace.yaml`
   and `package.json`). Run pnpm via `npx pnpm@10.23.0`.
2. **Marks**: add `AttributionMarks.ts` (canonical three) next to the existing
   `SuggestionMarks.ts`; register all six; list all six by name on the container
   `marks:` expressions; allow them on `content:"none"` blocks in `createSpec.ts`.
3. **Variants**: generate `*--attributed` siblings for inline blocks in
   `extensions.ts`; add the `attributed` group; relax `blockContainer` content to
   `attributed* (blockContent|attributed) attributed* blockGroup?`.
4. **Binding**: `YSync` uses `syncPlugin({ attributedNodes })` (opt in for all
   kinds) + the default mapper; the fragment is bound via `configureYProsemirror`.
5. **Fix `createAndFill`** to pass through non-blank fills (§3.2).
6. **Abstraction**: `getBlockNode` + canonicalization in `getBlockInfoFromPos`.
7. **Rendering / read-only / paste / API / demo** as in §4–§6.

---

## 9. Known limitations / future work

- **Independent init** of a single-required-child top node is still invalid by
  construction (§3.1); production should always share one initialized document.
- **Container cardinalities** `blockGroup: "blockGroupChild+"`,
  `ColumnList: "column column+"`, `Column: "blockContainer+"`,
  `table: "tableRow+"` remain `+`/bounded — concurrency-unsafe per `CAVEATS.md`
  and not yet suggestion-aware for row/cell/column insert-delete. Variants for
  those structures are future work.
- The remaining `type.name` readers (`nodeToBlock`, `fragmentToBlocks`,
  `replaceBlocks`, `fixColumnList`, `transformPasted` traversal, …) only need
  canonicalization while variants are *live* in the doc; `getBlockNode` /
  `canonicalBlockName` are the tools to fold them in.
- Unifying xl-ai's `@handlewithcare` suggestions onto the binding's attribution
  manager (so there is one mark family) is a separate migration.
- The rich `modification` attribute-diff (old→new value) is a good
  **decoration** candidate — it is display-only metadata that doesn't fit
  `y-attributed-format`'s fixed attrs.
