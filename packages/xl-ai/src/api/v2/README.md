# Text lens: write markdown, HTML or plain text back to a document

With this API, a client can read a document as text (markdown, HTML or plain text), change the text, and write it back. A write does not replace the document. It applies only the changes. Thus, the data that the format does not show stays. Examples are block IDs, colors, alignment, underline, toggles, empty paragraphs, the nesting that markdown removes, and comments on unchanged text.

In lens terms, the document is the source and the text is the view. The `serialize` function of the format is `get`. This folder supplies `put`.

## API

- `getDocumentText(editor, format)`: returns the document as text.
- `computeTextUpdate(editor, { format, text, base })`: returns the operations that change the document to agree with the text. The operations use block IDs. The result also contains warnings (a discriminated union). If the text gives blocks that do not fit the schema (for example an HTML table cell that spans more rows than the table has), the result is `{ error: "invalid-document" }`.
  - `base` is optional. It is the document (Block JSON) at the version that the client read. Get it from your version history. Without `base`, the text applies to the current document.
- `updateDocumentFromText(editor, { format, text, base })`: computes the operations and applies them in one transaction. First, the blocks without an ID get an ID (in an editor without a view, `removeBlocks` can leave such a block, and `editor.document` then shows a new ID on each read).
- `computeJSONUpdate(editor, { document, base })` and `updateDocumentFromJSON(editor, { document, base })`: the same for a full document as BlockNote JSON. The JSON contains the block IDs, thus the blocks pair by ID, not by text. Only the changed blocks and fields change, and with `base`, the changes of other writers stay. A field that the JSON of a block does not have gets its default value: send each block with all its fields (for example from `editor.document`).
  - A block without an ID is a new block. An ID can identify only one block. Thus, a block gets a new ID if an earlier block of the JSON has its ID. With `base`, a block also gets a new ID if another writer added a block with its ID after `base`.
  - If the JSON does not fit the schema of the editor, the result is `{ error: "invalid-document" }`, and the document does not change. Examples are an unknown block type, an unknown style, content in a block without content, and a prop value that is not in the prop schema of the type.
- `yjs/yDocText.ts`, for a Y.Doc (Yjs v13). It is a separate entry point, thus code without Yjs does not load Yjs:
  - `updateYDocFromText(editor, fragment, { format, text, base, strategy })`: writes the text back, through an editor that is bound to the fragment (`withCollaboration` of `@blocknote/core/yjs`) and mounted, as a client. `base` is the Yjs state (`Y.encodeStateAsUpdate`) at the version that the client read. The result contains the Yjs update to send to the other clients, the operations and the warnings.
  - To read the text, use `getDocumentText` on the bound editor.
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

The pipeline computes the target of the text for `base`. A strategy applies it:

- **`"rebase"`** (the default, and the only strategy without Yjs): the target of the text (for `base`) merges three-way with the current document (`merge/tree.ts`, below). The diff of the current document and the merged tree gives the operations. With Yjs, they apply to the bound editor, and the binding writes them to the Y.Doc.
- **`"yjs"`** (only `updateYDocFromText`): the editor forks the Y.Doc at `base` (`ForkYDocExtension` of core), the operations for `base` apply to the fork, and Yjs merges the fork into the Y.Doc. In the Yjs binding now, a move is a removal and an insert. Thus, if two writers move the same block, the block is there two times, with the same ID, and if another writer changes a block that the text moves, the change is lost. The tests for these cases are marked as known failures (`it.fails`). A Yjs binding with a flat document model will remove this problem. Then these tests pass, and vitest gives an error for each `it.fails` test that passes: remove its mark. Yjs does not know the schema: as in each client, y-prosemirror removes the content of a merged document that does not fit the schema. A write from an empty `base` uses `"rebase"`: a fork of an empty base gets its own root block group, and Yjs cannot merge two new root structures into one.

The three-way merge of the trees (`merge/tree.ts`) uses the block IDs. `base` is the document that the client read, `ours` is the target, and `theirs` is the current document:

1. **Which blocks stay.** A block of the target stays, unless another writer removed it (warning `change-to-removed-block` if the client changed or moved it). A new block of another writer stays if its parent stays. A block that the client removed goes (warning `removed-changed-block` if another writer changed it or a block in it).
2. **The parent.** The parent of the target if the client changed it, else the current parent. If that parent goes, the block goes to the place of that parent: for example a block that the client keeps in a block that the client removes, or a new block of the client in a block that another writer removed. If the parents of the two sides make a cycle (each side moved a block into the other), the parents of the target win.
3. **The order.** For each parent, the lists of child IDs merge three-way (`diff3`). Thus, a move that both sides made happens one time. If both sides add blocks at one position, both stay: the blocks of the client first.
4. **The fields.** Each field merges three-way (`merge/block.ts`). If both sides changed the same part, the client wins (warning `conflicting-change`).

A block that its parent in the result cannot hold becomes its children there. An example is a new column of the client in a column list that another writer removed. Then the layout rule (`target/fitLayout.ts`) applies to the merged tree, and the diff of the current document and that tree gives the operations.

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

The merge of a block (`merge/block.ts`) merges the type, each prop of the three blocks, and the content. It merges inline content character by character (diff3, `merge/inline.ts`), and tables row by row and cell by cell (`merge/table.ts`). The characters align by words first, then by characters between the matched words. A word token has no whitespace, thus a word matches at each position. New text that replaces old text gets the hidden styles and the link of the old text, if all the old text has them. Thus, a changed word keeps the hidden underline of the word that it replaces. Inserted text gets such a style only if the text on its two sides has it. Thus, new text at the edge of a styled run does not get the style. This is also true at the start and at the end of the content: for example, text after a link at the end does not become a part of the link. Some formats show custom inline content as text (markdown shows a mention as "@Bob"), and the parse gives back only that text. In the planner, the merge then uses that text as a shadow of the item: the characters of one serialize and parse of the item alone. If the text keeps all characters of the shadow, the item stays. If the text changes them, the text replaces the item.

## Pipeline

1. **Project** (`projection/`): render `base` (or the current document, if there is no `base`) and parse it back. The result is the _view_. Each source block also makes the round trip alone, without its children. The view blocks that a block gives alone are its _parts_. Thus, the source of each part is known, and the links do not depend on a similarity of texts. The view blocks link to the parts: blocks with equal keys first, then the blocks between them in order, if the two sides have the same number of blocks. The two lists come from the same blocks, thus they are different only where the format renders a block differently in the full document. A block that the format renders as no text (for example an image without a URL, in markdown) has no parts. A block can have more than one part: for example, markdown shows a file block as a paragraph with a link and a paragraph with its caption, and plain text shows a code block with a blank line as two paragraphs. Thus, a client can move or remove such a block in the text. A change to its text replaces it with the blocks of the text (warning `multi-part-block-replaced` or `block-shape-replaced`). A layout block (for example a column) is not a document without its children (the parse fills it with new blocks), thus its part is the block itself.
2. **Parse** the incoming text and **align** it with the view (`alignment/`, see the identity rules above).
3. **Plan the target document** (`target/`): the document as the text asks for it, as Block JSON with IDs. A source block with a match stays, with the three-way merge of its fields. A new block gets a new ID. The blocks go in the order of the text, in the parent that the text shows. One pass builds the tree, with a stack of the open ancestors. Two rules keep data that the format does not show:
   - A block keeps a nesting that the format does not show (for example a paragraph in a bullet, in markdown). The conditions are: the text did not change its parent, the parent has the same type, and the parent is still open. A new block before such a block goes into the same nesting. Thus, the child stays nested. A kept block also goes into the nesting of the next block if it would close a hidden block that the next block needs. An example is a top-level paragraph that the text puts between the blocks of two columns. The same is true for a kept block whose source parent is closed. A block that the text moves (rule 3) keeps its hidden nesting only near that nesting: one of its hidden ancestors is open, or the next kept block is in one of them. Else it goes where a new block goes. Thus, a block that the text moves out of the columns does not take the column list with it.
   - Blocks that the format does not show stay at their positions, with their parent. If the planner removes their parent, it also removes them. An empty block (for example an empty paragraph) also goes if the planner removes all the visible blocks around it. A hidden block with data (for example a table or an image in plain text) stays, because the text cannot show it.
   - The layout blocks of the target change to fit their child rules (`target/fitLayout.ts`, also for the JSON API). A column without blocks goes, and a column list with one column becomes the blocks of that column. ProseMirror would fill them with new empty blocks. For a write from an older version, the rule applies to the result on the current document, not to the target. The reason: there, an empty column of the client can have blocks of other writers. The rebase gives the tree of the result, and the layout fit of that tree gives more operations. The "yjs" strategy keeps the layout blocks, also if they become empty. The reason: Yjs cannot merge the removal of a column with a block that another writer adds to it.
4. **Merge** the target with the current document, if `base` is older (see "Concurrent writes").
5. **Diff** (`operations/diffDocuments.ts`): the operations that change the current document into the target (or into the merged tree). An update for each block with changed fields. In each parent, the blocks that keep their order stay (a longest common subsequence of the child IDs). Each other block goes after the block before it: a move, or an insert for a new block. The deletes come last. Thus, the blocks that stay moved out of the removed blocks first.
6. **Apply** the operations to a ProseMirror transaction (`operations/applyOperations.ts`). An update changes the block in place: the type and props through `updateBlockTr`, and inline content through the smallest ProseMirror steps (a `ReplaceStep` for each changed run, and mark steps for style changes). Thus, unchanged text keeps its identity and its comments. The inserts, the moves and the removals give the structure of the result (`operations/applyToBlocks.ts`, a pure function). Then each block whose children change is replaced, in one step, with its new children: the ProseMirror nodes of the blocks that the document has (a moved block keeps its node, with its comments), and new nodes. A step with a valid result is never filled with new blocks. Only a node that needs a child (a document without blocks, or an empty column of the "yjs" strategy) gets one from the schema.

For a Y.Doc, `updateYDocFromText` writes through an editor that is bound to the Y.Doc, as a client. The y-prosemirror binding reads and writes the Y.Doc, as for each other client. Thus, the lens has no reader or writer of its own for Yjs. The editor must be mounted, because y-prosemirror makes its binding in the editor view. Give the editor the schema and the extensions of the other clients (for example comments). The reason: when an editor binds to a Y.Doc, y-prosemirror removes the content that its schema cannot read. For each transaction, y-prosemirror writes one diff for each text block, from the first changed character to the last. For a paragraph with two changes, that diff replaces the text between them. Yjs then moves a concurrent change of another writer there. Thus, the steps go to the editor in transactions in which no two steps change the same text block (`yjs/dispatchSteps.ts`). Then each Yjs change is as small as its step, as for a user who types. A write that changes many blocks one time each is one transaction.

## Modules

Each module imports only modules that are before it in this list. Thus, there are no import cycles.

- `diff/`: the Myers match of two sequences (in linear space, with a work limit), and the anchored match (the patience method) for large inputs. This module does not import BlockNote.
- `blocks/`: the block JSON types of the lens, flat lists of blocks, JSON equality, the update between two blocks, and `BlockTree` (the parent and the children of each block, by ID).
- `formats/`: `TextFormat` (`serialize` and `parse`), with markdown, HTML and plain text.
- `alignment/` and `merge/`: the identity of blocks, and the three-way merges.
- `projection/`: the view of a document and its links to the source blocks.
- `target/`: the planner. It gives the target document.
- `operations/`: the operation types, the diff of two documents, the ProseMirror steps, and `applyBlockOperations`.
- `api.ts`: the entry point.
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

  The stages of the lens (align, plan, diff) are linear. A write that changes the text of many blocks is also linear. For example, a plain text that changes all of 4,000 paragraphs takes 0.2 s for an editor and 1.3 s for a Y.Doc. 900 new paragraphs in 9,000 paragraphs take 3.3 s for a Y.Doc. For a Y.Doc, most of the time is the render of the editor view in jsdom. For text, most of the time goes to the markdown and HTML conversions of BlockNote, and to the parse of the text.

## Changes outside this folder

- `packages/xl-ai/package.json` has the subpath exports `./text-lens` and `./text-lens/yjs`, and `yjs` as an optional peer dependency. `packages/xl-ai/vite.config.ts` has their build entries.
- `packages/core`: the markdown and HTML round trip fixes of the branch `fix/markdown-roundtrip` (see "Problems in BlockNote").

## Warnings

A result can contain warnings (`TextUpdateWarning`). A warning tells you that a part of the text did not apply as written, or that data was lost:

- `multi-part-block-replaced`: the text changed a block that the format shows as more than one block (for example a code block with blank lines, in plain text). The blocks of the text replace the block. Its hidden data is lost.
- `unlinked-block-changed`: the text changed a part of the text that does not come from one document block (`text` is that part). The change does not apply. An empty block of the view without a document block gives no warning, because the text cannot change data of it.
- `block-shape-replaced`: the format shows the block with content of a different shape (for example a table as lines of text), and the text changed that content. The block takes the type of the text block. Its old content is lost.
- `change-to-removed-block` (rebase): the text changed or moved a block that another writer removed. The change does not apply.
- `removed-changed-block` (rebase): the text removed a block that another writer changed. The block is removed, with the changes of the other writer.
- `conflicting-change` (rebase): the text and another writer changed the same part of a block (a part of its text, a style, or a prop) in different ways. The change of the text applies there, and the change of the other writer there is lost. An example is a block that another writer rewrote, or split into two blocks.

## Problems in BlockNote

The branch `fix/markdown-roundtrip` fixes these problems:

- The markdown round trip: one round trip now gives the canonical form, and the parse removes the whitespace that the exporter does not write.
- The HTML export of a toggle with list items and other blocks as children changed their order.
- The HTML parse of a list item with blocks around a nested list moved these blocks out of the list item.

These problems stay:

- Delimiter runs like `***`: the parser does not use the delimiter rules of CommonMark. The exporter writes underscores where it can (`*a*__b__`, `**a _b_**`), but not next to a letter or a digit, or for text with `_`. There, runs like `***` stay.
- HTML paste removes an image in a paragraph (markdown parse splits the paragraph around the image).
- The markdown and HTML parsers use recursion for nested blocks. A text with a very deep nesting (for example 20,000 quote markers in markdown) overflows the stack. A server must parse untrusted text in a worker, with a time limit.
- The HTML export of a file block is a link (with a paragraph for the caption). The parse does not read it back as a file block. Thus, in HTML, a change to a file block replaces it with the blocks of the text, as in markdown.
- Duplicate block IDs in a Y.Doc (for example after two clients move the same block). The unique ID extension gives new IDs to the copies in the editor. But y-prosemirror does not write these IDs to the Y.Doc, because the extension makes the change during the sync of a remote update. Thus, each client can show different IDs for these blocks.

## Items that are not done

- Yjs v14 (`@y/y` and `@y/prosemirror`).
- IDs in the text.
- A split by another writer: the rebase merges each block by its ID. If another writer splits a block, and the client changes the text of the second part, the change applies to the first block, and the new second block keeps the old text. The result has that text two times, with the warning `conflicting-change`.
- A block that another writer rewrote. If another writer changes almost all words of a block (for example the case of each word), the alignment of the old and the new text finds nothing in common. If the client also changes that block, the text of the client wins in the block. The changes of the other writer in it are lost, with the warning `conflicting-change`.
- In jsdom, the markdown export of many paragraphs in list items is quadratic, because each move of an element recomputes the index of its siblings.
- A block that the text moves and also changes. The lens does not find it. The block is removed and inserted again, with a new ID.
- Table rows with a different number of cells. Examples are added or removed columns, and changed rows with merged cells (the format shows them as separate cells). The result for these rows is the row from the text. The cell colors and merged cells of these rows are lost.
