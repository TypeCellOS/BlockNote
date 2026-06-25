import { BlockNoteEditor } from "@blocknote/core";
import type { Block } from "@blocknote/core";
import { buildSnapshots, seedYHubDocument } from "@blocknote/core/y";
import type { SnapshotStep } from "@blocknote/core/y";

/**
 * A sophisticated sample document, described as three named, attributed
 * versions. Seeding it builds real Yjs history (one version per step) and
 * PATCHes it to YHub, so the editor opens with rich content AND a populated
 * version history that exercises *many* different kinds of change:
 *
 *   - large rewrites of existing prose
 *   - inserting / removing blocks
 *   - moving blocks around (reordering, relocating a whole block)
 *   - building a table, then editing individual cells
 *   - promoting / demoting heading levels
 *   - swapping an image's `url` (src) and caption
 *   - check-list items being added and then checked off
 *   - quotes, code blocks, links and inline styling
 *
 * The subject is "Suggestion mode in Google Docs & how people use it" — a topic
 * that naturally invites lots of collaborative revision.
 */

// ---------------------------------------------------------------------------
// Small helpers so each step can find the blocks it needs by their text,
// rather than relying on brittle positional indexes that shift as the document
// grows. Block ids are non-deterministic in the example, so we navigate by
// content instead.
// ---------------------------------------------------------------------------

/** Flatten an inline-content array (text + links) down to plain text. */
function inlineText(content: any): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  return content
    .map((inline: any) => {
      if (inline.type === "text") {
        return inline.text as string;
      }
      if (inline.type === "link") {
        return inlineText(inline.content);
      }
      return "";
    })
    .join("");
}

/** Flatten a block's content (inline OR table cells) down to plain text. */
function blockText(block: Block): string {
  const content: any = block.content;
  if (content?.type === "tableContent") {
    return content.rows
      .map((row: any) =>
        row.cells
          .map((cell: any) =>
            inlineText(cell?.type === "tableCell" ? cell.content : cell),
          )
          .join(" "),
      )
      .join(" ");
  }
  return inlineText(content);
}

/** Depth-first walk over every block in the document. */
function walk(blocks: Block[], visit: (block: Block) => void): void {
  for (const block of blocks) {
    visit(block);
    if (block.children?.length) {
      walk(block.children, visit);
    }
  }
}

/** Find the first block whose plain text includes `needle`. */
function findByText(editor: BlockNoteEditor, needle: string): Block {
  let match: Block | undefined;
  walk(editor.document, (block) => {
    if (!match && blockText(block).includes(needle)) {
      match = block;
    }
  });
  if (!match) {
    throw new Error(`sampleDocument: no block containing "${needle}"`);
  }
  return match;
}

/** Find every block whose plain text includes `needle`, in document order. */
function findAllByText(editor: BlockNoteEditor, needle: string): Block[] {
  const matches: Block[] = [];
  walk(editor.document, (block) => {
    if (blockText(block).includes(needle)) {
      matches.push(block);
    }
  });
  return matches;
}

// ---------------------------------------------------------------------------
// The steps. Each is one named version, attributed to a collaborator.
// ---------------------------------------------------------------------------

export const SAMPLE_STEPS: SnapshotStep[] = [
  {
    name: "Draft the skeleton and core prose",
    attribution: { by: "Alice" },
    changes: (editor) => {
      // --- Start from a blank doc and lay down a skeleton with placeholders.
      editor.replaceBlocks(editor.document, [
        {
          type: "heading",
          props: { level: 1 },
          content: "Suggestion Mode in Google Docs",
        },
        {
          type: "paragraph",
          content: "A quick doc about the suggesting feature. TODO: flesh out.",
        },
        {
          type: "heading",
          props: { level: 2 },
          content: "Overview",
        },
        {
          type: "paragraph",
          content: "TODO: explain what suggesting mode is.",
        },
        {
          // A dedicated placeholder that survives the later prose rewrites, so
          // the final trim step at the end has something to do.
          type: "paragraph",
          content: "TODO: add real-world examples before publishing.",
        },
      ]);

      // --- Large rewrite: replace both placeholder paragraphs with real prose.
      const intro = findByText(editor, "A quick doc about");
      editor.updateBlock(intro, {
        content:
          "Suggestion mode (also called “Suggesting”) lets collaborators " +
          "propose edits to a document without changing it outright. Every " +
          "insertion, deletion, and formatting tweak shows up as a coloured, " +
          "reviewable suggestion that the owner can accept or reject.",
      });

      const overview = findByText(editor, "explain what suggesting mode is");
      editor.updateBlock(overview, {
        content:
          "Where Editing mode writes changes directly into the document, " +
          "Suggesting mode records them as proposals. This makes it the " +
          "default way teams review contracts, essays, and shared specs — " +
          "the original text is never lost while feedback is gathered.",
      });

      // --- Insert a "How to enable it" section after the Overview.
      const overviewForList = findByText(
        editor,
        "the default way teams review",
      );
      editor.insertBlocks(
        [
          {
            type: "heading",
            props: { level: 2 },
            content: "How to enable it",
          },
          {
            type: "bulletListItem",
            content: "Open the document you want to review.",
          },
          {
            type: "bulletListItem",
            content: "Click the Editing button in the top-right toolbar.",
          },
          {
            type: "bulletListItem",
            content: "Choose “Suggesting” from the dropdown.",
          },
          {
            type: "bulletListItem",
            content: "Start typing — your edits now appear as suggestions.",
          },
        ],
        overviewForList,
        "after",
      );

      // --- Append a personas section at the end of the document.
      const lastBlock = editor.document[editor.document.length - 1];
      editor.insertBlocks(
        [
          {
            type: "heading",
            props: { level: 2 },
            content: "Who uses suggesting mode",
          },
          {
            type: "bulletListItem",
            content: "Editors marking up drafts for writers.",
          },
          {
            type: "bulletListItem",
            content: "Lawyers redlining contracts before signing.",
          },
          {
            type: "bulletListItem",
            content: "Teachers leaving feedback on student essays.",
          },
          {
            type: "bulletListItem",
            content: "Teams reviewing specs without overwriting each other.",
          },
        ],
        lastBlock,
        "after",
      );
    },
  },

  {
    name: "Build out structure, tables and media",
    attribution: { by: "Bob" },
    changes: (editor) => {
      // --- Insert a heading + a 4x3 comparison table after the Overview.
      const overview = findByText(editor, "the default way teams review");
      editor.insertBlocks(
        [
          {
            type: "heading",
            props: { level: 2 },
            content: "Editing vs. Suggesting vs. Viewing",
          },
          {
            type: "table",
            content: {
              type: "tableContent",
              columnWidths: [160, 200, 220],
              headerRows: 1,
              rows: [
                {
                  cells: ["Mode", "What it does", "Best for"],
                },
                {
                  cells: [
                    "Editing",
                    "Writes changes directly",
                    "Solo work, final cleanup",
                  ],
                },
                {
                  cells: [
                    "Suggesting",
                    "Records changes as proposals",
                    "Reviews and redlines",
                  ],
                },
                {
                  cells: [
                    "Viewing",
                    "Read-only, no changes",
                    "Sharing a finished doc",
                  ],
                },
              ],
            },
          },
        ],
        overview,
        "after",
      );

      // --- Edit a single cell: broaden "Solo work, final cleanup".
      const tableToFix = findAllByText(editor, "Solo work, final cleanup")[0];
      const fixContent = tableToFix.content as any;
      editor.updateBlock(tableToFix, {
        content: {
          type: "tableContent",
          columnWidths: fixContent.columnWidths,
          headerRows: fixContent.headerRows,
          rows: fixContent.rows.map((row: any) => ({
            cells: row.cells.map((cell: any) => {
              const text = inlineText(
                cell?.type === "tableCell" ? cell.content : cell,
              );
              return text === "Solo work, final cleanup"
                ? "Solo writing and final cleanup"
                : cell;
            }),
          })),
        },
      });

      // --- Drop a placeholder image under the "How to enable it" steps.
      const lastStep = findByText(
        editor,
        "Start typing — your edits now appear as suggestions.",
      );
      editor.insertBlocks(
        [
          {
            type: "image",
            props: {
              url: "https://placehold.co/640x360?text=screenshot+coming+soon",
              caption: "Placeholder — replace with a real screenshot.",
              previewWidth: 640,
            },
          },
        ],
        lastStep,
        "after",
      );

      // --- Swap the placeholder image for a real asset and rewrite its caption.
      const image = editor.document
        .flatMap((b) => [b, ...b.children])
        .find((b) => b.type === "image");
      if (!image) {
        throw new Error("sampleDocument: expected an image block to update");
      }
      editor.updateBlock(image, {
        props: {
          url: "https://placehold.co/640x360?text=screenshot",
          caption: "The Suggesting toggle lives in the top-right toolbar.",
          previewWidth: 720,
        },
      });

      // --- Reorder: nudge "Choose Suggesting" up one position.
      const step = findByText(editor, "Choose “Suggesting” from the dropdown.");
      editor.moveBlocksUp(step);

      // --- Relocate the whole comparison table next to "Who uses it".
      const table = findAllByText(editor, "What it does")[0];
      const tableContent = table.content as any;
      const heading = findAllByText(editor, "Editing vs. Suggesting vs.")[0];
      const anchor = findByText(editor, "Who uses suggesting mode");
      editor.removeBlocks([table, heading]);
      editor.insertBlocks(
        [
          {
            type: "heading",
            props: { level: 2 },
            content: "Editing vs. Suggesting vs. Viewing",
          },
          { type: "table", content: tableContent },
        ],
        anchor,
        "before",
      );

      // --- Demote the comparison + personas headings from H2 to H3.
      const compare = findByText(editor, "Editing vs. Suggesting vs.");
      editor.updateBlock(compare, { type: "heading", props: { level: 3 } });
      const who = findByText(editor, "Who uses suggesting mode");
      editor.updateBlock(who, { type: "heading", props: { level: 3 } });
    },
  },

  {
    name: "Polish, automate and finalize",
    attribution: { by: "Carol" },
    changes: (editor) => {
      // --- Append a best-practices checklist at the end of the document.
      const lastForChecklist = editor.document[editor.document.length - 1];
      editor.insertBlocks(
        [
          {
            type: "heading",
            props: { level: 2 },
            content: "Best practices",
          },
          {
            type: "checkListItem",
            props: { checked: false },
            content: "Leave a short comment explaining each suggestion.",
          },
          {
            type: "checkListItem",
            props: { checked: false },
            content: "Resolve suggestions in batches to keep history clean.",
          },
          {
            type: "checkListItem",
            props: { checked: false },
            content: "Switch back to Editing only once review is finished.",
          },
        ],
        lastForChecklist,
        "after",
      );

      // --- Toggle two of the checklist items to done.
      const firstItem = findByText(
        editor,
        "Leave a short comment explaining each suggestion.",
      );
      editor.updateBlock(firstItem, { props: { checked: true } });
      const secondItem = findByText(
        editor,
        "Resolve suggestions in batches to keep history clean.",
      );
      editor.updateBlock(secondItem, { props: { checked: true } });

      // --- Insert a quote block after the best-practices heading.
      const bestPractices = findByText(editor, "Best practices");
      editor.insertBlocks(
        [
          {
            type: "quote",
            content:
              "Pro tip: press Ctrl+Alt+Shift+Z to jump between suggestions " +
              "without reaching for the mouse.",
          },
        ],
        bestPractices,
        "after",
      );

      // --- Add a code block showing how power users bulk-accept suggestions.
      const lastForCode = editor.document[editor.document.length - 1];
      editor.insertBlocks(
        [
          {
            type: "heading",
            props: { level: 2 },
            content: "Automating review",
          },
          {
            type: "paragraph",
            content:
              "Power users script repetitive review work. This Apps Script " +
              "accepts every outstanding suggestion in the active document:",
          },
          {
            type: "codeBlock",
            props: { language: "javascript" },
            content:
              "function acceptAllSuggestions() {\n" +
              "  const doc = DocumentApp.getActiveDocument();\n" +
              "  doc.getSuggestions().forEach((s) => s.accept());\n" +
              "}",
          },
        ],
        lastForCode,
        "after",
      );

      // --- Append a fresh conclusion section that ties it together.
      const lastForConclusion = editor.document[editor.document.length - 1];
      editor.insertBlocks(
        [
          {
            type: "heading",
            props: { level: 2 },
            content: "Wrapping up",
          },
          {
            type: "paragraph",
            content:
              "Suggesting mode turns a document into a conversation. By " +
              "keeping every proposed change visible and reversible, it lets " +
              "teams move fast without losing the paper trail — which is " +
              "exactly why it has become the backbone of collaborative " +
              "editing far beyond Google Docs.",
          },
        ],
        lastForConclusion,
        "after",
      );

      // --- Rich inline content: restyle the intro with bold text and a link.
      const intro = findByText(editor, "Suggestion mode (also called");
      editor.updateBlock(intro, {
        content: [
          { type: "text", text: "Suggestion mode", styles: { bold: true } },
          {
            type: "text",
            text:
              " (also called “Suggesting”) lets collaborators propose " +
              "edits without changing the document outright. See the ",
            styles: {},
          },
          {
            type: "link",
            href: "https://support.google.com/docs/answer/6033474",
            content: "official guide",
          },
          {
            type: "text",
            text: " for the full walkthrough.",
            styles: {},
          },
        ],
      });

      // --- Remove any leftover placeholder TODO lines.
      const leftovers = findAllByText(editor, "TODO");
      if (leftovers.length > 0) {
        editor.removeBlocks(leftovers);
      }
    },
  },
];

/**
 * Build the sample document's history offline and seed it to YHub under the
 * given coordinates, so the live editor syncs the content and the version
 * sidebar shows one snapshot per step.
 *
 * The `fragment` must match the key the live editor reads (`doc.get(fragment)`).
 */
export async function seedSampleVersions(opts: {
  baseUrl: string;
  org: string;
  docId: string;
  fragment: string;
}): Promise<void> {
  const editor = BlockNoteEditor.create();
  const build = await buildSnapshots(editor, SAMPLE_STEPS, {
    fragment: opts.fragment,
  });
  await seedYHubDocument(opts, build);
}
