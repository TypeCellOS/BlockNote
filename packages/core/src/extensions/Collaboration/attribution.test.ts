/**
 * Attribution test suite for BlockNote (suggestion mode + version diffs),
 * modeled on y-prosemirror's collaborative suggestion tests but exercised
 * against BlockNote's real ProseMirror schema (doc -> blockGroup ->
 * blockContainer -> blockContent), the canonical `y-attributed-*` marks, and
 * the `{name}--attributed` variant nodes.
 *
 * Mental model (see y-prosemirror cohort.js):
 *   - baseDoc      : the shared, committed document. Initialized once.
 *   - viewDoc      : a DiffAttributionManager over base, suggestionMode = false
 *                    ("view suggestions" - sees pending suggestions; its own
 *                    edits commit to base).
 *   - suggDoc      : a DiffAttributionManager over base, suggestionMode = true
 *                    ("suggestion mode" - its own edits stay as suggestions).
 *   viewDoc <-> suggDoc are kept in two-way sync. The AM auto-forwards base ->
 *   suggestion, so seeding base flows to every peer as committed (un-attributed)
 *   content.
 */
import { describe, expect, it } from "vitest";
import * as Y from "@y/y";
import {
  acceptAllChanges,
  configureYProsemirror,
  rejectAllChanges,
  syncPlugin,
} from "@y/prosemirror";
import { EditorState, Transaction } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Node } from "prosemirror-model";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";

// One editor instance only provides the (full) BlockNote pmSchema.
const blockNoteEditor = BlockNoteEditor.create();
const schema = blockNoteEditor.pmSchema;

const attributedNodes = (
  _n: string,
  k: { insert?: boolean; delete?: boolean; format?: boolean },
) => k.insert === true || k.delete === true || k.format === true;

function mkView(ytype: any, am?: any): EditorView {
  const view = new EditorView(
    { mount: document.createElement("div") },
    {
      state: EditorState.create({
        schema,
        plugins: [syncPlugin({ attributedNodes })],
      }),
    },
  );
  configureYProsemirror({ ytype, attributionManager: am })(
    view.state,
    view.dispatch,
  );
  return view;
}

function setupTwoWaySync(d1: Y.Doc, d2: Y.Doc) {
  Y.applyUpdate(d2, Y.encodeStateAsUpdate(d1));
  Y.applyUpdate(d1, Y.encodeStateAsUpdate(d2));
  d1.on("update", (u: Uint8Array) => Y.applyUpdate(d2, u));
  d2.on("update", (u: Uint8Array) => Y.applyUpdate(d1, u));
}

type Cohort = {
  baseDoc: Y.Doc;
  baseView: EditorView;
  viewView: EditorView;
  viewAM: any;
  suggView: EditorView;
  suggAM: any;
};

/**
 * Build a base + view-suggestions + suggestion-mode cohort, seeded with a single
 * paragraph of `text`.
 */
function createCohort(text: string): Cohort {
  const baseDoc = new Y.Doc({ gc: false, guid: "base" });
  (baseDoc as any).clientID = 1;
  const viewDoc = new Y.Doc({ isSuggestionDoc: true, gc: false, guid: "view" });
  (viewDoc as any).clientID = 2;
  const suggDoc = new Y.Doc({ isSuggestionDoc: true, gc: false, guid: "sugg" });
  (suggDoc as any).clientID = 3;

  const attrs = new Y.Attributions();
  // AMs first (docs empty) so base seeding forwards to every peer as committed.
  const viewAM = Y.createAttributionManagerFromDiff(baseDoc, viewDoc, {
    attrs,
  } as any);
  (viewAM as any).suggestionMode = false;
  const suggAM = Y.createAttributionManagerFromDiff(baseDoc, suggDoc, {
    attrs,
  } as any);
  (suggAM as any).suggestionMode = true;
  setupTwoWaySync(viewDoc, suggDoc);

  // Only the base view initializes (createAndFill) and seeds; its updates flow
  // to the suggestion docs through the AMs, so they never independently fill.
  const baseView = mkView(baseDoc.get("doc"));
  baseView.dispatch(baseView.state.tr.insertText(text));

  const viewView = mkView(viewDoc.get("doc"), viewAM);
  const suggView = mkView(suggDoc.get("doc"), suggAM);

  return { baseDoc, baseView, viewView, viewAM, suggView, suggAM };
}

/** Position just after the last text node (end of content). */
function endOfText(doc: Node): number {
  let pos = 0;
  doc.descendants((node, p) => {
    if (node.isText) {
      pos = p + node.nodeSize;
    }
  });
  return pos;
}

/** Position of the first blockContent node (the paragraph/heading). */
function firstBlockContentPos(doc: Node): number {
  let found = -1;
  doc.descendants((node, p) => {
    if (found === -1 && node.type.isInGroup("blockContent")) {
      found = p;
      return false;
    }
    return undefined;
  });
  return found;
}

const json = (v: EditorView) => JSON.stringify(v.state.doc.toJSON());

describe("BlockNote attribution", () => {
  it("renders a suggestion-mode insert as y-attributed-insert; base stays clean", () => {
    const c = createCohort("Hello");
    c.suggView.dispatch(
      c.suggView.state.tr.insertText(" World", endOfText(c.suggView.state.doc)),
    );

    expect(json(c.baseView)).toContain('"text":"Hello"');
    expect(json(c.baseView)).not.toContain("y-attributed");
    expect(json(c.suggView)).toContain("y-attributed-insert");
    expect(json(c.suggView)).toContain(" World");
    // base content is NOT marked deleted in the suggestion view
    expect(json(c.suggView)).not.toContain("y-attributed-delete");
    // suggestion-mode and view-suggestions peers converge
    expect(json(c.suggView)).toEqual(json(c.viewView));
  });

  it("renders a suggestion-mode delete as y-attributed-delete; text is retained, base unchanged", () => {
    const c = createCohort("Hello World");
    // delete " World" (the last 6 chars) as a suggestion
    const end = endOfText(c.suggView.state.doc);
    c.suggView.dispatch(c.suggView.state.tr.delete(end - 6, end));

    // suggestion view keeps the text but marks it deleted
    expect(json(c.suggView)).toContain("y-attributed-delete");
    expect(json(c.suggView)).toContain("World");
    // base is untouched (suggestion not committed)
    expect(json(c.baseView)).toContain('"text":"Hello World"');
    expect(json(c.baseView)).not.toContain("y-attributed");
  });

  it("accepting a suggested insert merges it into base for all peers", () => {
    const c = createCohort("Hello");
    c.suggView.dispatch(
      c.suggView.state.tr.insertText(" World", endOfText(c.suggView.state.doc)),
    );
    expect(json(c.suggView)).toContain("y-attributed-insert");

    // accept from the view-suggestions peer (suggestionMode = false commits)
    acceptAllChanges()(c.viewView.state, (tr: Transaction) =>
      c.viewView.dispatch(tr),
    );

    // base now contains the merged text, with no attribution anywhere
    expect(json(c.baseView)).toContain("Hello World");
    expect(json(c.baseView)).not.toContain("y-attributed");
    expect(json(c.viewView)).not.toContain("y-attributed");
    expect(json(c.suggView)).not.toContain("y-attributed");
  });

  it("rejecting a suggested insert discards it everywhere", () => {
    const c = createCohort("Hello");
    c.suggView.dispatch(
      c.suggView.state.tr.insertText(" World", endOfText(c.suggView.state.doc)),
    );

    rejectAllChanges()(c.viewView.state, (tr: Transaction) =>
      c.viewView.dispatch(tr),
    );

    // the suggestion is gone; everyone shows the original "Hello"
    expect(json(c.suggView)).not.toContain(" World");
    expect(json(c.suggView)).not.toContain("y-attributed");
    expect(json(c.baseView)).toContain('"text":"Hello"');
  });

  it("a suggested block-type flip (paragraph -> heading) renders both variants", () => {
    const c = createCohort("child");
    const pos = firstBlockContentPos(c.suggView.state.doc);
    const headingAttrs = {
      ...(schema.nodes["heading"] as any).defaultAttrs,
      level: 2,
    };
    c.suggView.dispatch(
      c.suggView.state.tr.setNodeMarkup(pos, schema.nodes["heading"], headingAttrs),
    );

    const s = json(c.suggView);
    // the original paragraph is rendered as a deleted variant next to the
    // inserted heading variant (the binding's delete-old + insert-new)
    expect(s).toContain("paragraph--attributed");
    expect(s).toContain("heading--attributed");
    expect(s).toContain("y-attributed-delete");
    expect(s).toContain("y-attributed-insert");
    // base keeps the canonical paragraph
    expect(json(c.baseView)).toContain('"type":"paragraph"');
    expect(json(c.baseView)).not.toContain("--attributed");
  });

  // Fuzz / simulation (modeled on y-prosemirror's suggestion-simulation): apply
  // many random suggestion-mode edits and assert the synced suggestion peers
  // converge, the base stays a valid document, and nothing throws.
  it("fuzz: random suggestion-mode edits keep all peers consistent and valid", () => {
    // deterministic LCG (no Math.random/Date.now, which the env may block)
    let seed = 1234567;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    const randInt = (n: number) => Math.floor(rand() * n) % Math.max(1, n);

    const c = createCohort("The quick brown fox jumps");
    const v = c.suggView;

    for (let i = 0; i < 80; i++) {
      const size = v.state.doc.content.size;
      // keep positions inside the inline content (away from the open/close tags)
      const lo = 4;
      const hi = Math.max(lo + 1, size - 4);
      const a = lo + randInt(hi - lo);
      const b = Math.min(a + 1 + randInt(3), hi);
      try {
        const op = randInt(3);
        if (op === 0) {
          v.dispatch(v.state.tr.insertText("x", a));
        } else if (op === 1 && b > a) {
          v.dispatch(v.state.tr.delete(a, b));
        } else if (b > a) {
          v.dispatch(
            v.state.tr.addMark(a, b, schema.marks["bold"].create()),
          );
        }
      } catch {
        // schema-invalid edits are skipped, same as the y-prosemirror fuzzer
      }
    }

    // The two synced suggestion peers (suggestion-mode + view-suggestions)
    // converge to exactly the same rendered document.
    expect(json(c.suggView)).toEqual(json(c.viewView));
    // Every peer is a structurally valid document.
    expect(() => c.suggView.state.doc.check()).not.toThrow();
    expect(() => c.viewView.state.doc.check()).not.toThrow();
    expect(() => c.baseView.state.doc.check()).not.toThrow();
    // The committed base is still clean (no suggestion leaked into it).
    expect(json(c.baseView)).not.toContain("y-attributed");
  });
});
