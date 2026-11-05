# Text lens: write markdown, HTML or plain text back to a document

With this API, a client can read a document as text (markdown, HTML or plain text), change the text, and write it back. A write does not replace the document. It applies only the changes. Thus, the data that the format does not show stays. Examples are block IDs, colors, alignment, underline, toggles, empty paragraphs, the nesting that markdown removes, and comments on unchanged text.

In lens terms, the document is the source and the text is the view. The `serialize` function of the format is `get`. This folder supplies `put`.

## API

- `getDocumentText(editor, format)`: returns the document as text.
- `computeTextUpdate(editor, { format, text, base })`: returns the operations that change the document to agree with the text. The operations use block IDs. The result also contains warnings (a discriminated union). If the text gives blocks that do not fit the schema (for example an HTML table cell that spans more rows than the table has), the result is `{ error: "invalid-document" }`.
  - `base` is optional. It is the document (Block JSON) at the version that the client read. Get it from your version history. Without `base`, the text applies to the current document.
  - `onConflict` is optional, and only allowed with `base`: `"keep-current"` (the default) or `"reject"` (see "Concurrent writes"). With `"reject"`, a write with a conflict gives `{ error: "conflict", conflicts }`. The JSON and Y.Doc writes have the same option.
  - `experimentalTextMoves` is optional, and off by default (see "Experimental: splits and joins move text"). The Y.Doc write has the same option.
- `updateDocumentFromText(editor, { format, text, base })`: computes the operations and applies them: in one transaction, or for an editor that is bound to a Y.Doc, in groups (see "Apply"). First, the blocks without an ID get an ID (in an editor without a view, `removeBlocks` can leave such a block, and `editor.document` then shows a new ID on each read).
- `computeJSONUpdate(editor, { document, base })` and `updateDocumentFromJSON(editor, { document, base })`: the same for a full document as BlockNote JSON. The JSON contains the block IDs, thus the blocks pair by ID, not by text. Only the changed blocks and fields change, and with `base`, the changes of other writers stay. A field that the JSON of a block does not have gets its default value: send each block with all its fields (for example from `editor.document`).
  - A block without an ID is a new block. An ID can identify only one block. Thus, a block gets a new ID if an earlier block of the JSON has its ID. With `base`, a block also gets a new ID if another writer added a block with its ID after `base`.
  - If the JSON does not fit the schema of the editor, the result is `{ error: "invalid-document" }`, and the document does not change. Examples are an unknown block type, an unknown style, content in a block without content, and a prop value that is not in the prop schema of the type.
- `yjs/index.ts` (code in `yjs/yDocText.ts`), for a Y.Doc (Yjs v13). It is a separate entry point, thus code without Yjs does not load Yjs:
  - `updateYDocFromText(editor, fragment, { format, text, base, merge })`: writes the text back, through an editor that is bound to the fragment (`withCollaboration` of `@blocknote/core/yjs`) and mounted, as a client. `base` is the Yjs state (`Y.encodeStateAsUpdate`) at the version that the client read. The write first applies `base` to the Y.Doc: the client can read from a replica with an update that this Y.Doc does not have yet, and Yjs applies each update only one time. The result contains the Yjs update to send to the other clients, the operations and the warnings.
  - `merge` is optional, and selects what merges the text with the changes of other writers after `base` (`YDocWriteFromVersion`): `"lens"` (the default, the three-way merge of "Concurrent writes") or `"yjs"` (Yjs merges a fork of the Y.Doc at `base`, see below). The type allows `"yjs"` only with `base`, and without `onConflict`: Yjs has no conflicts.
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

The pipeline computes the target of the text for `base`. With `merge: "lens"` (the default, and the only merge without Yjs), the target merges three-way with the current document (`merge/tree.ts`, below). The diff of the current document and the merged tree gives the operations. With Yjs, they apply to the bound editor, and the binding writes them to the Y.Doc.

Limits of y-prosemirror v13, also between two editors without the lens:

- A move is a removal and an insert. Thus, if two writers move the same block, the Y.Doc can have the block two times, with the same ID. An editor that reads such a Y.Doc gives the two blocks new IDs (UniqueID), but it does not write these IDs to the Y.Doc. In a base, the lens gives a later block with the ID of an earlier block the ID with a number (for example `a-2`, as in `fixBlockIds`). Thus, a write never duplicates content.
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

The tests for the move limit are marked as known failures (`it.fails`). A Yjs binding with a block tree (each block with a link to its parent) and one shared text can remove the first three limits. Then these tests pass, and vitest gives an error for each `it.fails` test that passes: remove its mark.

The three-way merge of the trees (`merge/tree.ts`) uses the block IDs. `base` is the document that the client read, `ours` is the target, and `theirs` is the current document:

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

With `onConflict: "reject"` (`WriteFromVersion`), a write with a conflict (any `RebaseWarning`) does not apply: the result is `{ error: "conflict", conflicts }`, and the document (or the Y.Doc) does not change. The default is `"keep-current"`. The type allows `onConflict` only with `base`.

A block that its parent in the result cannot hold goes to after that parent. A column outside a column list becomes its blocks. An example is a new column of the client in a column list that another writer removed. Then the layout rule (`target/fitLayout.ts`) applies to the merged tree, and the diff of the current document and that tree gives the operations.

PutPut (two writes give the same result as the last write) is not true. For example, if a client removes a block and adds it again, the result is a new block.

## Identity: which block is the same block

The identity of a block follows the location of its text, not the similarity of its content (`alignment/`):

1. One word diff of the texts of all blocks finds the overlap of each pair of blocks (with anchors: words that are in each side one time, the patience method). Each block starts with a token for its key: its text, or for a block without text (for example an image) its type, props and content. If the key is unique, the diff uses it as an anchor. Thus, a block with an equal text aligns as one block. Two blocks match if they prefer each other, and the overlap is at least half of the shorter text. A block of the view prefers the block of the text with the largest overlap. A block of the text prefers the block of the view that it covers best (the largest part of the text of that block). The diff aligns the most words. Thus, a paragraph with eight new sentences stays the same block, with its ID and props, and changed blocks stay aligned when a block moves past them.
2. Of the blocks without a match, two blocks match if they have an equal key that no other block without a match has, on either side. The key is the text, or, for a block without text (for example an image), its type, props and content. Blocks with empty text do not count. Thus, a block that the text moves keeps its ID, props and comments. The plan then moves the block.
3. If one block on each side stays between two matches of rule 1 (the moved blocks do not count), the two blocks have the same position. They match if their content has the same shape (text, table, or the same type without content). Thus, a paragraph with fully new text at the same position stays the same block.

An equal text is a stronger sign than a position. Thus, a moved block does not match a different block at its new position.

A split paragraph keeps its ID on the part with the most of its text. Two joined paragraphs keep the ID of the first paragraph. A block that moved and also changed gets a new ID.

## Experimental: splits and joins move text

The option `experimentalTextMoves` is off by default. Without it, the rules above apply, and the merges pair the blocks by ID only. Thus, for a merge, a split or a join removes text from one block and adds it to another (see "Items that are not done"). With the option:

- **The first part of a split keeps the ID**, not the part with the most text (`alignBlocksAndMoves`). This is also the rule of the editor: Enter keeps the ID on the first part.
- **The moves.** The overlaps of rule 1 also show the text that moved from one block to another: an overlap of at least half of the shorter text, of two blocks that do not match, if one of them matches a third block. Examples are the second part of a split paragraph, and the second paragraph of two joined paragraphs. Such a block is a part of the other block. Thus, rules 2 and 3 do not give it a match.
- **The groups.** The blocks that the moves and their matches connect are a group. The content of a group merges as one text (`mergeGroupContent` in `merge/group.ts`): the content of its blocks in order, with a break at the start of each block. A split is a new break, and a join is a removed break. The breaks align by their place in the text, and the ID of a break that the three sides have merges three-way. A group has blocks with content of one kind (inline or plain) only, and each view block in it has its own source block. Else, the blocks merge one by one. An example is a paragraph that the text joins to a code block.
- **The planner** merges a group with the view as `base`, the text as `ours` and the document as `theirs`. Thus, the moved text keeps its hidden styles (for example an underline in markdown). Two joined paragraphs get the props of the first paragraph: the props of the second paragraph are lost.
- **The new part of a split** merges its type and props with the block that gave it the most text. Thus, it gets the hidden props of that block (for example its color and its alignment). Its type follows the text. The editor is different: Enter in the middle of a block gives the second part the default props.
- **The rebase** (with `base`) gets the groups of the plan. It merges a group with `base`, the target and the current document. Thus, a change of another writer to the moved text goes to the block that holds it after the write, and the moved text is not a removal from the old block. A split or a join changes the text where it occurs: if another writer changed that text, that is a conflict, and the split or the join there does not apply (`conflicting-change`). A block of a group stays only if the merge gives it content. If the client joins a block whose type or props another writer changed, the join does not apply: the block stays with its text (`removed-changed-block`).
- With `merge: "yjs"`, only the planner uses the option: Yjs merges the moved text.
- The comments on the moved text are lost. The apply inserts that text as new text, without the marks that Block JSON does not contain. To keep them, the apply must move the ProseMirror nodes.

## The three-way merge

All merges in `merge/` use one rule and one vocabulary (`merge/threeWay.ts`):

- `base`: the common start of the two sides.
- `ours`: the side that makes the change. Its difference from `base` is the change to apply.
- `theirs`: the side that gets the change. It can have data that `base` does not show, and changes of other writers.

If `ours` is different from `base`, the result is `ours`. If not, the result is `theirs`. In the planner, `base` is the view block, `ours` is the block from the text, and `theirs` is the block in the document. In the rebase, `base` is the block at the version that the client read, `ours` is that block with the update, and `theirs` is the current block.

In the planner, this merge is the transport of the edits from the view to the text onto the document. The view is the document as the format shows it. Thus, where the text did not change the view, the document block stays as it is, with the data that the format does not show. The rules for that data are rules of the transport:

- A changed region (between two units that the three sides have) takes the text of the client. This is the rule of `diff3` for a changed chunk. A transport of single edits through links from each view character to a document character does not work: the format removes and changes whitespace, thus these links are partial.
- An item that the format does not show stays (`keepTheirs` in `merge/inline.ts`).
- The shadow of an item links its text in the view to the item (see below).
- New text gets the hidden styles and the link of the text that it replaces (see below).

In the rebase, `theirs` contains the changes of other writers. There, the same merge is a three-way merge of two sets of changes.

The merge of a block (`merge/block.ts`) merges the type, each prop of the three blocks, and the content. It merges inline content character by character (diff3, `merge/inline.ts`), and tables row by row and cell by cell (`merge/table.ts`). The characters align by words first, then by characters between the matched words. A word token has no whitespace, thus a word matches at each position. New text that replaces old text gets the hidden styles and the link of the old text, if all the old text has them. Thus, a changed word keeps the hidden underline of the word that it replaces. Inserted text gets such a style only if the text on its two sides has it. Thus, new text at the edge of a styled run does not get the style. This is also true at the start and at the end of the content: for example, text after a link at the end does not become a part of the link. Some formats show custom inline content as text (markdown shows a mention as "@Bob"), and the parse gives back only that text. In the planner, the merge then uses that text as a shadow of the item: the characters of one serialize and parse of the item alone. If the text keeps all characters of the shadow, the item stays. If the text changes them, the text replaces the item.

## Pipeline

1. **Project** (`projection/`): render `base` (or the current document, if there is no `base`) and parse it back. The result is the _view_. The view blocks that a source block gives alone, without its children, are its _parts_. Most blocks are their own part, because the view shows them as they are: the view block at the place of the block has the same key (see `alignmentKey`). For a block with content, the key is its text and its content shape. For a block without content (for example a divider), it is all its fields. The anchored match of the keys of the source blocks and of the view blocks gives the places. A block with content that has no text (for example an empty paragraph) does not count. Only the other blocks make the round trip alone (for example an empty paragraph, an image with a width in markdown, a block with a mention in markdown, or a code block with a blank line in plain text). One round trip gives their parts: these blocks alone, at the top level, with a paragraph between each two blocks that contains only a character (or two characters) that the text does not contain. Thus, the source of each part is known, and the links do not depend on a similarity of texts. Such a paragraph also comes before the first block and after the last block of the round trip, if the document has another block there. Thus, each block of the round trip has a neighbor where it has one in the text (for example, plain text removes the white space at the end of a block only before a blank line). The rule "shown as it is" needs a property of the format: the round trip of a block that the view shows as it is gives that block alone (one block with the same key). The three formats have this property (`api.fuzz.test.ts` examines it). A format that hides a block with text can break it: if the view block next to the hidden block has the same text, that view block can link to the hidden block (see `shownBlocks`). The view blocks link to the parts: blocks with equal keys first, then the blocks between them in order, if the two sides have the same number of blocks. The two lists come from the same blocks, thus they are different only where the format renders a block differently in the full document. A block that the format renders as no text (for example an image without a URL, in markdown) has no parts. A block can have more than one part. For example, markdown shows a file block as a paragraph with a link and a paragraph with its caption. Plain text shows a code block with a blank line as two paragraphs. Thus, a client can move or remove such a block in the text. A change of the text of its parts merges into the block, if the parts stay next to each other, in order. Other changes replace it with the blocks of the text (warning `multi-part-block-replaced` or `block-shape-replaced`). A layout block (for example a column) is not a document without its children (the parse fills it with new blocks), thus its part is the block itself. The text and the projection of the last document of each editor and format stay in a cache (`projection/cache.ts`, the key is the JSON of the document). Thus, a write after a read of the same version does not serialize the document again, and a second write from one version does not project it again.

2. **Parse** the incoming text and **align** it with the view (`alignment/`, see the identity rules above).
3. **Plan the target document** (`target/`): the document as the text asks for it, as Block JSON with IDs. A source block with a match stays, with the three-way merge of its fields. A new block gets a new ID. The blocks go in the order of the text, in the parent that the text shows. One pass builds the tree, with a stack of the open ancestors. Two rules keep data that the format does not show:
   - A block keeps a nesting that the format does not show (for example a paragraph in a bullet, in markdown). The conditions are: the text did not change its parent, the parent has the same type, and the parent is still open. A new block before such a block goes into the same nesting. Thus, the child stays nested. A kept block also goes into the nesting of the next block if it would close a hidden block that the next block needs. An example is a top-level paragraph that the text puts between the blocks of two columns. The same is true for a kept block whose source parent is closed. A block that the text moves (rule 2) keeps its hidden nesting only near that nesting: one of its hidden ancestors is open, or the next kept block is in one of them. Else it goes where a new block goes. Thus, a block that the text moves out of the columns does not take the column list with it.
   - Blocks that the format does not show stay at their positions, with their parent. If the planner removes their parent, it also removes them. An empty block (for example an empty paragraph) also goes if the planner removes all the visible blocks around it. A hidden block with data (for example a table or an image in plain text) stays, because the text cannot show it.
   - The layout blocks of the target change to fit their child rules (`target/fitLayout.ts`, also for the JSON API). A column without blocks goes, and a column list with one column becomes the blocks of that column. ProseMirror would fill them with new empty blocks. For a write from an older version, the rule applies to the result on the current document, not to the target. The reason: there, an empty column of the client can have blocks of other writers. The rebase gives the tree of the result, and the layout fit of that tree gives more operations. With `merge: "yjs"`, the layout blocks stay, also if they become empty (see "Concurrent writes").
4. **Merge** the target with the current document, if `base` is older (see "Concurrent writes").
5. **Diff** (`operations/diffDocuments.ts`): the operations that change the current document into the target (or into the merged tree). An update for each block with changed fields. In each parent, the blocks that keep their order stay (a longest common subsequence of the child IDs). Each other block goes after the block before it: a move, or an insert for a new block. The deletes come last. Thus, the blocks that stay moved out of the removed blocks first.
6. **Apply** the operations to a ProseMirror transaction (`operations/applyOperations.ts`). An update changes the block in place: the type and props through `updateBlockTr`, and inline content through the smallest ProseMirror steps (a `ReplaceStep` for each changed run, and mark steps for style changes). Thus, unchanged text keeps its identity and its comments. The inserts, the moves and the removals give the structure of the result (`operations/applyToBlocks.ts`, a pure function). Then, in each list of children, the children that stay keep their nodes, and each run of changed children between them is replaced in one step: with the ProseMirror nodes of the blocks that the document has (a moved block keeps its node, with its comments), and new nodes. Thus, an insert is one step that only inserts, and a move is a removal and an insert. A collaboration binding, a suggestion plugin and the selection see only the changed blocks. The steps that make a list longer apply first, thus each step gives a valid document, also for a column list. Only a list that must have children and has none (a document without blocks, or a column that the operations of a caller, or of `merge: "yjs"`, empty) gets the fill of the schema.

For a Y.Doc, `updateYDocFromText` writes through an editor that is bound to the Y.Doc, as a client. The y-prosemirror binding reads and writes the Y.Doc, as for each other client. Thus, the lens has no reader or writer of its own for Yjs. The editor must be mounted, because y-prosemirror makes its binding in the editor view. Give the editor the schema and the extensions of the other clients (for example comments). The reason: when an editor binds to a Y.Doc, y-prosemirror removes the content that its schema cannot read. For each transaction, y-prosemirror writes one diff for each text block, from the first changed character to the last. For a paragraph with two changes, that diff replaces the text between them. Yjs then moves a concurrent change of another writer there. Also, y-prosemirror compares a list of children only from its start and from its end, and writes the children between the first and the last change in place, one by one. Thus, with an insert and another change in one list in one transaction, a block can get the content of a different block, and a change of another writer goes into the wrong block. Thus, the steps go to the editor in these transactions (`dispatchSteps` in `operations/dispatch.ts`): the steps that change one block (its text, its props or its type) in groups in which no two steps change the same block, and each step that changes a list of children (an insert or a removal of blocks) alone. Each write of the lens to an editor that is bound to a Y.Doc (it has the "ySync" extension) uses these transactions: also `updateDocumentFromText` and the JSON write. For another editor, a write is one transaction, thus one undo reverts it. Between two transactions, plugins can change the document (for example the unique ID extension). Then the later steps move to the changed document, as in prosemirror-collab. Each write of `updateYDocFromText` goes to a fork of the Y.Doc (`ForkYDocExtension`), a fork of the current Y.Doc. Only a write without an error goes into the Y.Doc. Thus, a write that fails in the middle does not change the Y.Doc. The other writes to a bound editor (`updateDocumentFromText` and the JSON write) do not use a fork. If an exception occurs between two groups, the groups before it stay in the Y.Doc. For an atomic write, use `updateYDocFromText`. Then each Yjs change is as small as its step, as for a user who types. A write that changes the text of many blocks one time each is one transaction.

## Modules

Each module imports only modules that are before it in this list. Thus, there are no import cycles.

- `diff/`: the Myers match of two sequences (in linear space, with a work limit), and the anchored match (the patience method) for large inputs. This module does not import BlockNote.
- `blocks/`: the block JSON types of the lens, flat lists of blocks, JSON equality, the update between two blocks, `BlockTree` (the parent and the children of each block, by ID), and the grid of a table and its fit (`tableGrid.ts`, `fitTable.ts`).
- `formats/`: `TextFormat` (`serialize` and `parse`), with markdown, HTML and plain text.
- `alignment/` and `merge/`: the identity of blocks, and the three-way merges.
- `projection/`: the view of a document and its links to the source blocks.
- `target/`: the planner. It gives the target document.
- `operations/`: the operation types, the diff of two documents, the ProseMirror steps (`applyOperations`, public: it applies the operations to a transaction of the caller), and the dispatch of the steps to an editor (`dispatch.ts`).
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
  - `api.splitJoin.test.ts`: the option `experimentalTextMoves`: splits and joins in the text, also from an older version, and in a Y.Doc.
  - `api.concurrent.test.ts`: writes from an older version without Yjs, also on 40 random pairs of writers and 40 random groups of three or four writers in each format.
  - `api.fuzz.test.ts`: 150 random documents with all kinds of blocks (tables, files and images with captions, code blocks with blank lines, deep nesting, mentions, columns) in each format, with random edits. It examines the format contract (each view block with text links to a document block, and the round trip of a block that the view shows as it is gives that block alone) and the laws.
- `yjs/yDocText.test.ts`: the Y.Doc API. The concurrent cases run for the two merges (`"lens"` and `"yjs"`). The conflicts and `onConflict: "reject"` are only for `"lens"`.
- `testUtil/` contains the shared test documents and helpers.
- `api.bench.ts` measures a document with about 1,140 blocks. Run it with `vp test bench --run --reporter=verbose src/api/v2/api.bench.ts`. The mean times in jsdom were:

  | Format     | Read   | Write the same text | Write with one change |
  | ---------- | ------ | ------------------- | --------------------- |
  | Markdown   | 150 ms | 540 ms              | 520 ms                |
  | Plain text | 0.4 ms | 30 ms               | 28 ms                 |

  The times depend on the machine. Run the benchmark again for a comparison. A markdown write renders the document one time (the view) and parses two texts (the view, and the text of the client). The blocks that the view does not show as they are (for example empty paragraphs) also make one round trip together (see "Project"). Most of the time goes to the markdown conversion of BlockNote.

  The benchmark runs only five times. The reason is jsdom, not a memory leak: for each `<details open>` element (the export of a toggle block), jsdom starts a timer for the `toggle` event. Until the timer runs, it keeps the element and the full exported tree. The runs do not let the event loop turn, thus the timers do not run. After one turn of the event loop, the memory is free. In Chromium, the memory is also free after the task.

- `benchmarks/largeDocuments.test.ts` measures documents of 1,000 to 10,000 blocks in each format, and each stage of the pipeline. Run it with `TEXT_LENS_BENCH=1 vp test run src/api/v2/benchmarks --silent=false`. The median times in jsdom for 10,000 blocks were:

  | Format     | Read     | Write with one change | Write from an older version | Y.Doc write | Align, plan and diff |
  | ---------- | -------- | --------------------- | --------------------------- | ----------- | -------------------- |
  | Markdown   | 1,451 ms | 5,091 ms              | 5,039 ms                    | 8,342 ms    | 82 ms                |
  | HTML       | 651 ms   | 3,588 ms              | 3,644 ms                    | 6,996 ms    | 88 ms                |
  | Plain text | 14 ms    | 231 ms                | 260 ms                      | 3,435 ms    | 61 ms                |

  The stages of the lens (align, plan, diff) are linear in the number of blocks. A Y.Doc write sends each insert or removal of blocks in its own transaction (see "Apply"), and y-prosemirror compares the document for each transaction. Thus, a Y.Doc write with many inserts or removals at different places takes time for each of them: for example, 0.7 s for 200 inserts in 2,000 blocks, and 8.7 s for 800 inserts in 8,000 blocks. For a Y.Doc, most of the time is the render of the editor view in jsdom. For text, most of the time goes to the markdown and HTML conversions of BlockNote: the projection makes one round trip of the document (the view) and one round trip of the blocks that the view does not show as they are (see "Project"), and the write parses the text of the client.

## Changes outside this folder

- `packages/xl-ai/package.json` has the subpath exports `./text-lens` and `./text-lens/yjs`, and `yjs` as an optional peer dependency. `packages/xl-ai/vite.config.ts` has their build entries.
- `packages/core`: the markdown and HTML round trip fixes of the branch `fix/markdown-roundtrip` (see "Problems in BlockNote").

## Warnings

A result can contain warnings (`TextUpdateWarning`). A warning tells you that a part of the text did not apply as written, or that data was lost:

- `multi-part-block-replaced`: the format shows the block as more than one block (for example a code block with blank lines, in plain text), and the text moved, removed or split a part, or the block has no text. The blocks of the text replace the block, and the block of the largest part keeps its ID (as for a split block). Its hidden data is lost. A change of the text of the parts does not give this warning: the parts join again, with the text between them, and the change merges into the block.
- `unlinked-block-changed`: the text changed a part of the text that does not come from one document block (`text` is that part). The change does not apply. An empty block of the view without a document block gives no warning, because the text cannot change data of it.
- `block-shape-replaced`: the format shows the block with content of a different shape (for example a table as lines of text), and the text changed that content. The block takes the type of the text block. Its old content is lost.
- `change-to-removed-block` (rebase): the text changed or moved a block that another writer removed. The change does not apply.
- `removed-changed-block` (rebase): the text removed a block that another writer changed (or a block in it). The removal does not apply to the blocks with a change of the other writer: they stay.
- `conflicting-change` (rebase): the text and another writer changed the same part of a block (a part of its text, a style, a prop, its parent or its place) in different ways. The change of the other writer stays there, and the change of the text there does not apply. An example is a block that another writer rewrote, or split into two blocks.
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

These problems stay:

- The HTML export writes a prop of a block two times: as a `data-*` attribute and in the visible markup (for example `data-text-alignment` and `style="text-align: …"`, or `data-caption` and `<figcaption>`). The parse reads the attribute. Thus, a client that changes only the visible markup gets no change, and no warning. Change the `data-*` attribute too.

- Delimiter runs like `***`: the parser does not use the delimiter rules of CommonMark. The exporter writes underscores where it can (`*a*__b__`, `**a _b_**`), but not next to a letter or a digit, or for text with `_`. There, runs like `***` stay.
- HTML paste removes an image in a paragraph (markdown parse splits the paragraph around the image).
- The markdown and HTML parsers use recursion for nested blocks. A text with a very deep nesting (for example 20,000 quote markers in markdown) overflows the stack. A server must parse untrusted text in a worker, with a time limit.
- The HTML export of a file block is a link (with a paragraph for the caption). The parse does not read it back as a file block. Thus, in HTML, a change to a file block replaces it with the blocks of the text, as in markdown.
- Duplicate block IDs in a Y.Doc (for example after two clients move the same block). The unique ID extension gives new IDs to the copies in the editor. But y-prosemirror does not write these IDs to the Y.Doc, because the extension makes the change during the sync of a remote update. Thus, each client can show different IDs for these blocks.

## Items that are not done

- Yjs v14 (`@y/y` and `@y/prosemirror`).
- IDs in the text.
- A split by another writer: the rebase merges each block by its ID. If another writer splits a block, and the client changes the text of the second part, the change of the client does not apply, with the warning `conflicting-change`: for the rebase, the other writer removed that text from the first block.
- A split in the text. The part with the most text keeps the ID, the props and the hidden styles. The other part is a new block, without the hidden props of the block (for example its color or its alignment).
- A join in the text. The first block keeps its ID. The hidden data of the second block is lost: its props, the hidden styles of its text, and the comments on its text.
- A split by the client, while another writer changes the part that goes to the new block (the part without the ID). The text of that part shows two times, with the warning `conflicting-change`: the block keeps the changed text (`theirs` wins the conflict), and the new block has the text of the client.
- A join by the client, while another writer changes the second block. The text of the second block shows two times, with the warning `removed-changed-block`: the second block stays with the change, and the joined block has the text of the client.
- The cause of the four items above: the merge pairs blocks by ID. A split or a join moves text from one block to another, and for the merge, that text was removed from one block and added to another. The option `experimentalTextMoves` removes this cause for the splits and joins of the text (see "Experimental: splits and joins move text").
- A block that another writer rewrote. If another writer changes almost all words of a block (for example the case of each word), the alignment of the old and the new text finds nothing in common. If the client also changes that block, the text of the other writer stays. The change of the client is lost, with the warning `conflicting-change`.
- In jsdom, the markdown export of many paragraphs in list items is quadratic, because each move of an element recomputes the index of its siblings.
- A block that the text moves and also changes. The lens does not find it. The block is removed and inserted again, with a new ID.
- Table rows with a different number of cells. Examples are added or removed columns. The result for these rows is the row from the text, and the cell colors of these rows are lost.
- Merged cells in markdown and plain text. These formats show a merged cell as the cell and empty cells at the positions that it covers. A change of such a table removes all its merged cells (warning `merged-cells-removed`).
