# Text Lens with AI Suggestions

This example shows a document as markdown or plain text next to the editor, and writes the changed text back with the text lens (`@blocknote/xl-ai/text-lens`). The changes of the text show as AI suggestions in the editor. A write applies only the changes, and keeps the data that the text does not show: block IDs, colors, underline, alignment, nesting and image widths.

**Try it out:** Change a word in the text, change a different block in the live editor, and then change the text again: the edit of the live editor stays.

**How it works:**

- The base is the document at the time when the text was read. Each write sends the full text with the base. Thus, the write keeps the edits that the live editor made after that time.
- A write starts 500 ms after the last change in the text.
- Each write first rejects the suggestions of the last write. A deletion stays in the document until a user accepts it. Thus, without this step, the next write reads the deleted text as content. Then the write applies the full text again, as new suggestions.
- "Accept all" and "Reject all" end the suggestions. Then the current document becomes the new base, and the text shows it.
- "Set as new base" makes the current document the base, and shows it in the text. Use it to see the edits of the live editor in the text. This button and the format switch are available only when there are no suggestions.
- The "Last write" panel shows the operations and the warnings of the last write.

**How the suggestions apply** (see `src/suggestTextUpdate.ts`):

1. `computeTextUpdate` computes the operations on a copy of the clean document, in an editor without a view.
2. `applyBlockOperations` on that copy gives the steps of the updates. These steps change only the changed text.
3. An insert, a move or a delete applies with `insertBlocks` and `removeAndInsertBlocks` of `@blocknote/core`, with one step for each block. `applyBlockOperations` replaces a full block group in one step, and the suggestions then show all the blocks of that group as deleted and inserted.
4. `transformToSuggestionTransaction` of `prosemirror-suggest-changes` changes these steps into suggestions.

**Limits:**

- A move shows as a deletion and an insertion. If you accept it, the block gets a new ID.
- Text that you type in the live editor inside a suggestion gets the mark of that suggestion. The next write removes it.

**Relevant Docs:**

- [Text Updates](/docs/features/text-updates)
- [Getting Started with BlockNote AI](/docs/features/ai/getting-started)
