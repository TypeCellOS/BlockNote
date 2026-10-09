/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import type { Block } from "../../blocks/defaultBlocks.js";
import { colorsForUserIds } from "../../user/index.js";
import { AttributionExtension } from "./AttributionExtension.js";
import { DiffVersioningExtension } from "./DiffVersioningExtension.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mounts: HTMLElement[] = [];

function createDiffEditor() {
  const editor = BlockNoteEditor.create({
    extensions: [DiffVersioningExtension()],
  });
  const mount = document.createElement("div");
  document.body.appendChild(mount);
  mounts.push(mount);
  editor.mount(mount);
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
    for (const mount of mounts.splice(0)) {
      mount.remove();
    }
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

  it("attributes every change to one synthetic author (userIds on the marks)", () => {
    const baseline = blocksFromText("hello world");
    const target = blocksFromText("hello there world");

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(target, baseline);

    const userIds = collectAttributedText(editor)
      .flatMap((t) => t.marks)
      .flatMap(([, ids]) => ids);

    // A version diff has no real authors: one synthetic id only colors the marks.
    expect(userIds.length).toBeGreaterThan(0);
    expect(new Set(userIds).size).toBe(1);
  });

  it("reports no authors when hovering a change", () => {
    const baseline = blocksFromText("hello world");
    const target = blocksFromText("hello new world");

    editor.getExtension(DiffVersioningExtension)!.renderDiff(target, baseline);

    editor.prosemirrorView.dom
      .querySelector("ins[data-user-ids]")!
      .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toMatchObject({
      modificationType: "insert",
      users: [],
    });
  });

  it("colors the diff author with the palette's blue, tint included", async () => {
    const baseline = blocksFromText("hello world");
    const target = blocksFromText("hello brave new world");

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
      light: "#c9dcff",
      dark: "#1e4fb0",
    });
  });

  it("reads a plain block's content as the newer version's text", () => {
    function codeBlock(code: string) {
      const e = BlockNoteEditor.create();
      e.replaceBlocks(e.document, [
        { id: "code", type: "codeBlock", content: code },
      ]);
      return e.document;
    }

    editor
      .getExtension(DiffVersioningExtension)!
      .renderDiff(codeBlock("y^3"), codeBlock("x^2"));

    // Previews (math, diagrams) render from this text, so it must not merge
    // the deleted source with its replacement ("xy^23").
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "y^3", styles: {} },
    ]);
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

  it("replacing the rendered blocks drops the attribution marks", () => {
    const baseline = blocksFromText("first version");
    const target = blocksFromText("second version");
    const restore = blocksFromText("live document");

    const diff = editor.getExtension(DiffVersioningExtension)!;
    diff.renderDiff(target, baseline);
    expect(attributionMarkNames(editor).size).toBeGreaterThan(0);

    editor.replaceBlocks(editor.document, restore);
    expect(attributionMarkNames(editor).size).toBe(0);
    expect(editor.prosemirrorState.doc.textContent).toBe("live document");
  });
});
