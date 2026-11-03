# Text lens: write markdown, HTML or plain text back to a document

With this API, a client can read a document as text (markdown, HTML or plain text), change the text, and write it back. A write does not replace the document. It applies only the changes, and keeps the data that the text format does not show: block IDs, colors, alignment, underline, toggles, empty paragraphs, nesting that markdown removes, and comments on text that did not change.

In lens terms, the document is the source and the text is the view. The `serialize` function of the format is `get`. This folder supplies `put`.

## API

- `getDocumentText(editor, format)`: returns the document as text.
- `computeTextUpdate(editor, { format, text, base })`: returns the operations that change the document to agree with the text. The operations use block IDs. The result also contains warnings (a discriminated union). If the text gives blocks that do not fit the schema (for example an HTML table cell that spans more rows than the table has), the result is `{ error: "invalid-document" }`.
  - `base` is optional. It is the document (Block JSON) at the version that the client read. Get it from your version history. Without `base`, the text applies to the current document.
- `updateDocumentFromText(editor, { format, text, base })`: computes the operations and applies them in one transaction. First, the blocks without an ID get an ID (in an editor without a view, `removeBlocks` can leave such a block, and `editor.document` then shows a new ID on each read).
- `computeJSONUpdate(editor, { document, base })` and `updateDocumentFromJSON(editor, { document, base })`: the same for a full document as BlockNote JSON. The JSON contains the block IDs, thus the blocks pair by ID, not by text. Only the changed blocks and fields change, and with `base`, the changes of other writers stay.
  - A block without an ID is a new block. An ID can identify only one block. Thus, a block gets a new ID if an earlier block of the JSON has its ID, or (with `base`) if its ID is not in `base` but is in the current document (a block that another writer added).
  - If the JSON does not fit the schema of the editor (for example an unknown block type, an unknown style, or content in a block without content), the result is `{ error: "invalid-document" }`, and the document does not change. The props are not examined, as in `editor.insertBlocks`.
- `yjs/yDocText.ts`, for a Y.Doc (Yjs v13). It is a separate entry point, thus code without Yjs does not load Yjs:
  - `getYDocText(editor, ydoc, { format })`: returns the document as text.
  - `updateYDocFromText(editor, ydoc, { format, text, base, strategy })`: writes the text back. `base` is the Yjs state (`Y.encodeStateAsUpdate`) at the version that the client read. The result contains the Yjs update to send to the other clients, the operations and the warnings.
- Formats: `markdownFormat`, `htmlFormat` and `plainTextFormat`. A format is two functions, `serialize` and `parse` (see `formats/types.ts`). HTML shows more than markdown (for example colors, alignment and underline), thus a client can also change these.

There is no storage interface. The consumer keeps the versions, as full Block JSON or as full Yjs states. A version history must keep full documents in any case, because only a full document shows props, nesting and colors.

## Laws

The tests examine these laws (`api.laws.test.ts`, and `api.properties.test.ts` on random documents):

- **GetPut**: if a client writes back the text that it read, there are no operations. This is also true for text in which only the markup changed and the format gives the same blocks, for example `*` and `-` bullets.
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
- **`"yjs"`** (only `updateYDocFromText`): the operations apply to a Yjs copy of `base`. Then Yjs merges the copy into the Y.Doc. In the Yjs binding now, a move is a removal and an insert. Thus, concurrent moves give two blocks with the same ID, or a change to a moved block is lost. The tests for these cases are marked as known failures (`it.fails`). A Yjs binding with a flat document model will remove this problem. Then, the tests will tell you to remove the marks. A write from an empty `base` uses `"rebase"`: a copy of an empty base gets its own root block group, and Yjs cannot merge two new root structures into one.

The rebase rules (`rebase/rebaseOperations.ts`) find each block by its ID:

| Operation | Case                                                                  | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Update    | The block is in the current document                                  | A three-way merge of each field: the base block, the base block with the update, and the current block. If both sides changed a field, the text wins, with the warning `conflicting-change`. The content merges character by character. A change that both sides made applies one time. If both sides added text at the same position, the two texts stay.                                                                                                                                                                |
| Update    | Another writer removed the block                                      | Not applied. Warning `change-to-removed-block`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Insert    | Another writer removed the reference block                            | The block goes to the position of the reference block in `base`: after the nearest earlier sibling that still exists, or first in the parent. If the parent is also gone, the position of the parent. At the top level, the start of the document. A position in a block that the client removes is not used, and a position whose parent cannot hold the block (for example a paragraph next to a column) is not used. For a new block of the client as the reference, the position of that block in the target applies. |
| Move      | The block is already at the position                                  | Not done. Thus, a move that both sides did is done one time.                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Move      | Another writer removed the block                                      | Not applied. Warning `change-to-removed-block`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Move      | The reference is gone, or it is in the moved block                    | The position of the reference block in `base`, as for an insert.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Delete    | Another writer removed the block                                      | Nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Delete    | Another writer changed the block or its children                      | Removed. Warning `removed-changed-block`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Delete    | The block has blocks that the client keeps                            | These blocks move out first, to the position of the removed block. Examples are a block that another writer moved into the removed block, at any depth.                                                                                                                                                                                                                                                                                                                                                                   |
| Delete    | Another writer moved a block out of it, which the client also removes | That block goes too.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

PutPut (two writes give the same result as the last write) is not true. For example, if a client removes a block and adds it again, the result is a new block.

## Identity: which block is the same block

The identity of a block follows the location of its text, not the similarity of its content (`alignment/`):

1. Blocks with equal text match first (a longest common subsequence). For a block without text (for example an image), the key is its type, props and content.
2. Between these anchors, a word diff of the block texts finds the overlap of each pair of blocks (for large edits, with anchors: words that are in each side one time, the patience method). Two blocks match if each block has its largest overlap with the other, and the overlap is at least half of the shorter text. Thus, a paragraph with eight new sentences stays the same block, with its ID and props.
3. Of the blocks without a match, two blocks match if they have equal, non-empty text that no other block without a match has, on either side. Thus, a block that the text moves keeps its ID, props and comments. The plan then moves the block.
4. If one block on each side stays between two matches of rules 1 and 2 (the moved blocks do not count), the two blocks have the same position. They match if their content has the same shape (text, table, or the same type without content). Thus, a paragraph with fully new text at the same position stays the same block.

An equal text is a stronger sign than a position. Thus, a moved block does not match a different block at its new position.

A split paragraph keeps its ID on the part with the most of its text. Two joined paragraphs keep the ID of the first paragraph. A block that moved and also changed gets a new ID.

## The three-way merge

All merges in `merge/` use one rule and one vocabulary (`merge/threeWay.ts`):

- `base`: the common start of the two sides.
- `ours`: the side that makes the change. Its difference from `base` is the change to apply.
- `theirs`: the side that gets the change. It can have data that `base` does not show, and changes of other writers.

If `ours` is different from `base`, the result is `ours`. If not, the result is `theirs`. In the planner, `base` is the view block, `ours` is the block from the text, and `theirs` is the block in the document. In the rebase, `base` is the block at the version that the client read, `ours` is that block with the update, and `theirs` is the current block.

The merge of a block (`merge/block.ts`) merges the type, each prop of the three blocks, and the content. It merges inline content character by character (diff3, `merge/inline.ts`), and tables row by row and cell by cell (`merge/table.ts`). New text gets a style that the format does not show only if the text on its two sides has the style (at the start or end of the content, the one side). Thus, new text at the edge of a styled run does not get the style.

## Pipeline

1. **Project** (`projection/`): render `base` (or the current document, if there is no `base`) and parse it back. The result is the _view_. Link each view block to the source block that gave it, with the same overlap as in step 2 of the identity rules. A view block links to the source block that has most of its words. A block without content (for example an image) links by its type, because the format can lose its props. A block without content that the format renders as no text (for example an image without a URL, in markdown) does not take part in the links.
2. **Parse** the incoming text and **align** it with the view (`alignment/`, see the identity rules above).
3. **Plan the target document** (`target/`): the document as the text asks for it, as Block JSON with IDs. A source block with a match stays, with the three-way merge of its fields. A new block gets a new ID. The blocks go in the order of the text, in the parent that the text shows. One pass builds the tree, with a stack of the open ancestors. Two rules keep data that the format does not show:
   - A block keeps a nesting that the format does not show (for example a paragraph in a bullet, in markdown), if the text did not change its nesting and the parent is still open. A new block before such a block goes into the same nesting. Thus, the child stays nested. The same is true for a kept block that would close a hidden block that the next block needs (for example a top-level paragraph that the text puts between the blocks of two columns), and for a kept block whose source parent is closed. A block that the text moves (rule 3) keeps its hidden nesting only near that nesting: if one of its hidden ancestors is open, or the next kept block is in one of them. Else it goes where a new block goes. Thus, a block that the text moves out of the columns does not take the column list with it.
   - Blocks that the format does not show stay at their positions, with their parent. If the planner removes their parent, it also removes them. An empty block (for example an empty paragraph) also goes if the planner removes all the visible blocks around it. A hidden block with data (for example a table or an image in plain text) stays, because the text cannot show it.
   - The layout blocks of the target change to fit their child rules (`target/fitLayout.ts`, for the JSON API too): a column without blocks goes, and a column list with one column becomes the blocks of that column. ProseMirror would fill them with new empty blocks. For a write from an older version, the rule applies to the result on the current document, not to the target: there, an empty column of the client can have blocks of other writers. The rebase gives the tree of the result, and the layout fit of that tree gives more operations. The "yjs" strategy keeps the layout blocks, also if they become empty: Yjs cannot merge the removal of a column with a block that another writer adds to it.
4. **Diff** (`operations/diffDocuments.ts`): the operations that change the document into the target. An update for each block with changed fields. In each parent, the blocks that keep their order stay (a longest common subsequence of the child IDs). Each other block goes after the block before it: a move, or an insert for a new block. The deletes come last. Thus, the blocks that stay moved out of the removed blocks first.
5. **Rebase** the operations to the current document, if `base` is older (see "Concurrent writes").
6. **Apply** the operations to a ProseMirror transaction (`operations/applyOperations.ts`). The type and props of a block change through `updateBlockTr`. Inline content changes through the smallest ProseMirror steps: a `ReplaceStep` for each changed run, and mark steps for style changes. A move moves the ProseMirror node of the block. Thus, unchanged text keeps its identity and its comments, also in a moved block, and a collaboration binding sees only small changes. Core and ProseMirror fill a block with too few children with new blocks (for example a new column list before the moves of its columns). At the end, these blocks go if their parent does not need them: the blocks of the document and of the inserts are known, thus another block is such a fill block.

For a Y.Doc, `updateYDocFromText` reads the Y.XmlFragment as a ProseMirror document with the schema of the editor (not as Block JSON, which has no comment marks). The read uses a copy of the Y.Doc, because y-prosemirror removes the content that the schema cannot read. If the copy changed, the read throws an error, and the Y.Doc does not change. It applies the operations to that document, and writes each ProseMirror step to the target Y.Doc alone, in one Yjs transaction (`yjs/writeSteps.ts`). A step writes only the Y element of the innermost block that contains it (`updateYFragment`), found by its path. Thus, a change in a block costs time for that block only. A step that inserts or removes whole blocks at the top level changes the Y children of the top-level group directly (in a nested group, the step writes the Y element of the parent block). Other steps write the full document. 900 new paragraphs in 9,000 paragraphs take 1.8 s (0.9 s for an editor). One diff of the full document is not correct for the "yjs" strategy: for a paragraph with two changes, it replaces the text between them, and Yjs then adds a change of another writer there a second time. The strategy selects only the target: the current Y.Doc, or a copy of `base`. To keep comments, give an editor that has the comments extension, so that its schema has the comment mark.

## Modules

Each module imports only modules that are before it in this list. Thus, there are no import cycles.

- `diff/`: the Myers match of two sequences (with a trace up to 1,000 edits, and in linear space with a work limit above that), and the anchored match (the patience method) for large inputs. This module does not import BlockNote.
- `blocks/`: the block JSON types of the lens, flat lists of blocks, JSON equality, the update between two blocks, and `BlockTree` (the parent and the children of each block, by ID).
- `formats/`: `TextFormat` (`serialize` and `parse`), with markdown, HTML and plain text.
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
  - `api.laws.test.ts`: the laws, on two documents, in the three formats.
  - `api.properties.test.ts`: the laws on 200 random documents with random edits, in the three formats, on 100 random documents with columns, and on 400 random line edits in markdown. Each case has a seed, thus you can run a failed case again.
  - `api.markdown.test.ts`, `api.html.test.ts` and `api.plainText.test.ts`: examples in each format.
  - `api.json.test.ts`: the JSON API.
  - `api.removals.test.ts`: removals, where content is lost. Examine these expected results carefully.
  - `api.concurrent.test.ts`: writes from an older version without Yjs, also on 40 random pairs of writers and 40 random groups of three or four writers in each format.
- `yjs/yDocText.test.ts`: the Y.Doc API. The concurrent cases run for the two strategies.
- `testUtil/` contains the shared test documents and helpers.
- `api.bench.ts` measures a document with about 1,140 blocks. Run it with `vp test bench --run --reporter=verbose src/api/v2/api.bench.ts`. The mean times in jsdom were:

  | Format     | Read   | Write the same text | Write with one change |
  | ---------- | ------ | ------------------- | --------------------- |
  | Markdown   | 200 ms | 550 ms              | 480 ms                |
  | Plain text | 0.6 ms | 16 ms               | 14 ms                 |

  The times depend on the machine. Run the benchmark again for a comparison. A markdown write renders the document one time and parses two texts. Most of the time goes to the markdown conversion of BlockNote.

  The benchmark runs only five times. The reason is jsdom, not a memory leak: for each `<details open>` element (the export of a toggle block), jsdom starts a timer for the `toggle` event. Until the timer runs, it keeps the element and the full exported tree. The runs do not let the event loop turn, thus the timers do not run. After one turn of the event loop, the memory is free. In Chromium, the memory is also free after the task.

- `benchmarks/largeDocuments.test.ts` measures documents of 1,000 to 10,000 blocks in each format, and each stage of the pipeline. Run it with `TEXT_LENS_BENCH=1 vp test run src/api/v2/benchmarks --silent=false`. The median times in jsdom for 10,000 blocks were:

  | Format     | Read     | Write with one change | Write from an older version | Y.Doc write | Align, plan and diff |
  | ---------- | -------- | --------------------- | --------------------------- | ----------- | -------------------- |
  | Markdown   | 1,448 ms | 4,471 ms              | 4,518 ms                    | 4,967 ms    | 40 ms                |
  | HTML       | 659 ms   | 3,373 ms              | 3,434 ms                    | 3,864 ms    | 44 ms                |
  | Plain text | 3 ms     | 78 ms                 | 80 ms                       | 514 ms      | 44 ms                |

  The stages of the lens (align, plan, diff) are linear. A write that changes the text of many blocks is linear too: a plain text that changes all of 4,000 paragraphs takes 0.2 s for an editor and 0.4 s for a Y.Doc. Many inserts in a Y.Doc are fast too (see the Y.Doc step above). Most of the time goes to the markdown and HTML conversions of BlockNote, and to the parse of the text.

## Changes outside this folder

- `@blocknote/core/yjs` exports `updateYFragment` and `yXmlFragmentToProseMirrorRootNode` (from y-prosemirror). The Yjs API uses them to read and change a Y.Doc without an editor view.
- `@blocknote/xl-ai` has `yjs` as an optional peer dependency.

## Warnings

A result can contain warnings (`TextUpdateWarning`). A warning tells you that a part of the text did not apply as written, or that data was lost:

- `multi-part-block-replaced`: the text changed a block that the format shows as more than one block (for example a code block with blank lines, in plain text). The blocks of the text replace the block. Its hidden data is lost.
- `unlinked-block-changed`: the text changed a part of the text that does not come from one document block (`text` is that part). The change does not apply. An empty block of the view without a document block gives no warning, because the text cannot change data of it.
- `block-shape-replaced`: the format shows the block with content of a different shape (for example a table as lines of text), and the text changed that content. The block takes the type of the text block. Its old content is lost.
- `change-to-removed-block` (rebase): the text changed or moved a block that another writer removed. The change does not apply.
- `removed-changed-block` (rebase): the text removed a block that another writer changed. The block is removed, with the changes of the other writer.
- `conflicting-change` (rebase): the text and another writer changed the same part of a block (a part of its text, a style, or a prop) in different ways. The change of the text applies there, and the change of the other writer there is lost. An example is a block that another writer rewrote, or split into two blocks.

## Problems in BlockNote

The branch `fix/markdown-roundtrip` fixes the markdown conversion: one round trip now gives the canonical form, and the parse removes the whitespace that the exporter does not write. It also fixes the HTML export of a toggle with list items and other blocks as children, which changed their order, and the HTML parse of a list item with blocks around a nested list, which moved these blocks out of the list item. These problems stay:

- Delimiter runs like `***`: the parser does not use the delimiter rules of CommonMark. The exporter writes underscores where it can (`*a*__b__`, `**a _b_**`), but not next to a letter or a digit, or for text with `_`. There, runs like `***` stay.
- HTML paste removes an image in a paragraph (markdown parse splits the paragraph around the image).

## Items that are not done

- Yjs v14 (`@y/y` and `@y/prosemirror`).
- IDs in the text.
- A source map from the format. Some formats show a block as a part of the text that the parse does not give back as one block (for example a file block as a link in a list item). The view block then has no link, and a change to it does not apply (warning `unlinked-block-changed`).
- A split by another writer: the rebase merges each block by its ID. If another writer splits a block, and the client changes the text of the second part, the change applies to the first block, and the new second block keeps the old text. The result has that text two times, with the warning `conflicting-change`.
- A block that another writer rewrote: if another writer changes almost all words of a block (for example the case of each word), the alignment of the old and the new text finds nothing in common. If the client also changes that block, the text of the client wins in the block, and the changes of the other writer in it are lost, with the warning `conflicting-change`.
- In jsdom, the markdown export of many paragraphs in list items is quadratic, because each move of an element recomputes the index of its siblings.
- A block that the text moves and also changes. The lens does not find it. The block is removed and inserted again, with a new ID.
- Table rows with a different number of cells. Examples are added or removed columns, and changed rows with merged cells (the format shows them as separate cells). The result for these rows is the row from the text. The cell colors and merged cells of these rows are lost.
