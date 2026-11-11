# Text lens: write markdown, HTML or plain text back to a document

With this API, a client can read a document as text (markdown, HTML or plain text), change the text, and write it back. A write does not replace the document. It applies only the changes. Thus, the data that the format does not show stays. Examples are block IDs, colors, alignment, underline, toggles, empty paragraphs, the nesting that markdown removes, and comments on unchanged text.

In lens terms, the document is the source and the text is the view. The `serialize` function of the format is `get`. This folder supplies `put`.

## API

- `getDocumentText(editor, format)`: returns the document as text.
- `computeOperations(editor, change)`: returns the operations that change the document to agree with the change, and the warnings (`ChangeResult`, a discriminated union). Nothing changes. The operations use block IDs.
- `updateDocument(editor, change)`: computes the operations and applies them in one step: in one transaction, or for an editor that is bound to a Y.Doc, in groups (see "Dispatch"). The document must have one block for each ID: a block without an ID, or two blocks with one ID, is a broken invariant, and the write throws (the editor gives each block an ID, also without a view; see `assertBlockIds`, and "Items that are not done" for a Y.Doc).
- `applyOperations(tr, operations)`: applies operations to a transaction of the caller, for example to show them as suggestions.
- The change (`DocumentChange`) is one of two kinds, with the version that the client read:
  - A text: `{ format, text, base }` (`TextChange`). The blocks of the text pair with the blocks of the document by the location of their text (see "Identity").
  - BlockNote JSON: `{ document, base }` (`JSONChange`), the full document. The JSON contains the block IDs, thus the blocks pair by ID. A field that the JSON of a block does not have gets its default value: send each block with all its fields (for example from `editor.document`). A block without an ID is a new block. An ID can identify only one block. Thus, a JSON with two blocks with one ID gives the error `invalid-document`. With `base`, a block also gets a new ID if another writer added a block with its ID after `base`.
  - `base` is required: the version that the client read. It is `"current"` (the client read the current document: the change applies to it without a merge, and the change is the truth), or the document (Block JSON) at that version (get it from your version history). A required `base` makes the choice explicit: a write that forgets it would revert the changes of other writers without a warning.
  - `onConflict` is optional, and only allowed with a version as `base`: `"keep-current"` (the default) or `"reject"` (see "Concurrent writes"). With `"reject"`, a change with a conflict gives `{ error: "conflict", conflicts }`.
- If the text or the JSON gives blocks that do not fit the schema of the editor, the result is `{ error: "invalid-document" }`, and the document does not change. Examples are an unknown block type, an unknown style, content in a block without content, a prop value that is not in the prop schema of the type, and an HTML table cell that spans more rows than the table has. The JSON must also fit the schema without a fill: for example, a column list with one column or an empty column gives the error (the conversion would add blocks).
- `yjs/index.ts` (code in `yjs/yDocText.ts`), for a Y.Doc (Yjs v13). It is a separate entry point, thus code without Yjs does not load Yjs:
  - `updateYDoc(editor, fragment, change)`: writes the change (a text or JSON) back, through an editor that is bound to the fragment (`withCollaboration` of `@blocknote/core/yjs`) and mounted, as a client. `base` is `"current"`, or the Yjs state (`Y.encodeStateAsUpdate`) at the version that the client read. The write first applies `base` to the Y.Doc: the client can read from a replica with an update that this Y.Doc does not have yet, and Yjs applies each update only one time. The result contains the Yjs update to send to the other clients, the operations and the warnings.
  - `merge` is optional, and selects what merges the change with the changes of other writers after `base` (`YDocWriteFromVersion`): `"lens"` (the default, the three-way merge of "Concurrent writes") or `"yjs"` (Yjs merges a fork of the Y.Doc at `base`, see below). The type allows `"yjs"` only with a Yjs state as `base`, and without `onConflict`: Yjs has no conflicts.
  - To read the text, use `getDocumentText` on the bound editor.
- Formats: `markdownFormat`, `htmlFormat` and `plainTextFormat`. A format is two functions, `serialize` and `parse` (see `formats/types.ts`). HTML shows more than markdown (for example colors, alignment and underline), thus a client can also change these.

There is no storage interface. The consumer keeps the versions, as full Block JSON or as full Yjs states. A version history must keep full documents in any case, because only a full document shows props, nesting and colors.

## Terms

Each term has one meaning in the code, the comments and this README. The stage is the first stage that uses the term (see "Pipeline").

| Term                          | Meaning                                                                                                                                                                   | In the code                    | Stage      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ | ---------- |
| text                          | The string that a client reads (`getDocumentText`) and writes back.                                                                                                       | `text`                         | API        |
| format                        | Two functions: `serialize` (blocks to text) and `parse` (text to blocks).                                                                                                 | `TextFormat`                   | API        |
| current document              | The document of the editor (or of the Y.Doc) now.                                                                                                                         | `current`                      | API        |
| `base`                        | The version that the client read: `"current"`, or a version of the document.                                                                                              | `base`                         | API        |
| source document, source block | The document that the change starts from: the version of `base`, or the current document for `base: "current"`.                                                           | `source`                       | 1          |
| stored form                   | The blocks as the document stores them: through the ProseMirror schema and back. Blocks in this form compare equal to the blocks of the document.                         | `toStoredBlocks`               | 1, 2       |
| view, view block              | The text of the source document, parsed back in the stored form: the document as the format shows it.                                                                     | `Projection.view`, `ViewBlock` | 1          |
| link                          | The source block that gave a view block.                                                                                                                                  | `ViewBlock.sourceId`           | 1          |
| part                          | A view block that a source block gives alone, without its children. A block has no part (the format renders it as no text) or one part. More parts throw (see "Project"). | `partsOf`                      | 1          |
| invisible block               | A source block that no view block links to. The text cannot change it, thus it stays.                                                                                     | `Projection.invisibleIds`      | 1          |
| text block                    | A block of the parse of the client's text, in the stored form.                                                                                                            | `incoming`                     | 2          |
| pair                          | A view block and a text block that are the same block (see "Identity").                                                                                                   | `BlockPair`                    | 2          |
| row                           | What the target stage does with one text block: it is a source block that stays (`kept`), a new block (`new`), or it gives no block (`skipped`).                          | `TextRow`                      | 3          |
| target                        | The document as the text asks for it, with the data that the format does not show.                                                                                        | `TargetResult.target`          | 3          |
| hidden data                   | Data that the format does not show: IDs, some props and styles, a nesting, blocks that the format does not render.                                                        |                                | 3          |
| layout block                  | A block that only groups its children, for example a column list or a column.                                                                                             | `layoutRuleOf`                 | 1, 2, 5, 7 |
| `base`, `ours`, `theirs`      | The three sides of a three-way merge (see "The three-way merge"). The target stage and the document merge give them different documents.                                  | `merge/`                       | 3, 4       |
| result                        | The target after the merge (stage 4) and the fit (stage 5). The operations change the current document into the result.                                                   |                                | 5          |
| operation                     | One change of the result, by block ID: an update, an insert, a move or a removal.                                                                                         | `BlockOperation`               | 6          |

## Laws

The tests examine these laws (`api.laws.test.ts`, and `api.properties.test.ts` on random documents):

- **GetPut**: if a client writes back the text that it read, there are no operations. This is also true for text in which only the markup changed and the format gives the same blocks, for example `*` and `-` bullets.
- **PutGet**: if the document did not change after the client read the text, a read after a write gives the written text. Two texts are equal if their canonical forms are equal. The canonical form is the result of round trips (parse, then serialize) until the text does not change.
- **PutTwice**: if a client writes the same text two times, the second write gives no operations.
- **Retention**: blocks that an edit does not touch keep their ID, type, props and content.

With concurrent changes (a write with an older `base`), PutGet is not true. The laws are then (`api.concurrent.test.ts`, also on random groups of writers, and `yjs/yDocText.test.ts`):

- **No revert**: a write of the text from `base` without changes gives no operations.
- **No lost updates**: changes of other writers to blocks that the text did not change stay. Two changes at different positions in one paragraph also stay. A block that another writer moved, dragged or fully rewrote is found by its ID.
- **Conflicts**: see the rules below.

## Concurrent writes

The pipeline computes the target of the text for `base`. With `merge: "lens"` (the default, and the only merge without Yjs), the target merges three-way with the current document (`merge/document.ts`, below). The diff of the current document and the merged document gives the operations. With Yjs, they apply to the bound editor, and the binding writes them to the Y.Doc.

Limits of y-prosemirror v13, also between two editors without the lens:

- A move is a removal and an insert. Thus, if two writers move the same block, the Y.Doc can have the block two times, with the same ID. An editor that reads such a Y.Doc gives the two blocks new IDs (UniqueID), but it does not write these IDs to the Y.Doc. The lens pairs blocks by ID, thus it throws for a current document or a base with two blocks with one ID, and the Y.Doc does not change (see "Items that are not done").
- Yjs does not know the schema: as in each client, y-prosemirror removes the content of a merged document that does not fit the schema. For example, the children of a block are in one block group, which must have a child. If two clients add the first child of one block at the same time, or a client removes the last child of a block while another client adds a child to it, the merged block group can be lost, with these children.

With `merge: "yjs"`, Yjs merges the write itself. The operations for `base` apply to a fork of the Y.Doc at `base` (`ForkYDocExtension` of core). Then Yjs merges the fork into the Y.Doc. The operations of the result are for `base`. There are no conflicts and no rebase warnings:

- Yjs keeps the inserts of the two writers. If two writers replace the same word, the result has the characters of each writer. The client IDs select their order.
- For a prop or a style, one of the two values stays. The client IDs select it. Thus, the result of a conflict is not always the same.
- A removal removes the changes of other writers in the removed block.

These limits of y-prosemirror v13 apply to each write with `merge: "yjs"`:

- A move is a removal and an insert. Thus, if two writers move the same block, the block is there two times. A change of another writer to a block that the text moves is lost. A change of the text to a block that another writer moved is also lost.
- A split and a join of blocks are a removal of text and an insert. Thus, a change of another writer to the moved text is lost.
- A change of the type of a block replaces its content node. Thus, a concurrent change of its text is lost. If two writers change the type, the block can lose its content.
- The layout blocks stay, also if they become empty (`keepLayout`). The reason: Yjs cannot merge the removal of a column with a block that another writer adds to it. An empty column gets the fill of the schema (an empty paragraph).
- A write from a base without content uses `"lens"`. The reason: a fork of an empty document gets its own root block group, and Yjs cannot merge two new root structures.

The tests for the move limit are marked as known failures (`it.fails`). A Yjs binding with nested blocks (each block with a link to its parent) and one shared text can remove the first three limits. Then these tests pass, and vitest gives an error for each `it.fails` test that passes: remove its mark.

The three-way merge of the documents (`merge/document.ts`) uses the block IDs. `base` is the document that the client read, `ours` is the target, and `theirs` is the current document:

1. **Which blocks stay.** A block of the target stays, unless another writer removed it (warning `change-to-removed-block` if the client changed or moved it). A new block of another writer stays if its parent stays. A block that the client removed goes, unless another writer changed it, or a block in it that the client also removed: then that block stays (warning `removed-changed-block`). The other blocks in it that the client removed go. Thus, a write from an older version does not remove a change that it did not see. A new block next to a block is not a move of that block.
2. **The parent.** The parent of the side that changed it (the current parent if both sides changed it in different ways). If that parent goes, the block goes to the place of that parent. Examples are a block that the client keeps in a block that the client removes, and a new block of the client in a block that another writer removed. The merge does not know the schema. If the new parent cannot hold the block (for example a column list and a paragraph of a removed column), the fit of the result (`fitLayout`) moves the block to after that parent, and a column outside a column list becomes its blocks. If the parents of the two sides make a cycle (each side moved a block into the other), the current parents win.
3. **The order.** For each parent, the lists of child IDs merge three-way (`diff3`). Thus, a move that both sides made happens one time. A block that one side moved goes to the place of that side. If both sides add blocks at one position, both stay: the blocks of the client first.
4. **The fields.** Each field merges three-way (`merge/block.ts`).

**Conflicts.** A conflict is a value that `ours` and `theirs` both changed from `base`, in different ways. One value is a range of characters, one style or link, one prop, the type, one table cell or row, the parent, or the place in the parent. Then `theirs` stays, and the client gets a warning. The client gets the warning, thus `ours` loses the conflicting part: the client can read the document again and write again. Thus, a write from an older version never reverts a change that it did not see.

| Conflict                                 | Example                                                                                                   | Result                                    | Warning                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------- |
| Text: the same characters                | `ours` and `theirs` change the same word, or `ours` changes a word in a sentence that `theirs` removed    | the text of `theirs` stays                | `conflicting-change`      |
| A style or a link on the same characters | `ours` and `theirs` give a word different text colors                                                     | the style of `theirs` stays               | `conflicting-change`      |
| A prop                                   | `ours` and `theirs` change the level of a heading to different values                                     | the value of `theirs` stays               | `conflicting-change`      |
| The type                                 | `ours` makes the block a heading, `theirs` makes it a bullet                                              | the type and the content of `theirs` stay | `conflicting-change`      |
| A table cell or row                      | `ours` and `theirs` change the same cell                                                                  | the cell or row of `theirs` stays         | `conflicting-change`      |
| The parent                               | `ours` and `theirs` move the block into different parents, or each moves a block into the other (a cycle) | the parent of `theirs` stays              | `conflicting-change`      |
| The place                                | `ours` and `theirs` move the block to different places in one parent                                      | the place of `theirs` stays               | `conflicting-change`      |
| A change and a removal                   | `ours` changes or moves a block that `theirs` removed                                                     | the block stays removed                   | `change-to-removed-block` |
| A removal and a change                   | `ours` removes a block that `theirs` changed, or that has a new block of `theirs` in it                   | the block stays, as `theirs` has it       | `removed-changed-block`   |

These are not conflicts. Both changes stay, with no warning:

- Changes to different blocks.
- Changes to different parts of one block: different words, different styles (bold in `ours`, italic in `theirs`), or different props.
- The same change in `ours` and `theirs`: it applies one time.
- Two inserts at one position: both stay, the blocks of `ours` first.
- A new block of `theirs`: it stays if its parent stays.
- A new block of `ours` in a block that `theirs` removed: it goes to the place of that parent.
- A block that `ours` removed and `theirs` only moved: it goes. A move is not a change of the block.

With `onConflict: "reject"` (`WriteFromVersion`), a write with a conflict (any `MergeWarning`) does not apply: the result is `{ error: "conflict", conflicts }`, and the document (or the Y.Doc) does not change. The default is `"keep-current"`. The type allows `onConflict` only with `base`.

A block that its parent in the result cannot hold goes to after that parent. A column outside a column list becomes its blocks. An example is a new column of the client in a column list that another writer removed. Then the layout rule (`fit/fitLayout.ts`) applies to the result of the merge, and the diff of the current document and that result gives the operations.

PutPut (two writes give the same result as the last write) is not true. For example, if a client removes a block and adds it again, the result is a new block.

## Identity: which block is the same block

The identity of a block follows the location of its text, not the similarity of its content (`alignment/`):

1. One word diff of the texts of all blocks finds the overlap of each pair of blocks (with anchors: words that are in each side one time, the patience method). Each block starts with a token for its key: its text, or for a block without text (for example an image) its type, props and content. If the key is unique, the diff uses it as an anchor. Thus, a block with an equal text aligns as one block. Two blocks match if they prefer each other, and the overlap is at least half of the shorter text. A block of the view prefers the block of the text with the largest overlap. A block of the text prefers the block of the view that it covers best (the largest part of the text of that block). The diff aligns the most words. Thus, a paragraph with eight new sentences stays the same block, with its ID and props, and changed blocks stay aligned when a block moves past them.
2. Of the blocks without a match, two blocks match if they have an equal key that no other block without a match has, on either side. The key is the text, or, for a block without text (for example an image), its type, props and content. Blocks with empty text do not count. Thus, a block that the text moves keeps its ID, props and comments. The target then has the block at its new position, and the diff moves it.
3. If one block on each side stays between two matches of rule 1 (the moved blocks do not count), the two blocks have the same position. They match if their content has the same shape (text, table, or the same type without content). Thus, a paragraph with fully new text at the same position stays the same block.

An equal text is a stronger sign than a position. Thus, a moved block does not match a different block at its new position.

Known limit: rule 1 runs before rule 2. Two blocks that swap places match by position if unchanged blocks are between them and the two blocks share at least half of the shorter text. Example: "Note: see above" and "Note: see below", with other blocks between them. The unchanged blocks are anchors of the diff, thus each moved block is in a gap with the other block, and rule 1 matches them. The text of the result is correct, but the IDs, props and comments stay at the positions: the result is a change of some words in each block. A swap of adjacent blocks, or of blocks with less in common, keeps the IDs (see `alignment/alignBlocks.edge.test.ts` and `api.swaps.test.ts`).

A split paragraph keeps its ID on the part with the most of its text. Two joined paragraphs keep the ID of the first paragraph. A block that moved and also changed gets a new ID.

## The three-way merge

All merges in `merge/` use one rule and one vocabulary (`merge/threeWay.ts`):

- `base`: the common start of the two sides.
- `ours`: the side that makes the change. Its difference from `base` is the change to apply.
- `theirs`: the side that gets the change. It can have data that `base` does not show, and changes of other writers.

If `ours` is different from `base`, the result is `ours`. If not, the result is `theirs`. In the target stage, `base` is the view block, `ours` is the block from the text, and `theirs` is the block in the document. In the document merge, `base` is the block at the version that the client read, `ours` is that block with the update, and `theirs` is the current block.

In the target stage, this merge is the transport of the edits from the view to the text onto the document. The view is the document as the format shows it. Thus, where the text did not change the view, the document block stays as it is, with the data that the format does not show. The rules for that data are rules of the transport:

- A changed region (between two units that the three sides have) takes the text of the client. This is the rule of `diff3` for a changed chunk. A transport of single edits through links from each view character to a document character does not work: the format removes and changes whitespace, thus these links are partial.
- An item that the format does not show stays (`keepTheirs` in `merge/inline.ts`).
- The shadow of an item links its text in the view to the item (see below).
- New text gets the hidden styles and the link of the text that it replaces (see below).

In the document merge, `theirs` contains the changes of other writers. There, the same merge is a three-way merge of two sets of changes.

The merge of a block (`merge/block.ts`) merges the type, each prop of the three blocks, and the content. It merges inline content character by character (diff3, `merge/inline.ts`), and tables row by row and cell by cell (`merge/table.ts`). The characters align by words first, then by characters between the matched words. A word token has no whitespace, thus a word matches at each position. New text that replaces old text gets the hidden styles and the link of the old text, if all the old text has them. Thus, a changed word keeps the hidden underline of the word that it replaces. Inserted text gets such a style only if the text on its two sides has it. Thus, new text at the edge of a styled run does not get the style. This is also true at the start and at the end of the content: for example, text after a link at the end does not become a part of the link. Some formats show custom inline content as text (markdown shows a mention as "@Bob"), and the parse gives back only that text. In the target stage, the merge then uses that text as a shadow of the item: the characters of one serialize and parse of the item alone. If the text keeps all characters of the shadow, the item stays. If the text changes them, the text replaces the item.

## Pipeline

1. **Project** (`projection/`): render the source document (`base`, or the current document for `base: "current"`) and parse it back:

   ```
   view  = parse(serialize(document))
   parts = for each source block: parse(serialize(the block alone))
   links = linkBlocks(parts, view)
   ```

   - The _view_ is the document as the format shows it. The format loses the block IDs, and it does not always give one view block for each source block. The source of each _part_ is known, thus the parts give the links, and the links do not depend on a similarity of texts.
   - A block that the format renders as no text (for example an image without a URL, in markdown) has no parts: it is an invisible block. A block that the format shows as more than one block throws (`assertOnePartEach`): the export of its block type must read back as one block, or as no block. This is a bug of a custom block type: the default blocks give one block at most in each format. Plain text writes a blank line in a block as one newline, because a blank line would start a new block; the blank line is then data that the format does not show.
   - A layout block (for example a column) is not a document without its children (the parse fills it with new blocks), thus its part is the block itself.
   - In the round trip, each block is between two separator paragraphs. The separators keep the blocks apart.
   - `linkBlocks`: the view blocks link to the parts, blocks with equal keys first (see `alignmentKey`), then the blocks between them in order, if the two sides have the same number of blocks. The two lists come from the same blocks, thus they are different only where the format renders a block differently in the full document.
   - `partsOfEachBlock` is the definition of the parts: one round trip for each block. `partsOf` gives the same projection faster, with two optimizations (`api.fuzz.test.ts` compares the two on random documents). (1) A block that the view shows as it is (the view block at its place has the same key) is its own part, without a round trip. This needs a property of the format: the round trip of such a block alone gives one block with the same key. The three formats have this property. A format that hides a block with text can break it (see `shownBlocks`). (2) The other blocks make one round trip together, with a separator paragraph between two blocks. The separator contains only a character (or two characters) that the text does not contain.
   - The _shadow_ of an inline item (`projection/shadows.ts`) is the text that the format shows for an item that its parse does not give back, for example "@Bob" for a mention in markdown. The merge of stage 3 uses it.
   - No cache keeps the text or the projection between calls: a server makes a new editor for each request, and a cache would keep a document in its memory for each editor and format. Thus, each write serializes and projects its source (see the performance pass in "Items that are not done").

2. **Parse** the text of the client (`parse/parseText.ts`): a byte order mark at the start goes, and the blocks are in the stored form (or the result is `invalid-document`). The view of stage 1 uses the same parse. Then the lens examines that the format shows each block of the parse (`projection/assertBlocksRoundTrip.ts`): the round trip of the block alone gives a block. A format that breaks this rule has a bug, and the write throws. Else, the write would add such a block, the view would not show it, and each later write of the same text would add it again. Thus, the text blocks are in the form of the view blocks. Then **align** them with the view (`alignment/`, see the identity rules above).
3. **Target** (`target/`): the target document, the source as the text asks for it, as Block JSON with IDs. Three passes:
   1. The correspondence (`target/correspond.ts`): one _row_ for each text block. A text block with a pair is a source block that stays (`kept`), or the pair of a view block without a link (`skipped`). Other text blocks are `new`. The correspondence also gives the source blocks that stay (the kept blocks, and the invisible blocks that the text cannot remove), and the warnings.
   2. The fields (`target/targetFromPairs.ts`): a kept block merges its fields three-way (`base` is the view block, `ours` is the text block, `theirs` is the source block). A new block has the fields of the text block, and gets a new ID.
   3. The nesting (`target/buildTargetDocument.ts`): the blocks go in the order of the text, in the parent that the text shows. First, `decideParents` (`target/hiddenNesting.ts`) decides the parent of each block, with a stack of the open ancestors: the result is a list of build steps ("this block goes into that parent"). Then the build applies the steps. Three rules keep data that the format does not show:
      - A block keeps a nesting that the format does not show (for example a paragraph in a paragraph, in markdown, or a paragraph in a bullet, in HTML). The conditions are: the text did not change its parent, the parent has the same type, and the parent is still open. There is one exception to the first condition: if the text moves the block together with its hidden parent, the block stays in that parent. Then the view and the text show the two blocks as siblings. An example is a hidden child of a paragraph in a list item, if the text changes the type of the list item. A new block before such a block goes into the same nesting. Thus, the child stays nested. A kept block also goes into the nesting of the next block if it would close a hidden block that the next block needs. An example is a top-level paragraph that the text puts between the blocks of two columns. The same is true for a kept block whose source parent is closed. A block that the text moves (rule 2) keeps its hidden nesting only near that nesting: one of its hidden ancestors is open, or the next kept block is in one of them. For a block without hidden ancestors, that nesting is its source parent: the block is near it if that parent is open, or if the block is at the top level (for example a swap of two items of a list in a paragraph). Else it goes where a new block goes. Thus, a block that the text moves out of the columns does not take the column list with it.
      - List items that the text shows as one list share the parent of that list (`listParent`). The parent can be a nesting that the format does not show, for example a paragraph with a list in it. Two list items are in one list if they are adjacent in one text parent, and both are numbered items, or both are bullet, check or toggle items (as the exporters of core group them). A new block, or a kept block that the text puts into a different parent, goes into the parent of the list item before it in its list, if that parent is open. Thus, a new item at the end of a list in a paragraph joins that list, and an item that the text outdents out of an earlier item of such a list stays in the list, with the next items. A block that the text does not show in the list (for example a paragraph after the list) keeps the other rules.
      - Blocks that the format does not show stay at their positions, with their parent. If the target stage removes their parent, it also removes them. An empty block (for example an empty paragraph) also goes if the target stage removes all the visible blocks around it. A hidden block with data (for example a table or an image in plain text) stays, because the text cannot show it.
4. **Merge** the target with the current document, if `base` is older (`merge/document.ts`, see "Concurrent writes").
5. **Fit** the result to the schema (`fit/fitResult.ts`). Else ProseMirror or the table plugin adds blocks or cells that the text did not ask for.
   - The layout blocks change to fit their child rules (`fit/fitLayout.ts`, for a text and for JSON). A column without blocks goes, and a column list with one column becomes the blocks of that column. ProseMirror would fill them with new empty blocks. A layout block that does not dissolve (`children.dissolve: false`, for example a tab set; only a custom schema has one) goes if none of its children has blocks. If too few of its children have blocks, the schema wins over the text: the first empty children stay, up to the minimum, and the apply fills each one as the editor does (a tab gets an empty paragraph). Thus, the next read shows an empty paragraph that the text did not have. For a write from an older version, the rule applies to the result on the current document, not to the target. The reason: there, an empty column of the client can have blocks of other writers. The document merge gives the result, and the layout fit of that result gives more operations. With `merge: "yjs"`, the layout blocks stay, also if they become empty (see "Concurrent writes").
   - Each table that the write changed fits the rules of a table (`fit/fitTable.ts`): a short row gets empty cells, and if the spans do not fit on one grid, the table loses its merged cells (warning `merged-cells-removed`). A table that is equal to the table with its ID in the current document stays as it is (`fitChangedTables`), also with a short row (for example after a markdown import). The table plugin of the editor also fits only the tables that a transaction changes.
6. **Diff** (`operations/diffDocuments.ts`): the operations that change the current document into the target (or into the merged document). An update for each block with changed fields. In each parent, the blocks that keep their order stay (a longest common subsequence of the child IDs). Each other block goes after the block before it: a move, or an insert for a new block. The deletes come last. Thus, the blocks that stay moved out of the removed blocks first. A block that changes between a layout block (a column or a column list) and a block with content gets a new ID first (`operations/layoutChanges.ts`): an update cannot change such a block in place, thus the diff removes it and inserts the new block. The blocks in it keep their IDs.
7. **Apply** the operations to a ProseMirror transaction (`operations/applyOperations.ts`). An update changes the block in place: the type and props through `updateBlockTr`, and inline content through the smallest ProseMirror steps (a `ReplaceStep` for each changed run, and mark steps for style changes). Thus, unchanged text keeps its identity and its comments. The inserts, the moves and the removals give the structure of the result (`operations/applyToBlocks.ts`, a pure function). Then `operations/applyStructure.ts` first decides the replacements, then applies them: in each list of children, the children that stay keep their nodes, and each run of changed children between them is replaced in one step: with the ProseMirror nodes of the blocks that the document has (a moved block keeps its node, with its comments), and new nodes. Thus, an insert is one step that only inserts, and a move is a removal and an insert. A collaboration binding, a suggestion plugin and the selection see only the changed blocks. The steps that make a list longer apply first, thus each step gives a valid document, also for a column list. Only a list that must have children and has none (a document without blocks, or a column that the operations of a caller, or of `merge: "yjs"`, empty) gets the fill of the schema.

8. **Dispatch** the steps to the editor (`operations/dispatch.ts`). For an editor that is not bound to a Y.Doc, a write is one transaction, thus one undo reverts it.

   For a Y.Doc, `updateYDoc` writes through an editor that is bound to the Y.Doc, as a client. The y-prosemirror binding reads and writes the Y.Doc, as for each other client. Thus, the lens has no reader or writer of its own for Yjs. The editor must be mounted, because y-prosemirror makes its binding in the editor view. Give the editor the schema and the extensions of the other clients (for example comments). The reason: when an editor binds to a Y.Doc, y-prosemirror removes the content that its schema cannot read. For each transaction, y-prosemirror writes one diff for each text block, from the first changed character to the last. For a paragraph with two changes, that diff replaces the text between them. Yjs then moves a concurrent change of another writer there. Also, y-prosemirror compares a list of children only from its start and from its end, and writes the children between the first and the last change in place, one by one. Thus, with an insert and another change in one list in one transaction, a block can get the content of a different block, and a change of another writer goes into the wrong block. Thus, the steps go to the editor in these transactions (`dispatchSteps` in `operations/dispatch.ts`): the steps that change one block (its text, its props or its type) in groups in which no two steps change the same block, and each step that changes a list of children (an insert or a removal of blocks) alone. Each write of the lens to an editor that is bound to a Y.Doc (it has the "ySync" extension) uses these transactions: also `updateDocument` and the JSON write. Between two transactions, plugins can change the document (for example the unique ID extension). Then the later steps move to the changed document, as in prosemirror-collab. Each write of `updateYDoc` goes to a fork of the Y.Doc (`ForkYDocExtension`), a fork of the current Y.Doc. Only a write without an error goes into the Y.Doc. Thus, a write that fails in the middle does not change the Y.Doc. The other writes to a bound editor (`updateDocument` and the JSON write) do not use a fork. If an exception occurs between two groups, the groups before it stay in the Y.Doc. For an atomic write, use `updateYDoc`. Then each Yjs change is as small as its step, as for a user who types. A write that changes the text of many blocks one time each is one transaction.

## Modules

Each module imports only modules that are before it in this list. Thus, there are no import cycles.

Each folder has an `index.ts` with its API for the other folders. A file imports a file of a different folder only through that `index.ts`. The other files of a folder export more only for their unit tests. The folders of the stages are at the top level. The block model is `model.ts`. Code that is not a stage, and that more than one stage uses, is in `util/`.

- `util/sequence/`: the matches of two sequences: the Myers match (in linear space, with a work limit), the anchored match (the patience method) for large inputs, the gaps between matched pairs, and the match of two texts by words and characters. Many stages use them, for example Parse and align (2), the merges (3 and 4) and Diff (6). This module does not import BlockNote.
- `model.ts`: the block model of the lens: the block JSON types (`LensBlock`, `FlatBlock`, ...) and their type guards. All stages use it. It imports nothing.
- `util/blocks/`: functions on the blocks of the model: flat lists of blocks, JSON equality, the update between two blocks, `BlockIndex` (the parent and the children of each block, by ID), the check of the block IDs (`ids.ts`), the schema rules, and the grid of a table (`tableGrid.ts`). All stages use them.
- `fit/`: stage 5 (Fit): the fit of the result (`fitResult.ts`): the layout blocks (`fitLayout.ts`) and the tables (`fitTable.ts`). The parse of stage 2 also fits the tables of the text, as the table plugin of the editor does (`formats/stored.ts`).
- `formats/`: `TextFormat` (`serialize` and `parse`), with markdown, HTML and plain text. Stage 1 renders the view with it, and stage 2 parses the text.
- `parse/`: stage 2 (Parse): the parse of a text into blocks in the stored form (`parseText.ts`; the view of stage 1 uses it too), and the blocks of the JSON of a client, with IDs that identify one block each (`parseJSON.ts`).
- `alignment/` and `merge/`: the identity of blocks (stage 2, and the links of the view in stage 1), and the three-way merges (the fields of each kept block in stage 3, and the documents in stage 4).
- `projection/`: stage 1 (Project): the view of a document, its links to the source blocks, and the shadows of inline items. Also the other round trips through the format: the check that the format shows each block of the parse of a text (`assertBlocksRoundTrip.ts`, used in stage 2).
- `target/`: stage 3 (Target): the target document of a text change (`targetFromPairs.ts`).
- `operations/`: the operation types, and the stages 6 to 8: the diff of two documents (Diff, `diffDocuments.ts`), the ProseMirror steps (Apply, `applyOperations`, public: it applies the operations to a transaction of the caller), and the dispatch of the steps to an editor (Dispatch, `dispatch.ts`).
- `api.ts`: the entry point. It runs the stages.
- `yjs/`: the API for a Y.Doc. It selects the target document, and writes the steps to it.

## Rules of the code

- **Module order.** Each module imports only modules that are before it in the list above. The lint rule `import/no-cycle` finds import cycles in this folder (`vite.config.ts`). It does not examine the order of the list: that is a rule for the review.
- **The API of a folder.** A file imports a file of a different folder only through the `index.ts` of that folder (the lint rule `no-restricted-imports`, `vite.config.ts`). Tests, `testUtil/` and `benchmarks/` can import each file.
- **The API of a folder in each file.** An export of a file is in the `index.ts` of its folder (the API of the folder), or it has `@internal` in its doc comment, never both. In the top folder, `index.ts` and `yjs/index.ts` are the public API of the package. Thus, a reader of a file sees which exports the other folders can use. The lint rule `lens/folder-api` (`packages/xl-ai/lint/lensPlugin.js`) keeps this true. oxlint has no rule for it, and knip does not know folders: it finds only the exports that no other file uses.
- **The order of the declarations in a file.** First the API of the folder, then the `@internal` exports, then the declarations without an export. In each group, a caller comes before the functions that it calls. Variables (`const`, `let`) can stay where they are, for example at the top: a variable that another top-level value uses must come first. Two lint rules keep this true: `perfectionist/sort-modules` (the exports first; its autofix moves the declarations) and `lens/api-before-internal` (the API before the `@internal` exports).
- **Special cases at the edges.** A stage has a small core, and the special cases of the formats and the schema are at the edges of the pipeline. For example, only the projection (a layout block is its own part), the fit, and the apply (the ProseMirror nodes of a layout block) know the layout blocks. The alignment, the target stage, the merge and the diff do not.
- **Decide, then build.** The target stage first decides the rows of the correspondence, and the document merge first decides the blocks that stay, their parents and the order of the children. The build of the target document first decides the parent of each block (`decideParents` in `target/hiddenNesting.ts`: the steps of the build). Then they build the document from the decisions.
- **An optimization has a definition.** A fast version of a function has a simple version that defines the result, and a test that compares the two. An example is `partsOf` and `partsOfEachBlock` (`api.fuzz.test.ts`).
- **Expected failures are values.** A text or JSON that does not fit the schema gives `{ error: "invalid-document" }`, and a rejected conflict gives `{ error: "conflict" }`. An exception is a bug (a broken invariant).
- **Limits.** In this folder, a function has size limits: at most 15 paths (the rule `complexity`), a nesting of at most 4 blocks, and at most 80 lines of code (`vite.config.ts`). A function above a limit has a disable comment with the reason. The Myers and the diff3 algorithms are standard algorithms behind small interfaces, thus their files have no limits. No other function has an exception.
- **The method of an algorithm.** The doc comment of each algorithm tells if it is a standard method (with its name) or our own design, and on which standard methods it builds.
- **Terms.** Each term has one meaning (see "Terms").

## Tests and benchmarks

- Each module has a unit test file next to it (`file.ts` and `file.test.ts`).
- The tests that do not need a DOM run in the node environment (`// @vitest-environment node`). The other tests run in jsdom: the markdown and HTML conversions of BlockNote need a DOM, and the binding to a Y.Doc needs a mounted editor view.
- The `api.*.test.ts` files examine the full pipeline:
  - `api.laws.test.ts`: the laws, on two documents, in the three formats.
  - `api.stages.test.ts`: the data of each stage (the view, the pairs, the rows, the operations) for core examples, as snapshots (`testUtil/stages.ts`). The helper calls the stage functions of `api.ts` (`parseAndAlign`, `targetInputOf`, `updateFromTarget`), thus the snapshots show the data of the real write. Read them with the "Pipeline" section.
  - `api.properties.test.ts`: the laws on 200 random documents with random edits, in the three formats, on 100 random documents with columns, and on 400 random line edits in markdown. Each case has a seed, thus you can run a failed case again. The random edits change the blocks at the top level of each format (`testUtil/codecs.ts`). One HTML seed is not in the test, because of a known problem of core (see the test).
  - `api.markdown.test.ts`, `api.html.test.ts` and `api.plainText.test.ts`: examples in each format.
  - `api.nesting.test.ts`: the nesting of lists in markdown and HTML: the round trip of core, indents, outdents, moves, type changes, swaps, inserts, removals, empty items, numbered lists, toggles, lists in a nesting that the format does not show, and writes from an older version.
  - `api.nesting.property.test.ts`: random documents with nested lists (`testUtil/nestedRandom.ts`), with random edits of the nesting: the laws, the nesting that the text shows, and a model of the parent of each block (with the list rule). Also concurrent moves of two writers.
  - `api.json.test.ts`: the JSON API.
  - `api.removals.test.ts`: removals, where content is lost. Examine these expected results carefully.
  - `api.concurrent.test.ts`: writes from an older version without Yjs, also on 40 random groups of two to four writers in each format.
  - `api.fuzz.test.ts`: 150 random documents with all kinds of blocks (tables, files and images with captions, code blocks with blank lines, deep nesting, mentions, columns) in each format, with random edits. It examines the format contract (each view block with text links to a document block, and the round trip of a block that the view shows as it is gives that block alone) and the laws.
- `yjs/yDocText.test.ts`: the Y.Doc API: the write through a bound editor, the base as a Yjs state, the fork, the changes of other clients, and the same result as a write to an editor without Yjs, on random documents. The concurrent cases run for the two merges (`"lens"` and `"yjs"`). Some cases are only for `"yjs"`, because for `"lens"` they are the same as cases of `api.concurrent.test.ts`. The conflicts and `onConflict: "reject"` are only for `"lens"`. One HTML seed of the random documents is not in the test, because of a known problem of core (see the test).
- `testUtil/` contains the shared test documents and helpers.
- `benchmarks/largeDocuments.bench.ts` measures documents of 1,000 to 10,000 blocks in each format, and each stage of the pipeline. The normal test run does not run it. Run it from `packages/xl-ai` with `vp test bench --run --silent=false src/api/v2/benchmarks`. The median times of 3 runs in jsdom for 10,000 blocks were:

  | Format     | Read | Write with one change | Write from an older version | Y.Doc write | Align, target and diff |
  | ---------- | ---- | --------------------- | --------------------------- | ----------- | ---------------------- |
  | Markdown   | 6 ms | 1,656 ms              | 1,725 ms                    | 8,752 ms    | 91 ms                  |
  | HTML       | 7 ms | 1,516 ms              | 1,527 ms                    | 7,908 ms    | 90 ms                  |
  | Plain text | 9 ms | 170 ms                | 187 ms                      | 3,791 ms    | 73 ms                  |

  These times are from before the cache of the text and the projection went: the read came from the cache. The performance pass measures again (see "Items that are not done"). The times depend on the machine, and at 10,000 blocks they also change between runs: for example, the HTML write from an older version took 6,902 ms in one run of all sizes, and 1,527 ms in a run of only this size. Run the benchmark again for a comparison.

  Before each run, the benchmark lets the event loop turn. The reason is jsdom, not a memory leak: for each `<details open>` element (the export of a toggle block), jsdom starts a timer for the `toggle` event. Until the timer runs, it keeps the element and the full exported DOM tree. After one turn of the event loop, the memory is free. In Chromium, the memory is also free after the task.

  The stages of the lens (align, target, diff) are linear in the number of blocks. A Y.Doc write sends each insert or removal of blocks in its own transaction (see "Dispatch"), and y-prosemirror compares the document for each transaction. Thus, a Y.Doc write with many inserts or removals at different places takes time for each of them: for example, 0.7 s for 200 inserts in 2,000 blocks, and 8.7 s for 800 inserts in 8,000 blocks. For a Y.Doc, most of the time is the render of the editor view in jsdom. For text, most of the time goes to the markdown and HTML conversions of BlockNote: the projection makes one round trip of the document (the view) and one round trip of the blocks that the view does not show as they are (see "Project"), and the write parses the text of the client.

- `benchmarks/alignment.bench.ts` measures `alignBlocks` with real text: the time, and the number of correct pairs, from one changed block to a full rewrite. By default, the text is the docs (about 50,000 words). For larger documents, give a file of more text in `TEXT_LENS_BENCH_CORPUS`. With 400,000 words of real text (the docs and the READMEs of the dependencies), in 4,000 or 10,000 blocks: one changed block took 3 to 6 ms, a change in each block 1.0 to 1.6 s, and all blocks in a random order 1.5 s. The equal blocks at the start and at the end do not go to the word diff, and the word diff (`anchoredMatch`) has one work limit for the full input. In a similar measurement before these two changes, one changed block took about 0.9 s, and all blocks in a random order 12 to 16 s: the work limit was for each gap between two anchors, and real text gives many large gaps.
- Coverage of the unit tests (all tests except `api.*.test.ts`), from `packages/xl-ai`: `vp test --run --coverage.enabled "--coverage.include=src/api/v2/**/*.ts" "--coverage.exclude=**/*.test.ts" src/api/v2/util src/api/v2/alignment src/api/v2/merge src/api/v2/operations src/api/v2/target src/api/v2/fit src/api/v2/formats src/api/v2/parse src/api/v2/projection src/api/v2/yjs`. On 10 November it was 95% of the statements and 92% of the branches. A high coverage does not show the edge cases: the bugs that the `*.property.test.ts` and `*.edge.test.ts` files found were in covered lines. These files compare the algorithms with simple references, test all small inputs, and test the laws of each merge.

## Changes outside this folder

- `packages/xl-ai/package.json` has the subpath exports `./text-lens` and `./text-lens/yjs`, and `yjs` as an optional peer dependency. `packages/xl-ai/vite.config.ts` has their build entries.
- `packages/core`: the markdown and HTML round trip fixes of the branch `fix/markdown-roundtrip` (see "Problems in BlockNote").

## Warnings

A result can contain warnings (`ChangeWarning`). A warning tells you that a part of the text did not apply as written, or that data was lost:

- `unlinked-block-changed`: the text changed a part of the text that does not come from one document block (`text` is that part). The change does not apply. An empty block of the view without a document block gives no warning, because the text cannot change data of it.
- `block-shape-replaced`: the format shows the block with content of a different shape (for example a table as lines of text), and the text changed that content. The block takes the type of the text block. Its old content is lost.
- `change-to-removed-block` (merge): the text changed or moved a block that another writer removed. The change does not apply.
- `removed-changed-block` (merge): the text removed a block that another writer changed (or a block in it). The removal does not apply to the blocks with a change of the other writer: they stay.
- `conflicting-change` (merge): the text and another writer changed the same part of a block (a part of its text, a style, a prop, its parent or its place) in different ways. The change of the other writer stays there, and the change of the text there does not apply. An example is a block that another writer rewrote, or split into two blocks.
- `merged-cells-removed`: a table lost its merged cells. A format without merged cells (markdown, plain text) shows them as separate cells, thus a change of the table there removes them. A table whose merged cells do not fit the rows of the result loses them too.

## Problems in BlockNote

The branch `fix/markdown-roundtrip` fixes these problems:

- The markdown round trip: one round trip now gives the canonical form, and the parse removes the whitespace that the exporter does not write.
- The HTML export of a toggle with list items and other blocks as children changed their order.
- The HTML parse of a list item with blocks around a nested list moved these blocks out of the list item.
- In markdown, the caption of a file in a list item joined the next paragraph.
- In markdown, an image, a video or an audio block without a URL exported as nothing, but the parse of a figure without `src` gave such a block. Now, with a caption, it exports as that figure.
- In HTML, two adjacent file links (a file block without a caption, or media without a preview) became one paragraph.
- Each markdown parse made a new HTML document. In jsdom, each parse then became slower than the one before.
- An HTML tag of a media block without a source (for example `<img>` in markdown) gave a block without a URL, which the markdown export does not show. Thus, each later write of the same text added the block again. Now such a tag gives no block (with a caption, it still gives the block).
- In HTML, the export of a paragraph with only white space was `<p> </p>`, and the parse dropped it. Now the export writes the placeholder character, as for an empty block.
- In an editor without a view, a new block (for example the block that fills an empty document) got no ID: Tiptap adds the plugins only when the editor mounts. Now the ID plugin also runs without a view.
- The HTML parse (also of markdown) lost the start of a numbered list whose first item has a nested list: the parse rule read the start of the `div` that groups the item with its children, not of the list. This fix is newer than the base of the lens branch.
- A table cell span had no limit. A column span of 1,000,000 (in HTML or in JSON) overflowed the stack in the conversion to blocks (`nodeToBlock` spread an array of the span length), also for `editor.document`. Now the HTML parse limits the spans as the HTML table model does (1,000 columns, 65,534 rows), and the conversion uses a loop. The lens also rejects such a span in JSON (`parseJSON`). This fix is newer than the base of the lens branch.

These problems stay:

- The HTML export writes a prop of a block two times: as a `data-*` attribute and in the visible markup (for example `data-text-alignment` and `style="text-align: …"`, or `data-caption` and `<figcaption>`). The parse reads the attribute. Thus, a client that changes only the visible markup gets no change, and no warning. Change the `data-*` attribute too.

- Delimiter runs like `***`: the parser does not use the delimiter rules of CommonMark. The exporter writes underscores where it can (`*a*__b__`, `**a _b_**`), but not next to a letter or a digit, or for text with `_`. There, runs like `***` stay.
- HTML paste removes an image in a paragraph (markdown parse splits the paragraph around the image).
- The autolink plugin adds links to a change from Yjs (the change of another client, or the merge of a fork). If such a change covers more than one block, the plugin can link the last word of the first block. The editor then writes that link to the Y.Doc. The fix is a separate change of core ("autolink does not add links to a change from Yjs"). One HTML seed of `yjs/yDocText.test.ts` has this case.
- The HTML parse ignores `data-nesting-level`. Thus, HTML hides the nesting of the children of a list item only if a child that is not a list item comes first. If a list item becomes the first child of a list item, before such a hidden child, HTML then shows that nesting (PutGet is not true). A new list item after a list item goes into the parent of the list of that item (see "The nesting"), thus this case is rare. One HTML seed of `api.properties.test.ts` has this case.
- The markdown and HTML parsers use recursion for nested blocks. A text with a very deep nesting (for example 20,000 quote markers in markdown) overflows the stack. A server must parse untrusted text in a worker, with a time limit.
- The markdown and HTML export of a file block without a caption (or of media without a preview) is a link in a paragraph. The parse does not read it back as a file block. Thus, a change to such a block replaces it with the blocks of the text. With a caption, the export is a figure with the link, and the parse reads it back as one file block (media without a preview: as a file block, and the merge keeps the type of the block).
- Duplicate block IDs in a Y.Doc (for example after two clients move the same block). The unique ID extension gives new IDs to the copies in the editor. But y-prosemirror does not write these IDs to the Y.Doc, because the extension makes the change during the sync of a remote update. Thus, each client can show different IDs for these blocks.

## Items that are not done

- TODO: a pass on the performance, after all reviews (first the review, then the performance). The input: the benchmarks in `benchmarks/`, and a measurement before the cache of the text and the projection went (the docs text, 2,112 blocks): after a read, the cache saved a third of a markdown write and a fifth of an HTML write; for a second write from the same version, it saved two thirds. The cache went because it keeps a document in the memory of a server, and a server makes a new editor for each request. The pass must not add such memory again.
- Two blocks with one ID (REVISIT). A Y.Doc can have them after two writers moved the same block (y-prosemirror v13). The lens throws for a current document or a base with such blocks, and for JSON with them it gives `invalid-document`. Then the lens cannot write that document until a client fixes the IDs in the Y.Doc. An earlier version gave the later block the ID with a number (`x-2`) on each side of a write.
- A block that changes between a layout block and a block with content gets a new ID (REVISIT). Comments and links to the old ID lose their block. The alternative keeps the ID: the apply builds the new node of the block in the step that places it (see `operations/layoutChanges.ts`).
- Yjs v14 (`@y/y` and `@y/prosemirror`).
- IDs in the text.
- A split by another writer: the document merge merges each block by its ID. If another writer splits a block, and the client changes the text of the second part, the change of the client does not apply, with the warning `conflicting-change`: for the rebase, the other writer removed that text from the first block.
- A split in the text. The part with the most text keeps the ID, the props and the hidden styles. The other part is a new block, without the hidden props of the block (for example its color or its alignment).
- A join in the text. The first block keeps its ID. The hidden data of the second block is lost: its props, the hidden styles of its text, and the comments on its text.
- A split by the client, while another writer changes the part that goes to the new block (the part without the ID). The text of that part shows two times, with the warning `conflicting-change`: the block keeps the changed text (`theirs` wins the conflict), and the new block has the text of the client.
- A join by the client, while another writer changes the second block. The text of the second block shows two times, with the warning `removed-changed-block`: the second block stays with the change, and the joined block has the text of the client.
- The cause of the four items above: the merge pairs blocks by ID. A split or a join moves text from one block to another, and for the merge, that text was removed from one block and added to another.
- A block that another writer rewrote. If another writer changes almost all words of a block (for example the case of each word), the alignment of the old and the new text finds nothing in common. If the client also changes that block, the text of the other writer stays. The change of the client is lost, with the warning `conflicting-change`.
- In jsdom, the markdown export of many paragraphs in list items is quadratic, because each move of an element recomputes the index of its siblings.
- A block that the text moves and also changes. The lens does not find it. The block is removed and inserted again, with a new ID.
- Two similar blocks that swap places, with other blocks between them, keep the positions of their IDs and props (see "Identity", known limit). A fix: rule 2 (equal unique texts) before rule 1, without a change of the word diff.
- Table rows with a different number of cells. Examples are added or removed columns. The result for these rows is the row from the text, and the cell colors of these rows are lost.
- Merged cells in markdown and plain text. These formats show a merged cell as the cell and empty cells at the positions that it covers. A change of such a table removes all its merged cells (warning `merged-cells-removed`).
