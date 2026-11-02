# Text lens: write markdown, HTML or plain text back to a document

With this API, a client can read a document as text (markdown, HTML or plain text), change the text, and write it back. A write does not replace the document. It applies only the changes, and keeps the data that the text format does not show: block IDs, colors, alignment, underline, toggles, empty paragraphs, nesting that markdown removes, and comments on text that did not change.

In lens terms, the document is the source and the text is the view. The `serialize` function of the format is `get`. This folder supplies `put`.

## API

- `getDocumentText(editor, format)`: returns the document as text.
- `computeTextUpdate(editor, { format, text, base })`: returns the operations that change the document to agree with the text. The operations use block IDs. The result also contains warnings (a discriminated union).
  - `base` is optional. It is the document (Block JSON) at the version that the client read. Get it from your version history. Without `base`, the text applies to the current document.
- `updateDocumentFromText(editor, { format, text, base })`: computes the operations and applies them in one transaction.
- `computeJSONUpdate(editor, { document, base })` and `updateDocumentFromJSON(editor, { document, base })`: the same for a full document as BlockNote JSON. The JSON contains the block IDs, thus the blocks pair by ID, not by text. Only the changed blocks and fields change, and with `base`, the changes of other writers stay. A block without an ID is a new block.
- `yjs/yDocText.ts`, for a Y.Doc (Yjs v13). It is a separate entry point, thus code without Yjs does not load Yjs:
  - `getYDocText(editor, ydoc, { format })`: returns the document as text.
  - `updateYDocFromText(editor, ydoc, { format, text, base, strategy })`: writes the text back. `base` is the Yjs state (`Y.encodeStateAsUpdate`) at the version that the client read. The result contains the Yjs update to send to the other clients, the operations and the warnings.
- Formats: `markdownFormat`, `htmlFormat` and `plainTextFormat`. A format is two functions, `serialize` and `parse` (see `formats/types.ts`). HTML shows more than markdown (for example colors, alignment and underline), thus a client can also change these.

There is no storage interface. The consumer keeps the versions, as full Block JSON or as full Yjs states. A version history must keep full documents in any case, because only a full document shows props, nesting and colors.

## Laws

The tests examine these laws (`api.laws.test.ts`, and `api.properties.test.ts` on random documents):

- **GetPut**: if a client writes back the text that it read, there are no operations. This is also true for text with only normalized formatting changes, for example `*` and `-` bullets.
- **PutGet**: if the document did not change after the client read the text, a read after a write gives the written text. Two texts are equal if their canonical forms are equal. The canonical form is the result of round trips (parse, then serialize) until the text does not change.
- **PutTwice**: if a client writes the same text two times, the second write gives no operations.
- **Retention**: blocks that an edit does not touch keep their ID, type, props and content.

With concurrent changes (a write with an older `base`), PutGet is not true. The laws are then (`api.concurrent.test.ts`, also on random pairs of writers, and `yjs/yDocText.test.ts`):

- **No revert**: a write of the text from `base` without changes gives no operations.
- **No lost updates**: changes of other writers to blocks that the text did not change stay. Two changes at different positions in one paragraph also stay. A block that another writer moved, dragged or fully rewrote is found by its ID.
- **Conflicts**: see the rules below.

## Concurrent writes

The pipeline computes the changes of the text as operations for `base`. A strategy applies them:

- **`"rebase"`** (the default, and the only strategy without Yjs): `rebase/` moves the operations to the current document. Then they apply to the current document. With Yjs, they apply to the current Y.Doc.
- **`"yjs"`** (only `updateYDocFromText`): the operations apply to a Yjs copy of `base`. Then Yjs merges the copy into the Y.Doc. In the Yjs binding now, a move is a removal and an insert. Thus, concurrent moves give two blocks with the same ID, or a change to a moved block is lost. The tests for these cases are marked as known failures (`it.fails`). A Yjs binding with a flat document model will remove this problem. Then, the tests will tell you to remove the marks.

The rebase rules (`rebase/rebaseOperations.ts`) find each block by its ID:

| Operation | Case                                               | Result                                                                                                                                                                                                                                             |
| --------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update    | The block is in the current document               | A three-way merge of each field: the base block, the base block with the update, and the current block. If both sides changed a field, the text wins. The content merges character by character.                                                   |
| Update    | Another writer removed the block                   | Not applied. Warning `change-to-removed-block`.                                                                                                                                                                                                    |
| Insert    | Another writer removed the reference block         | The block goes to the position of the reference block in `base`: after the nearest earlier sibling that still exists, or first in the parent. If the parent is also gone, the position of the parent. At the top level, the start of the document. |
| Move      | The block is already at the position               | Not done. Thus, a move that both sides did is done one time.                                                                                                                                                                                       |
| Move      | Another writer removed the block                   | Not applied. Warning `change-to-removed-block`.                                                                                                                                                                                                    |
| Move      | The reference is gone, or it is in the moved block | The position of the reference block in `base`, as for an insert.                                                                                                                                                                                   |
| Delete    | Another writer removed the block                   | Nothing.                                                                                                                                                                                                                                           |
| Delete    | Another writer changed the block or its children   | Removed. Warning `removed-changed-block`.                                                                                                                                                                                                          |

PutPut (two writes give the same result as the last write) is not true. For example, if a client removes a block and adds it again, the result is a new block.

## Identity: which block is the same block

The identity of a block follows the location of its text, not the similarity of its content (`alignment/`):

1. Blocks with equal text match first (a longest common subsequence). For a block without text (for example an image), the key is its type.
2. Between these anchors, a word diff of the block texts finds the overlap of each pair of blocks. Two blocks match if each block has its largest overlap with the other, and the overlap is at least half of the shorter text. Thus, a paragraph with eight new sentences stays the same block, with its ID and props.
3. If one block on each side stays between two matches, the two blocks have the same position. They match if their content has the same shape (text, table, or the same type without content). Thus, a paragraph with fully new text at the same position stays the same block.
4. Of the blocks without a match, two blocks match if they have equal, non-empty text that no other block without a match has, on either side. Thus, a block that the text moves keeps its ID, props and comments. The plan then moves the block.

A split paragraph keeps its ID on the part with the most of its text. Two joined paragraphs keep the ID of the first paragraph. A block that moved and also changed gets a new ID.

## The three-way merge

All merges in `merge/` use one rule and one vocabulary (`merge/threeWay.ts`):

- `base`: the common start of the two sides.
- `ours`: the side that makes the change. Its difference from `base` is the change to apply.
- `theirs`: the side that gets the change. It can have data that `base` does not show, and changes of other writers.

If `ours` is different from `base`, the result is `ours`. If not, the result is `theirs`. In the planner, `base` is the view block, `ours` is the block from the text, and `theirs` is the block in the document. In the rebase, `base` is the block at the version that the client read, `ours` is that block with the update, and `theirs` is the current block.

The merge of a block (`merge/block.ts`) merges the type, each prop of the three blocks, and the content. It merges inline content character by character (diff3, `merge/inline.ts`), and tables row by row and cell by cell (`merge/table.ts`). New text gets a style that the format does not show only if the text on its two sides has the style (at the start or end of the content, the one side). Thus, new text at the edge of a styled run does not get the style.

## Pipeline

1. **Project** (`projection/`): render `base` (or the current document, if there is no `base`) and parse it back. The result is the _view_. Link each view block to the source block that gave it, with the same overlap as in step 2 of the identity rules. A view block links to the source block that has most of its words.
2. **Parse** the incoming text and **align** it with the view (`alignment/`, see the identity rules above).
3. **Plan the target document** (`target/`): the document as the text asks for it, as Block JSON with IDs. A source block with a match stays, with the three-way merge of its fields. A new block gets a new ID. The blocks go in the order of the text, in the parent that the text shows. One pass builds the tree, with a stack of the open ancestors. Two rules keep data that the format does not show:
   - A block keeps a nesting that the format does not show (for example a paragraph in a bullet, in markdown), if the text did not change its nesting and the parent is still open. A new block before such a block goes into the same nesting. Thus, the child stays nested.
   - Blocks that the format does not show stay at their positions, with their parent. If the planner removes their parent, or all the visible blocks around them, it also removes them.
4. **Diff** (`operations/diffDocuments.ts`): the operations that change the document into the target. An update for each block with changed fields. In each parent, the blocks that keep their order stay (a longest common subsequence of the child IDs). Each other block goes after the block before it: a move, or an insert for a new block. The deletes come last. Thus, the blocks that stay moved out of the removed blocks first.
5. **Rebase** the operations to the current document, if `base` is older (see "Concurrent writes").
6. **Apply** the operations to a ProseMirror transaction (`operations/applyOperations.ts`). The type and props of a block change through `updateBlockTr`. Inline content changes through the smallest ProseMirror steps: a `ReplaceStep` for each changed run, and mark steps for style changes. A move moves the ProseMirror node of the block. Thus, unchanged text keeps its identity and its comments, also in a moved block, and a collaboration binding sees only small changes.

For a Y.Doc, `updateYDocFromText` reads the Y.XmlFragment as a ProseMirror document with the schema of the editor (not as Block JSON, which has no comment marks). It applies the operations to that document, and writes each ProseMirror step to the target Y.Doc alone (`updateYFragment`), in one Yjs transaction. The strategy selects only the target: the current Y.Doc, or a copy of `base`. To keep comments, give an editor that has the comments extension, so that its schema has the comment mark.

## Modules

Each module imports only modules that are before it in this list. Thus, there are no import cycles.

- `diff/`: the Myers match of two sequences. This module does not import BlockNote.
- `blocks/`: the block JSON types of the lens, flat lists of blocks, JSON equality, the update between two blocks, and `BlockTree` (the parent and the children of each block, by ID).
- `formats/`: `TextFormat` (`serialize` and `parse`), with markdown and plain text.
- `alignment/` and `merge/`: the identity of blocks, and the three-way merges.
- `projection/`: the view of a document and its links to the source blocks.
- `target/`: the planner. It gives the target document.
- `operations/`: the operation types, the diff of two documents, the ProseMirror steps, and `applyBlockOperations`.
- `rebase/`: moves operations from `base` to the current document. It is a pure function on Block JSON.
- `api.ts`: the entry point. It is the only caller of the rebase.
- `yjs/`: the API for a Y.Doc. It selects the target document, and writes the steps to it.

## Tests and benchmarks

- Each module has a unit test file next to it (`file.ts` and `file.test.ts`).
- The `api.*.test.ts` files examine the full pipeline:
  - `api.laws.test.ts`: the laws, on two documents, in the two formats.
  - `api.properties.test.ts`: the laws on 60 random documents with random edits, in the two formats. Each case has a seed, thus you can run a failed case again.
  - `api.markdown.test.ts` and `api.plainText.test.ts`: examples in each format.
  - `api.removals.test.ts`: removals, where content is lost. Examine these expected results carefully.
  - `api.concurrent.test.ts`: writes from an older version without Yjs, also on 40 random pairs of writers in each format.
- `yjs/yDocText.test.ts`: the Y.Doc API. The concurrent cases run for the two strategies.
- `testUtil/` contains the shared test documents and helpers.
- `api.bench.ts` measures a document with about 1,140 blocks. Run it with `vp test bench --run --reporter=verbose src/api/v2/api.bench.ts`. The mean times in jsdom were:

  | Format     | Read   | Write the same text | Write with one change |
  | ---------- | ------ | ------------------- | --------------------- |
  | Markdown   | 200 ms | 550 ms              | 480 ms                |
  | Plain text | 0.6 ms | 16 ms               | 14 ms                 |

  The times depend on the machine. Run the benchmark again for a comparison. A markdown write renders the document one time and parses two texts. Most of the time goes to the markdown conversion of BlockNote.

  The benchmark runs only five times. The reason is jsdom, not a memory leak: for each `<details open>` element (the export of a toggle block), jsdom starts a timer for the `toggle` event. Until the timer runs, it keeps the element and the full exported tree. The runs do not let the event loop turn, thus the timers do not run. After one turn of the event loop, the memory is free. In Chromium, the memory is also free after the task.

## Changes outside this folder

- `@blocknote/core/yjs` exports `updateYFragment` and `yXmlFragmentToProseMirrorRootNode` (from y-prosemirror). The Yjs API uses them to read and change a Y.Doc without an editor view.
- `@blocknote/xl-ai` has `yjs` as an optional peer dependency.

## Warnings

A result can contain warnings (`TextUpdateWarning`). A warning tells you that a part of the text did not apply as written, or that data was lost:

- `multi-part-block-replaced`: the text changed a block that the format shows as more than one block (for example a code block with blank lines, in plain text). The blocks of the text replace the block. Its hidden data is lost.
- `unlinked-block-changed`: the text changed a block of the view that has no source block. The change does not apply.
- `block-shape-replaced`: the format shows the block with content of a different shape (for example a table as lines of text), and the text changed that content. The block takes the type of the text block. Its old content is lost.
- `change-to-removed-block` (rebase): the text changed or moved a block that another writer removed. The change does not apply.
- `removed-changed-block` (rebase): the text removed a block that another writer changed. The block is removed, with the changes of the other writer.

## Problems in BlockNote

The branch `fix/markdown-roundtrip` fixes the markdown conversion: one round trip now gives the canonical form. These problems stay:

- A list item that has both a paragraph and a nested list: the HTML parser moves the nested list out of the list item.
- Italic text directly before bold text (`*a***b**`): the parser does not use the delimiter rules of CommonMark.
- HTML paste removes an image in a paragraph (markdown parse splits the paragraph around the image).

## Items that are not done

- Yjs v14 (`@y/y` and `@y/prosemirror`).
- IDs in the text.
- A block that the text moves and also changes. The lens does not find it. The block is removed and inserted again, with a new ID.
- Table rows with a different number of cells. Examples are added or removed columns, and changed rows with merged cells (the format shows them as separate cells). The result for these rows is the row from the text. The cell colors and merged cells of these rows are lost.
