/**
 * Full-editor (production-readiness) attribution tests.
 *
 * Unlike attribution.test.ts - which drives raw ProseMirror views over the bare
 * schema - these mount real `BlockNoteEditor` instances, so they exercise
 * UniqueID and every other extension. That is where non-convergence / infinite
 * reconcile loops surface: a reconcile that injects non-deterministic values
 * (e.g. random v4() block ids) never equals what Yjs holds, so the sync plugin
 * reconciles forever and the browser freezes.
 *
 * Each edit is asserted to settle in a small, BOUNDED number of transactions. A
 * runaway loop trips the >300 guard in the harness and fails fast instead of
 * hanging the test runner (the exact symptom the user reported).
 */
import { describe, expect, it } from "vitest";
import * as Y from "@y/y";
import { Node } from "prosemirror-model";
import { TextSelection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

type Peer = { editor: BlockNoteEditor; view: EditorView; tx: () => number };
type Cohort = { base: Peer; view: Peer; sugg: Peer };

function countingPeer(editor: BlockNoteEditor): Peer {
  let count = 0;
  editor._tiptapEditor.on("transaction", () => {
    count++;
    // Break a runaway reconcile loop synchronously so the test fails fast
    // instead of freezing the runner.
    if (count > 300) {
      throw new Error(
        "suggestion-mode reconcile did not converge (>300 transactions) - infinite loop",
      );
    }
  });
  editor.mount(document.createElement("div"));
  return { editor, view: editor.prosemirrorView!, tx: () => count };
}

/**
 * base + view-suggestions + suggestion-mode cohort over a shared
 * DiffAttributionManager, seeded with `initialBlocks`.
 *
 *   base : committed document (initializer, no AM).
 *   view : AM, suggestionMode = false (sees suggestions; its edits commit).
 *   sugg : AM, suggestionMode = true  (its edits stay as suggestions).
 *
 * view <-> sugg are two-way synced; base auto-forwards to both via the AMs.
 */
function createCohort(initialBlocks: any[]): Cohort {
  const baseDoc = new Y.Doc({ gc: false, guid: "base" });
  (baseDoc as any).clientID = 1;
  const viewDoc = new Y.Doc({ isSuggestionDoc: true, gc: false, guid: "view" });
  (viewDoc as any).clientID = 2;
  const suggDoc = new Y.Doc({ isSuggestionDoc: true, gc: false, guid: "sugg" });
  (suggDoc as any).clientID = 3;

  const attrs = new Y.Attributions();
  const viewAM = Y.createAttributionManagerFromDiff(baseDoc, viewDoc, {
    attrs,
  } as any);
  (viewAM as any).suggestionMode = false;
  const suggAM = Y.createAttributionManagerFromDiff(baseDoc, suggDoc, {
    attrs,
  } as any);
  (suggAM as any).suggestionMode = true;

  // two-way sync between the suggestion peers
  Y.applyUpdate(suggDoc, Y.encodeStateAsUpdate(viewDoc));
  Y.applyUpdate(viewDoc, Y.encodeStateAsUpdate(suggDoc));
  viewDoc.on("update", (u: Uint8Array) => Y.applyUpdate(suggDoc, u));
  suggDoc.on("update", (u: Uint8Array) => Y.applyUpdate(viewDoc, u));

  // Only the base peer initializes (createAndFill) and seeds; its updates flow
  // to the suggestion docs through the AMs so they never independently fill.
  const base = countingPeer(
    BlockNoteEditor.create({
      collaboration: {
        fragment: baseDoc.get("doc") as any,
        user: { name: "base", color: "#000" },
      },
    }),
  );
  base.editor.replaceBlocks(base.editor.document, initialBlocks);

  const view = countingPeer(
    BlockNoteEditor.create({
      collaboration: {
        fragment: viewDoc.get("doc") as any,
        user: { name: "view", color: "#00f" },
        attributionManager: viewAM as any,
      },
    }),
  );
  const sugg = countingPeer(
    BlockNoteEditor.create({
      collaboration: {
        fragment: suggDoc.get("doc") as any,
        user: { name: "sugg", color: "#f00" },
        attributionManager: suggAM as any,
      },
    }),
  );

  return { base, view, sugg };
}

const json = (p: Peer) => JSON.stringify(p.view.state.doc.toJSON());

/** Position of the first blockContent node of the given canonical name. */
function blockContentPos(doc: Node, name: string): number {
  let found = -1;
  doc.descendants((node, p) => {
    if (found === -1 && node.type.name === name) {
      found = p;
      return false;
    }
    return undefined;
  });
  return found;
}

/** End-of-text position (just after the last text node). */
function endOfText(doc: Node): number {
  let pos = 1;
  doc.descendants((node, p) => {
    if (node.isText) {
      pos = p + node.nodeSize;
    }
  });
  return pos;
}

/**
 * Type `text` character by character through the real input pipeline (firing
 * input rules via `handleTextInput`), as a user would - so markdown shortcuts
 * like `# ` actually run.
 */
function typeText(p: Peer, text: string) {
  const view = p.view;
  for (const ch of text) {
    const from = view.state.selection.from;
    const handled = view.someProp("handleTextInput", (f: any) =>
      f(view, from, from, ch),
    );
    if (!handled) {
      const tr = view.state.tr.insertText(ch, from);
      tr.setSelection(TextSelection.create(tr.doc, from + ch.length));
      view.dispatch(tr);
    }
  }
}

/** Place the collapsed cursor inside the first block of the given name. */
function cursorInBlock(p: Peer, name: string) {
  const pos = blockContentPos(p.view.state.doc, name) + 1;
  p.view.dispatch(
    p.view.state.tr.setSelection(
      TextSelection.create(p.view.state.doc, pos),
    ),
  );
}

/** Suggest a block-type flip; returns the number of transactions it took. */
function flip(p: Peer, fromName: string, toName: string, attrs?: any): number {
  const before = p.tx();
  const pos = blockContentPos(p.view.state.doc, fromName);
  const type = p.editor.pmSchema.nodes[toName];
  p.view.dispatch(
    p.view.state.tr.setNodeMarkup(pos, type, {
      ...(type as any).defaultAttrs,
      ...attrs,
    }),
  );
  return p.tx() - before;
}

describe("BlockNote attribution (full editor)", () => {
  it("a suggested heading->paragraph flip converges and renders both variants", () => {
    const c = createCohort([
      { type: "heading", props: { level: 1 }, content: "Title" },
    ]);

    const txns = flip(c.sugg, "heading", "paragraph");

    // CONVERGENCE: bounded transactions (a loop would blow past 300 + throw).
    expect(txns).toBeLessThan(30);

    // RENDERING: old heading shown as a deletion, new paragraph as an insertion.
    const s = json(c.sugg);
    expect(s).toContain("heading--attributed");
    expect(s).toContain("paragraph--attributed");
    expect(s).toContain("y-attributed-delete");
    expect(s).toContain("y-attributed-insert");

    // The committed base is untouched.
    expect(c.base.editor.document[0].type).toBe("heading");
    expect(json(c.base)).not.toContain("--attributed");
  });

  it("a suggested paragraph->heading flip converges and renders both variants", () => {
    const c = createCohort([{ type: "paragraph", content: "Body" }]);

    const txns = flip(c.sugg, "paragraph", "heading", { level: 2 });

    expect(txns).toBeLessThan(30);
    const s = json(c.sugg);
    expect(s).toContain("paragraph--attributed");
    expect(s).toContain("heading--attributed");
    expect(s).toContain("y-attributed-delete");
    expect(s).toContain("y-attributed-insert");
    expect(c.base.editor.document[0].type).toBe("paragraph");
  });

  it("a suggested text insert converges and renders as an insertion", () => {
    const c = createCohort([{ type: "paragraph", content: "Hello" }]);

    const before = c.sugg.tx();
    c.sugg.view.dispatch(
      c.sugg.view.state.tr.insertText(" World", endOfText(c.sugg.view.state.doc)),
    );
    expect(c.sugg.tx() - before).toBeLessThan(30);

    expect(json(c.sugg)).toContain("y-attributed-insert");
    expect(json(c.sugg)).toContain(" World");
    // base unchanged + clean
    expect(json(c.base)).toContain('"text":"Hello"');
    expect(json(c.base)).not.toContain("y-attributed");
  });

  it("a suggested text delete converges and renders as a deletion (text retained)", () => {
    const c = createCohort([{ type: "paragraph", content: "Hello World" }]);

    const before = c.sugg.tx();
    const end = endOfText(c.sugg.view.state.doc);
    c.sugg.view.dispatch(c.sugg.view.state.tr.delete(end - 6, end));
    expect(c.sugg.tx() - before).toBeLessThan(30);

    expect(json(c.sugg)).toContain("y-attributed-delete");
    expect(json(c.sugg)).toContain("World");
    expect(json(c.base)).toContain('"text":"Hello World"');
  });

  it("several sequential suggestions each converge (no accumulating loop)", () => {
    const c = createCohort([
      { type: "heading", props: { level: 1 }, content: "Title" },
    ]);

    // flip, then type, then flip back - each step must settle on its own.
    expect(flip(c.sugg, "heading", "paragraph")).toBeLessThan(30);

    const before = c.sugg.tx();
    c.sugg.view.dispatch(
      c.sugg.view.state.tr.insertText("!", endOfText(c.sugg.view.state.doc)),
    );
    expect(c.sugg.tx() - before).toBeLessThan(30);

    expect(flip(c.sugg, "paragraph", "heading", { level: 2 })).toBeLessThan(30);

    // still a single, structurally valid document
    expect(() => c.sugg.view.state.doc.check()).not.toThrow();
  });

  it("typing the '# ' markdown shortcut in suggestion mode converts to a heading and converges (no freeze)", async () => {
    // The demo's exact repro: an empty committed paragraph, turned into a
    // heading by typing `# `. This goes through @handlewithcare's input-rule
    // runner, whose split dispatch used to throw "Applying a mismatched
    // transaction" against the synchronous attribution reconcile - which,
    // mid-input, desynced the DOM observer and froze the browser.
    const c = createCohort([{ type: "paragraph", content: "" }]);
    cursorInBlock(c.sugg, "paragraph");

    const before = c.sugg.tx();
    let threw = "";
    try {
      typeText(c.sugg, "# ");
    } catch (e: any) {
      threw = e.message;
    }
    // the block-type change is deferred to a microtask - let it run
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(threw).toBe("");
    expect(c.sugg.tx() - before).toBeLessThan(40);

    const s = json(c.sugg);
    // converted to a heading, rendered as an inserted suggestion
    expect(s).toContain("heading--attributed");
    expect(s).toContain("y-attributed-insert");
    // the markdown trigger text was stripped (no literal "# " left behind)
    expect(s).not.toContain('"# "');
    // peers still converge
    expect(json(c.sugg)).toEqual(json(c.view));
  });

  it("suggestion-mode and view-suggestions peers converge to the same rendering", () => {
    const c = createCohort([{ type: "paragraph", content: "shared" }]);

    c.sugg.view.dispatch(
      c.sugg.view.state.tr.insertText("!", endOfText(c.sugg.view.state.doc)),
    );
    flip(c.sugg, "paragraph", "heading", { level: 3 });

    // both suggestion peers render the identical attributed document
    expect(json(c.sugg)).toEqual(json(c.view));
    expect(json(c.sugg)).toContain("y-attributed-insert");
  });

  // Production-readiness fuzz: many random suggestion-mode edits, asserting that
  // every single edit converges (bounded transactions), peers stay consistent,
  // and every document remains structurally valid.
  it("fuzz: random suggestion-mode edits always converge and stay valid", () => {
    // deterministic LCG (env may block Math.random/Date.now)
    let seed = 99991;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const randInt = (n: number) => Math.floor(rand() * n) % Math.max(1, n);

    const c = createCohort([
      { type: "paragraph", content: "The quick brown fox" },
    ]);
    const v = c.sugg;

    for (let i = 0; i < 40; i++) {
      const before = v.tx();
      const size = v.view.state.doc.content.size;
      const lo = 4;
      const hi = Math.max(lo + 1, size - 4);
      const a = lo + randInt(hi - lo);
      const b = Math.min(a + 1 + randInt(3), hi);
      try {
        const op = randInt(4);
        if (op === 0) {
          v.view.dispatch(v.view.state.tr.insertText("x", a));
        } else if (op === 1 && b > a) {
          v.view.dispatch(v.view.state.tr.delete(a, b));
        } else if (op === 2 && b > a) {
          v.view.dispatch(
            v.view.state.tr.addMark(a, b, v.editor.pmSchema.marks["bold"].create()),
          );
        } else {
          // a block-type flip toward heading or back to paragraph
          const para = blockContentPos(v.view.state.doc, "paragraph");
          const head = blockContentPos(v.view.state.doc, "heading");
          if (para !== -1) {
            v.view.dispatch(
              v.view.state.tr.setNodeMarkup(
                para,
                v.editor.pmSchema.nodes["heading"],
                { ...(v.editor.pmSchema.nodes["heading"] as any).defaultAttrs },
              ),
            );
          } else if (head !== -1) {
            v.view.dispatch(
              v.view.state.tr.setNodeMarkup(
                head,
                v.editor.pmSchema.nodes["paragraph"],
                {
                  ...(v.editor.pmSchema.nodes["paragraph"] as any).defaultAttrs,
                },
              ),
            );
          }
        }
      } catch {
        // schema-invalid edits are skipped, same as the y-prosemirror fuzzer
      }
      // EVERY edit must converge on its own - this is the core guarantee.
      expect(v.tx() - before).toBeLessThan(40);
    }

    // peers stay consistent and every document is valid
    expect(json(c.sugg)).toEqual(json(c.view));
    expect(() => c.sugg.view.state.doc.check()).not.toThrow();
    expect(() => c.view.view.state.doc.check()).not.toThrow();
    expect(() => c.base.view.state.doc.check()).not.toThrow();
    // the committed base never absorbed a suggestion
    expect(json(c.base)).not.toContain("y-attributed");
  });
});
