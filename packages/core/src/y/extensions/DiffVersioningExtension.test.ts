import { describe, expect } from "vite-plus/test";

import type { SetupEditor } from "../../../../../tests/src/commands/node/setupEditor.js";
import type { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { colorsForUserIds } from "../../user/index.js";
import { AttributionExtension } from "./AttributionExtension.js";
import { DiffVersioningExtension } from "./DiffVersioningExtension.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a `Block[]` fixture from a plain paragraph string using a throwaway
 * editor, mirroring the `mkSnap` pattern in `inMemoryVersioning.test.ts`.
 */
async function blocksFromText(
  setupEditor: SetupEditor,
  text: string,
  id = "block",
) {
  // The two versions of a diff are versions of one document: a block keeps
  // its ID. Thus, the block has a fixed ID by default.
  const { editor } = await setupEditor({
    initialContent: [{ id, type: "paragraph", content: text }],
  });
  return editor.document;
}

/**
 * Walk the rendered doc and collect, per text node, its text and the attribution
 * marks on it: `{ text, marks: [[markName, userIds], ...] }`. Only y-attributed-*
 * marks are recorded, so ordinary formatting doesn't pollute the assertion.
 */
function collectAttributedText(editor: BlockNoteEditor<any, any, any>) {
  const out: Array<{ text: string; marks: Array<[string, string[]]> }> = [];
  editor.transact(({ doc }) =>
    doc.descendants((node) => {
      if (node.isText) {
        const marks = node.marks
          .filter((m) => m.type.name.startsWith("y-attributed-"))
          .map(
            (m) =>
              [m.type.name, (m.attrs.userIds as string[]) ?? []] as [
                string,
                string[],
              ],
          );
        out.push({ text: node.text ?? "", marks });
      }
      return true;
    }),
  );
  return out;
}

function attributionMarkNames(
  editor: BlockNoteEditor<any, any, any>,
): Set<string> {
  const names = new Set<string>();
  editor.transact(({ doc }) =>
    doc.descendants((node) => {
      node.marks.forEach((m) => {
        if (m.type.name.startsWith("y-attributed-")) {
          names.add(m.type.name);
        }
      });
      return true;
    }),
  );
  return names;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

function setupDiffEditor(setupEditor: SetupEditor) {
  return setupEditor({ extensions: [DiffVersioningExtension()] });
}

describe("DiffVersioningExtension", () => {
  it("registers the y-attributed-* marks into the schema", async ({
    setupEditor,
  }) => {
    const { editor } = await setupDiffEditor(setupEditor);
    expect(editor.pmSchema.marks["y-attributed-insert"]).toBeDefined();
    expect(editor.pmSchema.marks["y-attributed-delete"]).toBeDefined();
    expect(editor.pmSchema.marks["y-attributed-format"]).toBeDefined();
  });

  it("renders insert/delete marks in the right positions for a known diff", async ({
    setupEditor,
  }) => {
    const { editor } = await setupDiffEditor(setupEditor);
    const baseline = await blocksFromText(setupEditor, "the quick brown fox");
    const target = await blocksFromText(
      setupEditor,
      "the slow brown fox jumps",
    );

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(target, baseline);

    const attributed = collectAttributedText(editor);

    // The rendered doc must contain both an insertion and a deletion.
    const names = attributionMarkNames(editor);
    expect(names.has("y-attributed-insert")).toBe(true);
    expect(names.has("y-attributed-delete")).toBe(true);

    // "quick" is only in the baseline -> deleted.
    const deleted = attributed
      .filter((t) => t.marks.some(([n]) => n === "y-attributed-delete"))
      .map((t) => t.text)
      .join("");
    expect(deleted).toContain("quick");

    // "slow" and "jumps" are only in the target -> inserted.
    const inserted = attributed
      .filter((t) => t.marks.some(([n]) => n === "y-attributed-insert"))
      .map((t) => t.text)
      .join("");
    expect(inserted).toContain("slow");
    expect(inserted).toContain("jumps");

    // Unchanged text ("brown fox") carries no attribution marks.
    const unchanged = attributed
      .filter((t) => t.marks.length === 0)
      .map((t) => t.text)
      .join("");
    expect(unchanged).toContain("brown fox");
  });

  it("shows a block with a different ID as a deleted block and an inserted block", async ({
    setupEditor,
  }) => {
    const { editor } = await setupDiffEditor(setupEditor);
    // The diff pairs blocks by their ID: these are two blocks, also with
    // text in common.
    const baseline = await blocksFromText(
      setupEditor,
      "the quick brown fox",
      "old",
    );
    const target = await blocksFromText(
      setupEditor,
      "the slow brown fox jumps",
      "new",
    );

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(target, baseline);

    const attributed = collectAttributedText(editor);
    const textWith = (mark: string) =>
      attributed
        .filter((t) => t.marks.some(([n]) => n === mark))
        .map((t) => t.text)
        .join("");
    expect(textWith("y-attributed-delete")).toBe("the quick brown fox");
    expect(textWith("y-attributed-insert")).toBe("the slow brown fox jumps");
    expect(attributed.filter((t) => t.marks.length === 0)).toEqual([]);
  });

  it("attributes every change to one synthetic author (userIds on the marks)", async ({
    setupEditor,
  }) => {
    const { editor } = await setupDiffEditor(setupEditor);
    const baseline = await blocksFromText(setupEditor, "hello world");
    const target = await blocksFromText(setupEditor, "hello there world");

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(target, baseline);

    const userIds = collectAttributedText(editor)
      .flatMap((t) => t.marks)
      .flatMap(([, ids]) => ids);

    // A version diff has no real authors: one synthetic id only colors the marks.
    expect(userIds.length).toBeGreaterThan(0);
    expect(new Set(userIds).size).toBe(1);
  });

  it("colors the diff author with the palette's blue, tint included", async ({
    setupEditor,
  }) => {
    const { editor } = await setupDiffEditor(setupEditor);
    const baseline = await blocksFromText(setupEditor, "hello world");
    const target = await blocksFromText(setupEditor, "hello brave new world");

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(target, baseline);

    const attribution = editor.getExtension(AttributionExtension)!;
    const authorId = collectAttributedText(editor)
      .flatMap((t) => t.marks)
      .flatMap(([, ids]) => ids)[0]!;
    await attribution.userStore.loadUsers([authorId]);

    // Both halves are set, so the marks and their tooltip use the tuned pair
    // rather than a tint derived from the saturated colour.
    expect(colorsForUserIds(attribution.userStore, [authorId])).toEqual({
      light: "#d6defd",
      dark: "#2948b3",
    });
  });

  it("reads a plain block's content as the newer version's text", async ({
    setupEditor,
  }) => {
    const { editor } = await setupDiffEditor(setupEditor);
    async function codeBlock(code: string) {
      const { editor: e } = await setupEditor();
      e.replaceBlocks(e.document, [
        { id: "code", type: "codeBlock", content: code },
      ]);
      return e.document;
    }

    editor
      .getExtension(DiffVersioningExtension)!
      .renderDiff(await codeBlock("y^3"), await codeBlock("x^2"));

    // Previews (math, diagrams) render from this text, so it must not merge
    // the deleted source with its replacement ("xy^23").
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "y^3", styles: {} },
    ]);
  });

  it("produces no attribution marks when the docs are identical", async ({
    setupEditor,
  }) => {
    const { editor } = await setupDiffEditor(setupEditor);
    const same = await blocksFromText(setupEditor, "nothing changes here");

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(same, same);

    expect(attributionMarkNames(editor).size).toBe(0);
    expect(editor.document[0].content).toEqual(same[0].content);
  });

  it("replacing the rendered blocks drops the attribution marks", async ({
    setupEditor,
  }) => {
    const { editor } = await setupDiffEditor(setupEditor);
    const baseline = await blocksFromText(setupEditor, "first version");
    const target = await blocksFromText(setupEditor, "second version");
    const restore = await blocksFromText(setupEditor, "live document");

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(target, baseline);
    expect(attributionMarkNames(editor).size).toBeGreaterThan(0);

    editor.replaceBlocks(editor.document, restore);
    expect(attributionMarkNames(editor).size).toBe(0);
    expect(editor.document).toEqual(restore);
  });
});
