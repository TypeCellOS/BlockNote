import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import { getNodeById } from "../../api/nodeUtil.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { getBlockFromNodeView } from "./internal.js";

describe("getBlockFromNodeView", () => {
  let editor: BlockNoteEditor;

  beforeEach(() => {
    editor = BlockNoteEditor.create({
      trailingBlock: false,
      initialContent: [
        { type: "paragraph", content: "first" },
        { type: "paragraph", content: "second" },
      ],
    });
  });

  afterEach(() => {
    // Leaving the editor alive leaks a ProseMirror `DOMObserver`, whose
    // `stop()` schedules a `flush()` 20ms later. That can outlive the test
    // environment and then fail the run with `ReferenceError: document is not
    // defined`, attributed to whichever test file happens to be running.
    editor._tiptapEditor.destroy();
    editor = undefined as any;
  });

  it("resolves from the position when it is valid", () => {
    const doc = editor.prosemirrorState.doc;
    const target = editor.document[1];
    // `getBlockFromPos` resolves the *parent* of the position, so the position
    // sits just inside the block container — which is what ProseMirror hands a
    // node view.
    const pos = getNodeById(target.id, doc)!.posBeforeNode + 1;
    const block = getBlockFromNodeView(() => pos, doc.nodeAt(pos)!, doc) as any;

    expect(block.id).toBe(target.id);
  });

  it("builds a standalone block when the node is no longer in the document", () => {
    // The only way `getPos()` fails at node view construction is a re-entrant
    // dispatch superseding `view.state.doc`, which takes the node with it — so
    // the node genuinely isn't in the document any more. See #2937.
    const doc = editor.prosemirrorState.doc;
    const orphan = editor.pmSchema.nodes.paragraph.create(
      { textAlignment: "right" },
      editor.pmSchema.text("orphaned content"),
    );
    const block = getBlockFromNodeView(
      () => doc.content.size + 1000,
      orphan,
      doc,
    ) as any;

    // Everything readable off the node is correct...
    expect(block.type).toBe("paragraph");
    expect(block.props.textAlignment).toBe("right");
    expect(block.content[0].text).toBe("orphaned content");
    // ...but the id belongs to no block in the document, so it must not
    // collide with a real one.
    expect(editor.document.map((b) => b.id)).not.toContain(block.id);
  });

  it("recovers from an in-range position that resolves to the wrong node", () => {
    // Position 0 resolves to the doc rather than a block container — the shape
    // a bounds check alone would not catch.
    const doc = editor.prosemirrorState.doc;
    const orphan = editor.pmSchema.nodes.paragraph.create(
      null,
      editor.pmSchema.text("orphaned content"),
    );
    expect(() => getBlockFromNodeView(() => 0, orphan, doc)).not.toThrow();
  });

  it("recovers when the position is undefined", () => {
    const doc = editor.prosemirrorState.doc;
    const orphan = editor.pmSchema.nodes.paragraph.create(
      null,
      editor.pmSchema.text("orphaned content"),
    );
    expect(() =>
      getBlockFromNodeView(() => undefined, orphan, doc),
    ).not.toThrow();
  });
});
