/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { Block } from "../../blocks/defaultBlocks.js";
import { AttributionExtension } from "./AttributionExtension.js";
import { DiffVersioningExtension } from "./DiffVersioningExtension.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createDiffEditor() {
  const editor = BlockNoteEditor.create({
    extensions: [DiffVersioningExtension()],
  });
  editor.mount(document.createElement("div"));
  return editor;
}

/**
 * Build a `Block[]` fixture from a plain paragraph string using a throwaway
 * editor, mirroring the `mkSnap` pattern in `inMemoryVersioning.test.ts`.
 */
function blocksFromText(text: string): Block<any, any, any>[] {
  const e = BlockNoteEditor.create();
  e.mount(document.createElement("div"));
  e.replaceBlocks(e.document, [{ type: "paragraph", content: text }]);
  const blocks = e.document;
  e.unmount();
  return blocks;
}

/**
 * Walk the rendered doc and collect, per text node, its text and the attribution
 * marks on it: `{ text, marks: [[markName, userIds], ...] }`. Only y-attributed-*
 * marks are recorded, so ordinary formatting doesn't pollute the assertion.
 */
function collectAttributedText(editor: BlockNoteEditor<any, any, any>) {
  const out: Array<{ text: string; marks: Array<[string, string[]]> }> = [];
  editor.prosemirrorState.doc.descendants((node) => {
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
  });
  return out;
}

function attributionMarkNames(
  editor: BlockNoteEditor<any, any, any>,
): Set<string> {
  const names = new Set<string>();
  editor.prosemirrorState.doc.descendants((node) => {
    node.marks.forEach((m) => {
      if (m.type.name.startsWith("y-attributed-")) {
        names.add(m.type.name);
      }
    });
    return true;
  });
  return names;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DiffVersioningExtension", () => {
  let editor: BlockNoteEditor<any, any, any>;

  beforeEach(() => {
    editor = createDiffEditor();
  });

  afterEach(() => {
    editor.unmount();
  });

  it("registers the y-attributed-* marks into the schema", () => {
    expect(editor.pmSchema.marks["y-attributed-insert"]).toBeDefined();
    expect(editor.pmSchema.marks["y-attributed-delete"]).toBeDefined();
    expect(editor.pmSchema.marks["y-attributed-format"]).toBeDefined();
  });

  it("renders insert/delete marks in the right positions for a known diff", () => {
    const baseline = blocksFromText("the quick brown fox");
    const target = blocksFromText("the slow brown fox jumps");

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

  it("attributes the diff to the version author id (userIds on the marks)", () => {
    const baseline = blocksFromText("hello world");
    const target = blocksFromText("hello there world");

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(target, baseline, "My version");

    const attributed = collectAttributedText(editor);
    const insertUserIds = attributed
      .flatMap((t) => t.marks)
      .filter(([n]) => n === "y-attributed-insert")
      .flatMap(([, ids]) => ids);

    // A version diff has one synthetic author (the version). Its id encodes the
    // version label, so the tooltip resolves to that name.
    expect(insertUserIds).toContain("version:My version");
  });

  it("resolves the diff author to the version's name (tooltip label)", async () => {
    const baseline = blocksFromText("hello world");
    const target = blocksFromText("hello brave new world");

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(target, baseline, "Draft 3");

    // The version name is surfaced by resolving the marks' author id through the
    // composed AttributionExtension's user store — this is what the hover tooltip
    // shows ("…by {name}").
    const attribution = editor.getExtension(AttributionExtension)!;
    const authorId = "version:Draft 3";
    await attribution.userStore.loadUsers([authorId]);
    expect(attribution.userStore.getUser(authorId)?.username).toBe("Draft 3");
  });

  it("produces no attribution marks when the docs are identical", () => {
    const same = blocksFromText("nothing changes here");

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(same, same);

    expect(attributionMarkNames(editor).size).toBe(0);
    expect(editor.prosemirrorState.doc.textContent).toContain(
      "nothing changes here",
    );
  });

  it("clearDiff restores plain content with no attribution marks", () => {
    const baseline = blocksFromText("first version");
    const target = blocksFromText("second version");
    const restore = blocksFromText("live document");

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(target, baseline);
    expect(attributionMarkNames(editor).size).toBeGreaterThan(0);

    diff.clearDiff(restore);
    expect(attributionMarkNames(editor).size).toBe(0);
    expect(editor.prosemirrorState.doc.textContent).toBe("live document");
  });
});
