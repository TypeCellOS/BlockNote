import { testDocument } from "@blocknote/shared/testDocument";

import type { GalleryEditor, GalleryPartialBlock } from "./gallerySchema";

/**
 * A browsable suggestion scenario.
 *
 * `single` scenarios set up one suggesting editor (diffed against the base):
 *   1. the editor is seeded with `initial`,
 *   2. the base is synced into the suggestion doc (so it becomes the "before"),
 *   3. suggestion mode is enabled,
 *   4. `apply(editor)` performs the change — which now renders as a diff.
 *
 * These are the same scenarios exercised by the y-prosemirror visual tests; the
 * goal is to share these definitions so the tests and this gallery never drift.
 * (Test wiring stays in the fixtures; only the per-scenario data lives here.)
 */
/**
 * A tracked note for a scenario, surfaced in the gallery so this example doubles
 * as a living list of behavior worth knowing. `high` = wrong merge result, crash,
 * or data loss; `low` = cosmetic / attribution quirk or a nice-to-have; `info` =
 * a neutral note about expected behavior (not a problem). Keep the issue-level
 * notes in sync with the `TODO` / `KNOWN LIMITATION` / `test.skip` / `test.fails`
 * notes in the y-prosemirror e2e tests — that's where each is proven.
 */
export type Feedback = {
  severity: "info" | "low" | "high";
  note: string;
};

export type SingleScenario = {
  kind: "single";
  id: string;
  title: string;
  category: string;
  description: string;
  /** Blocks the document starts with (the "before"). */
  initial: GalleryPartialBlock[];
  /** The change to make in suggestion mode (the "after"). */
  apply: (editor: GalleryEditor) => void;
  /** Set when the scenario is known to throw, so the gallery can warn. */
  knownCrash?: boolean;
  /** Known issues / improvement points, shown in the gallery. */
  feedback?: Feedback[];
};

/**
 * A two-user concurrent scenario. Both users start from `initial`, then User A
 * runs `applyA` and User B runs `applyB` independently in suggestion mode; the
 * tests/gallery merge the two edits through the Yjs CRDT.
 */
export type ConcurrentScenario = {
  kind: "concurrent";
  id: string;
  title: string;
  category: string;
  description: string;
  /** Blocks both users start from (the shared "before"). */
  initial: GalleryPartialBlock[];
  /** User A's change (suggestion mode). */
  applyA: (editor: GalleryEditor) => void;
  /** User B's change (suggestion mode). */
  applyB: (editor: GalleryEditor) => void;
  /** Set when the scenario is known to throw, so the gallery can warn. */
  knownCrash?: boolean;
  /** Known issues / improvement points, shown in the gallery. */
  feedback?: Feedback[];
};

export type SuggestionScenario = SingleScenario | ConcurrentScenario;

// Inline SVG data URLs — avoid a network fetch for image sources. `IMG_SRC_BASE`
// (red) and `IMG_SRC_NEW` (teal) are exported so tests can poll against the exact
// URL a scenario sets, with no chance of the two drifting.
export const IMG_SRC_BASE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23ff6b6b'/></svg>";
export const IMG_SRC_NEW =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%234ecdc4'/></svg>";

// Shared 2×2 table baseline used by most of the table scenarios.
const TABLE_2X2 = {
  id: "table",
  type: "table" as const,
  content: {
    type: "tableContent" as const,
    rows: [{ cells: ["A1", "B1"] }, { cells: ["A2", "B2"] }],
  },
};

// Simulate a real keypress at the editor's current selection by routing a
// synthetic keydown through ProseMirror's keymap — the same path a user's
// Enter / Backspace takes, so split/merge behave exactly as they do for a
// person typing (BlockNote has no public "split block" / "merge blocks" command).
function pressKey(editor: GalleryEditor, key: string) {
  const view = editor.prosemirrorView;
  const event = new KeyboardEvent("keydown", { key });
  view.someProp("handleKeyDown", (f) => f(view, event));
}

// The document position at the start of the first occurrence of `text`. Lets a
// scenario drop the cursor mid-block before splitting (BlockNote's
// `setTextCursorPosition` only offers "start" / "end").
function posBeforeText(editor: GalleryEditor, text: string): number {
  let pos = -1;
  editor.prosemirrorState.doc.descendants((node, nodePos) => {
    if (pos === -1 && node.isText && node.text) {
      const idx = node.text.indexOf(text);
      if (idx !== -1) {
        pos = nodePos + idx;
      }
    }
    return pos === -1;
  });
  return pos;
}

export const scenarios: SuggestionScenario[] = [
  {
    kind: "single",
    id: "add-heading",
    title: "Add heading",
    category: "Add / remove blocks",
    description:
      "Insert a level-1 heading into an empty document. The inserted block is " +
      "highlighted in the author's color.",
    initial: [],
    apply: (editor) =>
      editor.replaceBlocks(editor.document, [
        {
          id: "h0",
          type: "heading",
          props: { level: 1 },
          content: "New heading",
        },
      ]),
  },
  {
    kind: "single",
    id: "delete-image",
    title: "Delete image",
    category: "Add / remove blocks",
    description:
      "Delete an image block. Blocks with no inline content (image, divider, …) " +
      "are flagged with a 'Deleted' card rather than struck through.",
    initial: [
      {
        id: "img",
        type: "image",
        props: { url: IMG_SRC_BASE, previewWidth: 150 },
      },
    ],
    apply: (editor) => editor.removeBlocks(["img"]),
  },
  {
    kind: "single",
    id: "add-bullet",
    title: "Add bullet item",
    category: "Add / remove blocks",
    description: "Insert a bullet list item into an empty document.",
    initial: [],
    apply: (editor) =>
      editor.replaceBlocks(editor.document, [
        { id: "b0", type: "bulletListItem", content: "New bullet" },
      ]),
  },
  {
    kind: "single",
    id: "add-numbered",
    title: "Add numbered item",
    category: "Add / remove blocks",
    description: "Insert a numbered list item into an empty document.",
    initial: [],
    apply: (editor) =>
      editor.replaceBlocks(editor.document, [
        { id: "n0", type: "numberedListItem", content: "New numbered" },
      ]),
  },
  {
    kind: "single",
    id: "add-nested-bullets",
    feedback: [
      {
        severity: "low",
        note: "Nested bullets all render as • instead of •/◦/▪ — the suggestion-mark wrappers (display: contents) break the depth-detecting CSS chains. Fix: compute each bullet's nesting level in JS and expose it as data-bullet-level, then pick the glyph with a wrapper-independent attribute selector (as numbered lists do with data-index).",
      },
    ],
    title: "Add nested bullets",
    category: "Add / remove blocks",
    description:
      "Insert a three-level nested bullet list into an empty document.",
    initial: [],
    apply: (editor) =>
      editor.replaceBlocks(editor.document, [
        {
          id: "l0",
          type: "bulletListItem",
          content: "Level 0",
          children: [
            {
              id: "l1",
              type: "bulletListItem",
              content: "Level 1",
              children: [
                { id: "l2", type: "bulletListItem", content: "Level 2" },
              ],
            },
          ],
        },
      ]),
  },
  {
    kind: "single",
    id: "add-colored-block",
    feedback: [
      {
        severity: "low",
        note: "The nested child loses the parent's background tint — the :has() background selector breaks when the inserted content is wrapped in <ins>.",
      },
    ],
    title: "Add colored block with child",
    category: "Add / remove blocks",
    description:
      "Insert a blue-background paragraph with a nested child into an empty " +
      "document.",
    initial: [],
    apply: (editor) =>
      editor.replaceBlocks(editor.document, [
        {
          id: "c0",
          type: "paragraph",
          props: { backgroundColor: "blue" },
          content: "Colored parent",
          children: [{ id: "c1", type: "paragraph", content: "Child block" }],
        },
      ]),
  },
  {
    kind: "single",
    id: "nest-bullet-existing",
    feedback: [
      {
        severity: "low",
        note: "Nested bullets all render as • instead of •/◦/▪ — the suggestion-mark wrappers (display: contents) break the depth-detecting CSS chains. Fix: compute each bullet's nesting level in JS and expose it as data-bullet-level, then pick the glyph with a wrapper-independent attribute selector (as numbered lists do with data-index).",
      },
      {
        severity: "low",
        note: "Going from 0 to 1+ children re-creates the block as a new one — so concurrent edits to the original block can be lost, the whole new block is attributed to whoever made the change, and the diff takes more space than needed. A consequence of the schema fix.",
      },
    ],
    title: "Nest a bullet under another",
    category: "Add / remove blocks",
    description: "Nest the second bullet under the first.",
    initial: [
      { id: "p", type: "bulletListItem", content: "Parent" },
      { id: "c", type: "bulletListItem", content: "Child" },
    ],
    apply: (editor) => {
      editor.setTextCursorPosition("c", "start");
      editor.nestBlock();
    },
  },
  {
    kind: "single",
    id: "add-paragraph-after",
    title: "Add paragraph after a block",
    category: "Add / remove blocks",
    description: "Insert a paragraph after an existing heading.",
    initial: [
      { id: "h0", type: "heading", props: { level: 1 }, content: "Title" },
    ],
    apply: (editor) =>
      editor.insertBlocks(
        [{ id: "p0", type: "paragraph", content: "Body text" }],
        "h0",
        "after",
      ),
  },
  {
    kind: "single",
    id: "remove-paragraph",
    title: "Remove a paragraph",
    category: "Add / remove blocks",
    description:
      "Delete the body paragraph from a heading + paragraph document.",
    initial: [
      { id: "h0", type: "heading", props: { level: 1 }, content: "Title" },
      { id: "p0", type: "paragraph", content: "Body text" },
    ],
    apply: (editor) => editor.removeBlocks(["p0"]),
  },
  {
    kind: "single",
    id: "remove-all",
    title: "Remove the only block",
    category: "Add / remove blocks",
    description: "Delete the single block in the document.",
    initial: [{ id: "p0", type: "paragraph", content: "Only block" }],
    apply: (editor) => editor.removeBlocks(["p0"]),
  },
  {
    kind: "single",
    id: "delete-nested",
    feedback: [
      {
        severity: "low",
        note: "Going from 1+ to 0 children re-creates the block as a new one — so concurrent edits to the original block can be lost, the whole new block is attributed to whoever made the change, and the diff takes more space than needed. A consequence of the schema fix.",
      },
    ],
    title: "Delete a nested block",
    category: "Add / remove blocks",
    description: "Delete the nested child of a parent block.",
    initial: [
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
    ],
    apply: (editor) => editor.removeBlocks(["child"]),
  },
  {
    kind: "single",
    id: "delete-parent",
    title: "Delete a parent block",
    category: "Add / remove blocks",
    description: "Delete a parent block together with its nested child.",
    initial: [
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
    ],
    apply: (editor) => editor.removeBlocks(["parent"]),
  },
  {
    kind: "single",
    id: "delete-mixed-parent",
    title: "Delete parent with mixed children",
    category: "Add / remove blocks",
    description:
      "Delete a parent block whose children are a paragraph and an image.",
    initial: [
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [
          { id: "p1", type: "paragraph", content: "Nested paragraph" },
          {
            id: "img",
            type: "image",
            props: { url: IMG_SRC_BASE, previewWidth: 150 },
          },
        ],
      },
    ],
    apply: (editor) => editor.removeBlocks(["parent"]),
  },
  {
    kind: "single",
    id: "delete-code-block",
    title: "Delete a code block",
    category: "Add / remove blocks",
    description: "Delete a code block.",
    initial: [{ id: "code", type: "codeBlock", content: "const x = 1;" }],
    apply: (editor) => editor.removeBlocks(["code"]),
  },
  {
    kind: "single",
    id: "insert-divider",
    title: "Insert a divider",
    category: "Add / remove blocks",
    description: "Insert a divider between two paragraphs.",
    initial: [
      { id: "above", type: "paragraph", content: "Above" },
      { id: "below", type: "paragraph", content: "Below" },
    ],
    apply: (editor) =>
      editor.insertBlocks([{ type: "divider" }], "above", "after"),
  },
  {
    kind: "single",
    id: "delete-divider",
    title: "Delete a divider",
    category: "Add / remove blocks",
    description: "Delete a divider (a block with no inline content).",
    initial: [{ id: "hr", type: "divider" }],
    apply: (editor) => editor.removeBlocks(["hr"]),
  },
  {
    kind: "single",
    id: "insert-image",
    title: "Insert an image",
    category: "Add / remove blocks",
    description: "Insert an image block into an empty document.",
    initial: [],
    apply: (editor) =>
      editor.replaceBlocks(editor.document, [
        {
          id: "img",
          type: "image",
          props: { url: IMG_SRC_BASE, previewWidth: 150 },
        },
      ]),
  },
  {
    kind: "single",
    id: "type-list-to-paragraph",
    title: "List item → paragraph",
    category: "Type changes",
    description:
      "Demote a bullet list item to a paragraph. The inline content is preserved; " +
      "only the wrapping block type changes (old struck through, new inserted).",
    initial: [
      { id: "block-hello", type: "bulletListItem", content: "hello world" },
    ],
    apply: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, { type: "paragraph" });
    },
  },
  {
    kind: "single",
    id: "type-paragraph-to-heading",
    title: "Paragraph → heading",
    category: "Type changes",
    description:
      "Promote a paragraph to a level-1 heading. The inline content is preserved; " +
      "the original is struck through and the new heading inserted beside it.",
    initial: [{ id: "block-hello", type: "paragraph", content: "hello world" }],
    apply: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, { type: "heading", props: { level: 1 } });
    },
  },

  // --- Basic text ---
  {
    kind: "single",
    id: "text-rename-word",
    feedback: [
      {
        severity: "low",
        note: "The diff looks a bit garbled — individual characters are suggested mid-word. Real-world typing (character-by-character) wouldn't show this, but a programmatic updateBlock (as in this demo) does. A coarser, word-based diff would fix it.",
      },
    ],
    title: "Rename a word",
    category: "Basic text",
    description:
      "Replace 'world' with 'universe'. The diff splits the changed run into " +
      "struck-through deletions and inserted characters.",
    initial: [{ id: "block-hello", type: "paragraph", content: "hello world" }],
    apply: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, {
        type: "paragraph",
        content: "hello universe",
      });
    },
  },
  {
    kind: "single",
    id: "text-add-bold",
    title: "Add bold",
    category: "Basic text",
    description:
      "Bold the word 'world' — a format-only change, tracked via the " +
      "modification marker rather than an insert/delete.",
    initial: [{ id: "block-hello", type: "paragraph", content: "hello world" }],
    apply: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, {
        type: "paragraph",
        content: [
          { type: "text", text: "hello ", styles: {} },
          { type: "text", text: "world", styles: { bold: true } },
        ],
      });
    },
  },
  {
    kind: "single",
    id: "text-remove-bold",
    title: "Remove bold",
    category: "Basic text",
    description:
      "Strip bold from an already-bold 'world' — the symmetric format-only " +
      "removal.",
    initial: [
      {
        id: "block-hello",
        type: "paragraph",
        content: [
          { type: "text", text: "hello ", styles: {} },
          { type: "text", text: "world", styles: { bold: true } },
        ],
      },
    ],
    apply: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, {
        type: "paragraph",
        content: "hello world",
      });
    },
  },
  {
    kind: "single",
    id: "text-add-italic-to-bold",
    feedback: [],
    title: "Add italic over bold",
    category: "Basic text",
    description:
      "Add italic to a word that is already bold, keeping both marks.",
    initial: [
      {
        id: "block-hello",
        type: "paragraph",
        content: [
          { type: "text", text: "hello ", styles: {} },
          { type: "text", text: "world", styles: { bold: true } },
        ],
      },
    ],
    apply: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, {
        type: "paragraph",
        content: [
          { type: "text", text: "hello ", styles: {} },
          { type: "text", text: "world", styles: { bold: true, italic: true } },
        ],
      });
    },
  },

  // --- Move blocks ---
  {
    kind: "single",
    id: "move-paragraph-up",
    title: "Move paragraph up",
    category: "Move blocks",
    description:
      "Move the middle paragraph above the first — a delete at the old position " +
      "and an insert at the new one.",
    initial: [
      { id: "first", type: "paragraph", content: "First" },
      { id: "middle", type: "paragraph", content: "Middle" },
      { id: "last", type: "paragraph", content: "Last" },
    ],
    apply: (editor) => editor.moveBlocksUp("middle"),
  },
  {
    kind: "single",
    id: "move-paragraph-with-children",
    title: "Move paragraph with children",
    category: "Move blocks",
    description:
      "Move a parent paragraph (and its nested child) up one position.",
    initial: [
      { id: "first", type: "paragraph", content: "First" },
      {
        id: "parent",
        type: "paragraph",
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
    ],
    apply: (editor) => editor.moveBlocksUp("parent"),
    feedback: [],
  },

  // --- Nesting ---
  {
    kind: "single",
    id: "nesting-indent",
    feedback: [
      {
        severity: "low",
        note: "Going from 0 to 1+ children re-creates the block as a new one — so concurrent edits to the original block can be lost, the whole new block is attributed to whoever made the change, and the diff takes more space than needed. A consequence of the schema fix.",
      },
    ],
    title: "Indent a block",
    category: "Nesting",
    description:
      "Nest N1 under N0 (indent). The moved block is re-inserted nested under " +
      "its new parent.",
    initial: [
      { id: "n0", type: "paragraph", content: "N0" },
      { id: "n1", type: "paragraph", content: "N1" },
    ],
    apply: (editor) => {
      editor.setTextCursorPosition("n1", "start");
      editor.nestBlock();
    },
  },
  {
    kind: "single",
    id: "nesting-unindent",
    title: "Unindent a block",
    feedback: [
      {
        severity: "low",
        note: "Going from 1+ to 0 children re-creates the block as a new one — so concurrent edits to the original block can be lost, the whole new block is attributed to whoever made the change, and the diff takes more space than needed. A consequence of the schema fix.",
      },
    ],
    category: "Nesting",
    description: "Un-nest N1 out of N0 (outdent) back to a top-level sibling.",
    initial: [
      {
        id: "n0",
        type: "paragraph",
        content: "N0",
        children: [{ id: "n1", type: "paragraph", content: "N1" }],
      },
    ],
    apply: (editor) => {
      editor.setTextCursorPosition("n1", "start");
      editor.unnestBlock();
    },
  },
  {
    kind: "single",
    id: "nesting-change-parent-type",
    feedback: [
      {
        severity: "low",
        note: "Changing a parent's type deletes the old block and creates a new one — so concurrent edits to the original block can be lost, and the entire new block is attributed to whoever changed the type. A consequence of the schema fix.",
      },
    ],
    title: "Change type of a parent block",
    category: "Nesting",
    description:
      "Change a parent paragraph (with a nested child) to a heading; the child " +
      "nesting is preserved.",
    initial: [
      {
        id: "n0",
        type: "paragraph",
        content: "N0",
        children: [{ id: "n1", type: "paragraph", content: "N1" }],
      },
    ],
    apply: (editor) => {
      const [parent] = editor.document;
      editor.updateBlock(parent, { type: "heading", props: { level: 1 } });
    },
  },

  // --- Prop changes ---
  {
    kind: "single",
    id: "prop-text-alignment",
    feedback: [
      {
        severity: "low",
        note: "Block-level prop changes produce no y-attributed-* mark, so the pending change renders as if already accepted — it's invisible in the diff.",
      },
    ],
    title: "Center-align",
    category: "Prop changes",
    description:
      "Change a paragraph's text alignment from left to center — a block-level " +
      "prop change (no insert/delete marks are generated).",
    initial: [{ id: "block-hello", type: "paragraph", content: "hello world" }],
    apply: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, {
        type: "paragraph",
        props: { textAlignment: "center" },
      });
    },
  },
  {
    kind: "single",
    id: "prop-heading-level",
    feedback: [
      {
        severity: "low",
        note: "Block-level prop changes produce no y-attributed-* mark, so the pending change renders as if already accepted — it's invisible in the diff.",
      },
    ],
    title: "Demote heading",
    category: "Prop changes",
    description: "Change a heading from level 1 to level 2.",
    initial: [
      {
        id: "block-hello",
        type: "heading",
        props: { level: 1 },
        content: "hello world",
      },
    ],
    apply: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, { type: "heading", props: { level: 2 } });
    },
  },
  {
    kind: "single",
    id: "prop-image-width",
    feedback: [
      {
        severity: "low",
        note: "Block-level prop changes produce no y-attributed-* mark, so the pending change renders as if already accepted — it's invisible in the diff.",
      },
    ],
    title: "Resize image",
    category: "Prop changes",
    description: "Change an image's previewWidth (200 → 400).",
    initial: [
      {
        id: "block-image",
        type: "image",
        props: { url: IMG_SRC_BASE, previewWidth: 200 },
      },
    ],
    apply: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, {
        type: "image",
        props: { previewWidth: 400 },
      });
    },
  },
  {
    kind: "single",
    id: "prop-image-source",
    feedback: [
      {
        severity: "low",
        note: "Block-level prop changes produce no y-attributed-* mark, so the pending change renders as if already accepted — it's invisible in the diff.",
      },
    ],
    title: "Change image source",
    category: "Prop changes",
    description: "Swap an image's url for a different source.",
    initial: [
      {
        id: "block-image",
        type: "image",
        props: { url: IMG_SRC_BASE, previewWidth: 200 },
      },
    ],
    apply: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, { type: "image", props: { url: IMG_SRC_NEW } });
    },
  },

  // --- Tables ---
  {
    kind: "single",
    id: "table-add-row",
    title: "Add row",
    category: "Tables",
    description: "Add a third row to a 2×2 table.",
    initial: [TABLE_2X2],
    apply: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["A1", "B1"] },
            { cells: ["A2", "B2"] },
            { cells: ["A3", "B3"] },
          ],
        },
      }),
  },
  {
    kind: "single",
    id: "table-add-column",
    title: "Add column",
    category: "Tables",
    description: "Add a third column to a 2×2 table.",
    initial: [TABLE_2X2],
    apply: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1", "B1", "C1"] }, { cells: ["A2", "B2", "C2"] }],
        },
      }),
  },
  {
    kind: "single",
    id: "table-remove-row",
    title: "Remove row",
    category: "Tables",
    description: "Remove the last row from a 2×2 table.",
    initial: [TABLE_2X2],
    apply: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1", "B1"] }],
        },
      }),
  },
  {
    kind: "single",
    id: "table-remove-column",
    title: "Remove column",
    category: "Tables",
    description: "Remove the last column from a 2×2 table.",
    initial: [TABLE_2X2],
    apply: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1"] }, { cells: ["A2"] }],
        },
      }),
  },
  {
    kind: "single",
    id: "table-edit-cell",
    title: "Edit a cell",
    category: "Tables",
    description: "Edit the text of the top-left cell.",
    initial: [TABLE_2X2],
    apply: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1 edited", "B1"] }, { cells: ["A2", "B2"] }],
        },
      }),
  },
  {
    kind: "single",
    id: "table-column-color",
    title: "Highlight a column",
    category: "Tables",
    description: "Set a green background on the first column's cells.",
    feedback: [
      {
        severity: "low",
        note: "Block-level prop changes produce no y-attributed-* mark, so the pending change renders as if already accepted — it's invisible in the diff.",
      },
    ],
    initial: [TABLE_2X2],
    apply: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  props: { backgroundColor: "green" },
                  content: ["A1"],
                },
                { type: "tableCell", content: ["B1"] },
              ],
            },
            {
              cells: [
                {
                  type: "tableCell",
                  props: { backgroundColor: "green" },
                  content: ["A2"],
                },
                { type: "tableCell", content: ["B2"] },
              ],
            },
          ],
        },
      }),
  },
  {
    kind: "single",
    id: "table-merge-cells",
    feedback: [
      {
        severity: "low",
        note: "The diff shows a phantom extra 'deleted column' that isn't actually part of the merge.",
      },
    ],
    title: "Merge cells",
    category: "Tables",
    description: "Merge the two top-row cells into one (colspan 2).",
    initial: [TABLE_2X2],
    apply: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  props: { colspan: 2 },
                  content: ["A1+B1"],
                },
              ],
            },
            { cells: ["A2", "B2"] },
          ],
        },
      }),
  },
  {
    kind: "single",
    id: "table-split-cell",
    title: "Split a merged cell",
    category: "Tables",
    description: "Split a merged top-row cell back into two.",
    initial: [
      {
        id: "table",
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            {
              cells: [
                {
                  type: "tableCell",
                  props: { colspan: 2 },
                  content: ["A1+B1"],
                },
              ],
            },
            { cells: ["A2", "B2"] },
          ],
        },
      },
    ],
    apply: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1", "B1"] }, { cells: ["A2", "B2"] }],
        },
      }),
  },

  // --- Concurrent (two users, merged via the Yjs CRDT) ---
  {
    kind: "concurrent",
    id: "concurrent-typo-vs-delete",
    feedback: [],
    title: "Fix typo vs delete word",
    category: "Basic text",
    description:
      "A fixes a typo while B deletes the word; the CRDT merges both.",
    initial: [{ id: "block-hello", type: "paragraph", content: "hello wrold" }],
    applyA: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, { type: "paragraph", content: "hello world" });
    },
    applyB: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, { type: "paragraph", content: "hello " });
    },
  },
  {
    kind: "concurrent",
    id: "concurrent-bold-vs-italic",
    title: "Bold vs italic",
    category: "Basic text",
    description:
      "A bolds a word while B italicises it; both marks land after the merge.",
    initial: [{ id: "block-hello", type: "paragraph", content: "hello world" }],
    applyA: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, {
        type: "paragraph",
        content: [
          { type: "text", text: "hello ", styles: {} },
          { type: "text", text: "world", styles: { bold: true } },
        ],
      });
    },
    applyB: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, {
        type: "paragraph",
        content: [
          { type: "text", text: "hello ", styles: {} },
          { type: "text", text: "world", styles: { italic: true } },
        ],
      });
    },
  },
  {
    kind: "concurrent",
    id: "concurrent-indent-cascade",
    feedback: [
      {
        severity: "low",
        note: "Block N1 appears in two places. Previously this concurrency scenario would also not be correctly handled (one of the edits would be dropped).",
      },
    ],
    title: "Cascading indents",
    category: "Nesting",
    description: "A indents N1 while B indents N2.",
    initial: [
      { id: "n0", type: "paragraph", content: "N0" },
      { id: "n1", type: "paragraph", content: "N1" },
      { id: "n2", type: "paragraph", content: "N2" },
    ],
    applyA: (editor) => {
      editor.setTextCursorPosition("n1", "start");
      editor.nestBlock();
    },
    applyB: (editor) => {
      editor.setTextCursorPosition("n2", "start");
      editor.nestBlock();
    },
  },
  {
    kind: "concurrent",
    id: "concurrent-nest-both-under-n0",
    feedback: [
      {
        severity: "info",
        note: "In this concurrent editing scenario the N0 block is duplicated. Previously this scenario would likely drop one of the changes, so it's not a regression per se. A better fix for the schema compatibility could resolve this.",
      },
    ],
    title: "Both nest a new block under N0",
    category: "Nesting",
    description:
      "A and B each insert a sibling after N0 and nest it (known-tricky merge).",
    initial: [{ id: "n0", type: "paragraph", content: "N0" }],
    applyA: (editor) => {
      editor.insertBlocks(
        [{ id: "n1", type: "paragraph", content: "N1" }],
        "n0",
        "after",
      );
      editor.setTextCursorPosition("n1", "start");
      editor.nestBlock();
    },
    applyB: (editor) => {
      editor.insertBlocks(
        [{ id: "n2", type: "paragraph", content: "N2" }],
        "n0",
        "after",
      );
      editor.setTextCursorPosition("n2", "start");
      editor.nestBlock();
    },
  },
  {
    kind: "concurrent",
    id: "concurrent-textcolor-vs-bgcolor",
    title: "Text color vs background color",
    category: "Prop changes",
    description:
      "A sets text color red while B sets background yellow; both apply.",
    initial: [{ id: "block-hello", type: "paragraph", content: "hello world" }],
    feedback: [
      {
        severity: "low",
        note: "Block-level prop changes produce no y-attributed-* mark, so the pending change renders as if already accepted — it's invisible in the diff.",
      },
    ],
    applyA: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, {
        type: "paragraph",
        props: { textColor: "red" },
      });
    },
    applyB: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, {
        type: "paragraph",
        props: { backgroundColor: "yellow" },
      });
    },
  },
  {
    kind: "concurrent",
    id: "concurrent-heading-vs-list",
    feedback: [
      {
        severity: "info",
        note: "Both changes are preserved in the merge — A's heading change and B's list-item change both survive.",
      },
    ],
    title: "Heading vs list item",
    category: "Type changes",
    description:
      "A turns the block into a heading while B turns it into a list item.",
    initial: [{ id: "block-hello", type: "paragraph", content: "hello world" }],
    applyA: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, { type: "heading", props: { level: 1 } });
    },
    applyB: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, { type: "bulletListItem" });
    },
  },
  {
    kind: "concurrent",
    id: "concurrent-text-vs-heading",
    feedback: [
      {
        severity: "low",
        note: "User A's content edit is lost — it's overwritten by B's simultaneous block-type change. This is a consequence of the schema fix.",
      },
    ],
    title: "Edit text vs change to heading",
    category: "Type changes",
    description: "A edits the text while B promotes the block to a heading.",
    initial: [{ id: "block-hello", type: "paragraph", content: "hello world" }],
    applyA: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, {
        type: "paragraph",
        content: "hello universe",
      });
    },
    applyB: (editor) => {
      const [block] = editor.document;
      editor.updateBlock(block, { type: "heading", props: { level: 1 } });
    },
  },
  {
    kind: "concurrent",
    id: "concurrent-table-row-and-column",
    title: "Add row vs add column",
    category: "Tables",
    description: "A adds a row while B adds a column.",
    initial: [TABLE_2X2],
    applyA: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["A1", "B1"] },
            { cells: ["A2", "B2"] },
            { cells: ["A3", "B3"] },
          ],
        },
      }),
    applyB: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1", "B1", "C1"] }, { cells: ["A2", "B2", "C2"] }],
        },
      }),
  },
  {
    kind: "concurrent",
    id: "concurrent-table-addcol-vs-addrow",
    title: "Add column vs add row",
    category: "Tables",
    description: "A adds a column while B adds a row.",
    initial: [TABLE_2X2],
    applyA: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1", "B1", "C1"] }, { cells: ["A2", "B2", "C2"] }],
        },
      }),
    applyB: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["A1", "B1"] },
            { cells: ["A2", "B2"] },
            { cells: ["A3", "B3"] },
          ],
        },
      }),
  },
  {
    kind: "concurrent",
    id: "concurrent-table-row-vs-column",
    feedback: [
      {
        severity: "high",
        note: "Crashes — prosemirror-tables' fixTables treats the suggestion-marked table as malformed and feeds y-prosemirror a delta Yjs can't apply (lib0 'Unexpected case'). Confirmed via a fixTables on/off loop (25/25 crashes on, 0/25 off); fix is to block fixTablesKey transactions while suggestions are active, mirroring AIExtension during ai-writing.",
      },
    ],
    title: "Delete row vs add column",
    category: "Tables",
    description:
      "A deletes a row while B adds a column — known to crash the merge " +
      "(prosemirror-tables fixTables).",
    knownCrash: true,
    initial: [TABLE_2X2],
    applyA: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: { type: "tableContent", rows: [{ cells: ["A1", "B1"] }] },
      }),
    applyB: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1", "B1", "C1"] }, { cells: ["A2", "B2", "C2"] }],
        },
      }),
  },

  {
    kind: "concurrent",
    id: "concurrent-table-delcol-vs-addrow",
    title: "Delete column vs add row",
    feedback: [
      {
        severity: "high",
        note: "Diff seems weird and A2 in wrong place",
      },
    ],
    category: "Tables",
    description: "A deletes a column while B adds a row.",
    initial: [TABLE_2X2],
    applyA: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1"] }, { cells: ["A2"] }],
        },
      }),
    applyB: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["A1", "B1"] },
            { cells: ["A2", "B2"] },
            { cells: ["A3", "B3"] },
          ],
        },
      }),
  },
  {
    kind: "concurrent",
    id: "concurrent-table-seq-col-then-row",
    title: "A adds column then row, B adds column",
    category: "Tables",
    description: "A adds a column and then a row (two edits); B adds a column.",
    initial: [TABLE_2X2],
    applyA: (editor) => {
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1", "B1", "C1"] }, { cells: ["A2", "B2", "C2"] }],
        },
      });
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["A1", "B1", "C1"] },
            { cells: ["A2", "B2", "C2"] },
            { cells: ["A3", "B3", "C3"] },
          ],
        },
      });
    },
    applyB: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [{ cells: ["A1", "B1", "D1"] }, { cells: ["A2", "B2", "D2"] }],
        },
      }),
  },
  {
    kind: "concurrent",
    id: "concurrent-table-seq-row-then-col",
    title: "A adds row then column, B adds row",
    category: "Tables",
    description: "A adds a row and then a column (two edits); B adds a row.",
    initial: [TABLE_2X2],
    applyA: (editor) => {
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["A1", "B1"] },
            { cells: ["A2", "B2"] },
            { cells: ["A3", "B3"] },
          ],
        },
      });
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["A1", "B1", "C1"] },
            { cells: ["A2", "B2", "C2"] },
            { cells: ["A3", "B3", "C3"] },
          ],
        },
      });
    },
    applyB: (editor) =>
      editor.updateBlock("table", {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["A1", "B1"] },
            { cells: ["A2", "B2"] },
            { cells: ["D1", "D2"] },
          ],
        },
      }),
  },

  // --- Links ---
  {
    kind: "single",
    id: "add-link",
    title: "Add a link",
    category: "Links",
    description: "Turn part of a paragraph into a link.",
    initial: [{ id: "p", type: "paragraph", content: "Visit the site" }],
    apply: (editor) =>
      editor.updateBlock("p", {
        content: [
          { type: "text", text: "Visit ", styles: {} },
          { type: "link", href: "https://example.com", content: "the site" },
        ],
      }),
    feedback: [
      {
        severity: "low",
        note: "Hover needs to say link has been edited instead if 'create link'",
      },
    ],
  },
  {
    kind: "single",
    id: "edit-link",
    title: "Edit a link",
    category: "Links",
    description: "Change a link's URL and its text.",
    initial: [
      {
        id: "p",
        type: "paragraph",
        content: [
          { type: "text", text: "Visit ", styles: {} },
          {
            type: "link",
            href: "https://old.example.com",
            content: "the old site",
          },
        ],
      },
    ],
    apply: (editor) =>
      editor.updateBlock("p", {
        content: [
          { type: "text", text: "Visit ", styles: {} },
          {
            type: "link",
            href: "https://new.example.com",
            content: "the new site",
          },
        ],
      }),
    feedback: [
      {
        severity: "low",
        note: "Hover needs to say link has been edited instead if 'create link'",
      },
    ],
  },
  {
    kind: "single",
    id: "remove-link",
    title: "Remove a link",
    category: "Links",
    description: "Unlink a link, keeping its text.",
    initial: [
      {
        id: "p",
        type: "paragraph",
        content: [
          { type: "text", text: "Visit ", styles: {} },
          { type: "link", href: "https://example.com", content: "the site" },
        ],
      },
    ],
    apply: (editor) =>
      editor.updateBlock("p", {
        content: [{ type: "text", text: "Visit the site", styles: {} }],
      }),
    feedback: [
      {
        severity: "low",
        note: "Hover needs to say link has been edited instead if 'create link'",
      },
    ],
  },

  // --- Add / remove blocks: divider + empty blocks ---

  {
    kind: "single",
    id: "add-empty-block",
    title: "Add an empty block",
    category: "Add / remove blocks",
    description: "Insert an empty paragraph after a block.",
    initial: [{ id: "p", type: "paragraph", content: "A paragraph" }],
    apply: (editor) =>
      editor.insertBlocks([{ type: "paragraph" }], "p", "after"),
    feedback: [
      {
        severity: "low",
        note: "TBD: determine visual indicator on empty block",
      },
    ],
  },
  {
    kind: "single",
    id: "delete-one-empty",
    title: "Delete one of two empty blocks",
    category: "Add / remove blocks",
    description: "Two empty paragraphs — delete one.",
    initial: [
      { id: "e1", type: "paragraph" },
      { id: "e2", type: "paragraph" },
    ],
    apply: (editor) => editor.removeBlocks(["e2"]),
    feedback: [
      {
        severity: "low",
        note: "TBD: determine visual indicator on empty block",
      },
    ],
  },

  // --- Multi-column ---
  {
    kind: "single",
    id: "create-2-columns",
    title: "Create two columns",
    category: "Multi-column",
    description: "Insert a two-column layout after a paragraph.",
    initial: [{ id: "intro", type: "paragraph", content: "Intro paragraph" }],
    apply: (editor) =>
      editor.insertBlocks(
        [
          {
            type: "columnList",
            children: [
              {
                type: "column",
                children: [{ type: "paragraph", content: "Left column" }],
              },
              {
                type: "column",
                children: [{ type: "paragraph", content: "Right column" }],
              },
            ],
          },
        ],
        "intro",
        "after",
      ),
  },
  {
    kind: "single",
    id: "remove-1-column",
    title: "Remove a column",
    category: "Multi-column",
    description: "A two-column layout loses one of its columns.",
    initial: [
      {
        id: "cols",
        type: "columnList",
        children: [
          {
            id: "col-left",
            type: "column",
            children: [{ type: "paragraph", content: "Left column" }],
          },
          {
            id: "col-right",
            type: "column",
            children: [{ type: "paragraph", content: "Right column" }],
          },
        ],
      },
    ],
    apply: (editor) => editor.removeBlocks(["col-right"]),
  },
  {
    kind: "single",
    id: "remove-middle-column",
    title: "Remove a middle column",
    category: "Multi-column",
    description: "A three-column layout loses one of its columns.",
    initial: [
      {
        id: "cols",
        type: "columnList",
        children: [
          {
            id: "col-left",
            type: "column",
            children: [{ type: "paragraph", content: "Left column" }],
          },
          {
            id: "col-middle",
            type: "column",
            children: [{ type: "paragraph", content: "Middle column" }],
          },
          {
            id: "col-right",
            type: "column",
            children: [{ type: "paragraph", content: "Right column" }],
          },
        ],
      },
    ],
    apply: (editor) => editor.removeBlocks(["col-right"]),
  },
  {
    kind: "single",
    id: "add-block-to-column",
    title: "Add a block to a column",
    category: "Multi-column",
    description: "Insert a paragraph inside one column of a two-column layout.",
    initial: [
      {
        id: "cols",
        type: "columnList",
        children: [
          {
            id: "col-left",
            type: "column",
            children: [
              { id: "left-p", type: "paragraph", content: "Left column" },
            ],
          },
          {
            id: "col-right",
            type: "column",
            children: [{ type: "paragraph", content: "Right column" }],
          },
        ],
      },
    ],
    apply: (editor) =>
      editor.insertBlocks(
        [{ type: "paragraph", content: "Added to the left column" }],
        "left-p",
        "after",
      ),
  },

  // --- Large diffs (the shared testDocument — every block type at once) ---
  {
    kind: "single",
    id: "large-diff-add-all",
    title: "Add a whole document",
    category: "Large diffs",
    description:
      "Insert every block type from the shared test document at once — a stress test for large diffs.",
    initial: [{ id: "anchor", type: "paragraph", content: "Document start" }],
    apply: (editor) =>
      editor.insertBlocks(
        testDocument as unknown as GalleryPartialBlock[],
        "anchor",
        "after",
      ),
    feedback: [
      {
        severity: "high",
        note: "formatting changes should not show up in the diff, the diff should indicate content has been added",
      },
    ],
  },
  {
    kind: "single",
    id: "large-diff-delete-all",
    title: "Delete a whole document",
    category: "Large diffs",
    description:
      "Remove every block of the shared test document, leaving a single paragraph — a stress test for large diffs.",
    initial: testDocument as unknown as GalleryPartialBlock[],
    apply: (editor) =>
      editor.replaceBlocks(editor.document, [
        { type: "paragraph", content: "(all content removed)" },
      ]),
    feedback: [
      {
        severity: "high",
        note: "the 'all content removed' paragraph should show up below or above the document, not inside it",
      },
    ],
  },

  // --- Merge / split ---
  {
    kind: "concurrent",
    id: "concurrent-merge-vs-edit",
    title: "Merge blocks vs edit block B",
    category: "Merge / split",
    description:
      "User A merges block B into A (Backspace at the start of B); User B edits block B's text.",
    initial: [
      { id: "a", type: "paragraph", content: "First" },
      { id: "b", type: "paragraph", content: "Second" },
    ],
    applyA: (editor) => {
      editor.setTextCursorPosition("b", "start");
      pressKey(editor, "Backspace");
    },
    applyB: (editor) => editor.updateBlock("b", { content: "Second (edited)" }),
    feedback: [
      {
        severity: "low",
        note: "Content of User B is lost. This is not a regression related to diffs, but a known issue that can only be solved with a flat document model",
      },
    ],
  },
  {
    kind: "concurrent",
    id: "concurrent-split-vs-type",
    title: "Split a block vs type at end",
    category: "Merge / split",
    description:
      "User B splits the block in the middle (Enter); User A types at the end. Known not to work yet — needs a flat document model.",
    initial: [{ id: "p", type: "paragraph", content: "Hello world" }],
    applyB: (editor) => {
      editor._tiptapEditor.commands.setTextSelection(
        posBeforeText(editor, "world"),
      );
      pressKey(editor, "Enter");
    },
    applyA: (editor) => editor.updateBlock("p", { content: "Hello world!" }),
    feedback: [
      {
        severity: "low",
        note: "Broken merge: when one user splits a block while another edits it, the two edits can't be reconciled yet. A flat document model would be needed to resolve it.",
      },
    ],
  },
];
