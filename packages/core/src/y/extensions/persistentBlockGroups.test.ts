/**
 * @vitest-environment jsdom
 */
/**
 * Tests for persistentBlockGroups.ts, in three layers:
 *
 * 1. the per-container stage on hand-built deltas (what every change maps to)
 * 2. the binding: BlockNote-shaped ProseMirror views on synced Y docs, the
 *    concurrency scenarios the transformer exists for, legacy documents,
 *    suggestion mode, cursor mapping, the standalone conversions and a client
 *    without the transformer
 * 3. a fuzz: random nesting / un-nesting / inserting / deleting / typing on
 *    two peers with random sync points, asserting convergence and the Y
 *    invariants
 *
 * The views are plain ProseMirror views on BlockNote's schema, bound through
 * `@y/prosemirror` exactly as `YSyncExtension` binds the editor (same
 * transformer, same node pairing). nestingChanges.test.ts covers the same
 * scenarios through the BlockNote editor API.
 */
import * as YPM from "@y/prosemirror";
import * as Y from "@y/y";
import * as delta from "lib0/delta";
import * as dpos from "lib0/delta/position";
import * as prng from "lib0/prng";
import type { Node } from "prosemirror-model";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { describe, expect, it } from "vite-plus/test";

import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { blockMatchNodes } from "./blockMatchNodes.js";
import { withCollaboration } from "./index.js";
import { persistentBlockGroups } from "./persistentBlockGroups.js";

// lib0's delta builders are untyped at this level of genericity.
type AnyBuilder = delta.DeltaBuilderAny;
type AnyDelta = delta.DeltaAny;

// --- schema -----------------------------------------------------------------

/**
 * BlockNote's ProseMirror schema with the `y-attributed-*` marks (which the
 * collaboration extension registers).
 */
const schema = BlockNoteEditor.create(
  withCollaboration({
    collaboration: {
      fragment: new Y.Doc().get("schema"),
      user: { name: "schema", color: "#000000" },
    },
  }),
).pmSchema;

const N = schema.nodes;

/** A block with optional nested children. */
function block(
  id: string,
  text: string,
  children: Node[] = [],
  type: "paragraph" | "heading" = "paragraph",
): Node {
  return N.blockContainer.create({ id }, [
    N[type].create(null, text ? schema.text(text) : null),
    ...(children.length > 0 ? [N.blockGroup.create(null, children)] : []),
  ]);
}

function docOf(blocks: Node[]): Node {
  return N.doc.create(null, N.blockGroup.create(null, blocks));
}

/** The nested blocks of a container. */
function childrenOf(container: Node): Node[] {
  const out: Node[] = [];
  if (container.childCount > 1) {
    container.child(1).forEach((c) => out.push(c));
  }
  return out;
}

/** The container with `children` as its nested blocks (no group when empty). */
function withChildren(container: Node, children: Node[]): Node {
  return N.blockContainer.create(container.attrs, [
    container.child(0),
    ...(children.length > 0 ? [N.blockGroup.create(null, children)] : []),
  ]);
}

function withText(container: Node, text: string): Node {
  return N.blockContainer.create(container.attrs, [
    container
      .child(0)
      .type.create(container.child(0).attrs, text ? schema.text(text) : null),
    ...(container.childCount > 1 ? [container.child(1)] : []),
  ]);
}

/** The top-level blocks of a doc. */
function topBlocks(doc: Node): Node[] {
  const out: Node[] = [];
  doc.child(0).forEach((c) => out.push(c));
  return out;
}

/**
 * A path addresses a block by child indexes: `[i]` is the i-th top-level
 * block, `[i, j]` its j-th nested block, and so on.
 */
type Path = number[];

/**
 * Rebuild the doc with the sibling list at `parentPath` (`[]` = top level)
 * replaced by what `fn` returns for it.
 */
function updateSiblings(
  doc: Node,
  parentPath: Path,
  fn: (siblings: Node[]) => Node[],
): Node {
  function rec(siblings: Node[], depth: number): Node[] {
    if (depth === parentPath.length) {
      return fn(siblings);
    }
    const i = parentPath[depth];
    return siblings.map((s, j) =>
      j === i ? withChildren(s, rec(childrenOf(s), depth + 1)) : s,
    );
  }
  return docOf(rec(topBlocks(doc), 0));
}

function blockAt(doc: Node, path: Path): Node {
  let siblings = topBlocks(doc);
  let node = siblings[path[0]];
  for (let i = 1; i < path.length; i++) {
    siblings = childrenOf(node);
    node = siblings[path[i]];
  }
  return node;
}

/** Every block path in document order. */
function allPaths(doc: Node): Path[] {
  const out: Path[] = [];
  function rec(siblings: Node[], prefix: Path) {
    siblings.forEach((s, i) => {
      out.push([...prefix, i]);
      rec(childrenOf(s), [...prefix, i]);
    });
  }
  rec(topBlocks(doc), []);
  return out;
}

// --- the editing operations BlockNote performs, as doc -> doc functions ------

/** Insert `b` after the block at `path`. */
function insertAfter(doc: Node, path: Path, b: Node): Node {
  return updateSiblings(doc, path.slice(0, -1), (sibs) => {
    const i = path[path.length - 1];
    return [...sibs.slice(0, i + 1), b, ...sibs.slice(i + 1)];
  });
}

/**
 * Remove the block at `path` (its nested blocks go with it). Removing the last
 * nested block of a parent removes the parent's group, as BlockNote does.
 */
function remove(doc: Node, path: Path): Node {
  return updateSiblings(doc, path.slice(0, -1), (sibs) =>
    sibs.filter((_, j) => j !== path[path.length - 1]),
  );
}

/**
 * BlockNote's "nest" (Tab): the block becomes the last nested block of its
 * previous sibling. Requires a previous sibling.
 */
function nest(doc: Node, path: Path): Node {
  return updateSiblings(doc, path.slice(0, -1), (sibs) => {
    const i = path[path.length - 1];
    const prev = sibs[i - 1];
    return [
      ...sibs.slice(0, i - 1),
      withChildren(prev, [...childrenOf(prev), sibs[i]]),
      ...sibs.slice(i + 1),
    ];
  });
}

/**
 * BlockNote's "unnest" (Shift-Tab): the block moves after its parent, and its
 * following siblings become its own nested blocks. Requires depth >= 2.
 */
function unnest(doc: Node, path: Path): Node {
  const parentPath = path.slice(0, -1);
  const i = path[path.length - 1];
  const parent = blockAt(doc, parentPath);
  const sibs = childrenOf(parent);
  const lifted = withChildren(sibs[i], [
    ...childrenOf(sibs[i]),
    ...sibs.slice(i + 1),
  ]);
  const newParent = withChildren(parent, sibs.slice(0, i));
  return updateSiblings(doc, parentPath.slice(0, -1), (psibs) => {
    const pi = parentPath[parentPath.length - 1];
    return [...psibs.slice(0, pi), newParent, lifted, ...psibs.slice(pi + 1)];
  });
}

/** Append `text` to the block's content. */
function typeText(doc: Node, path: Path, text: string): Node {
  return updateSiblings(doc, path.slice(0, -1), (sibs) =>
    sibs.map((s, j) =>
      j === path[path.length - 1]
        ? withText(s, s.child(0).textContent + text)
        : s,
    ),
  );
}

/**
 * Replace the view's document. Untouched subtrees keep their node identity,
 * so the binding's incremental pull sees only the changed window. Nothing
 * here depends on how the transaction is expressed: the binding diffs
 * documents, not steps.
 */
function setDoc(view: EditorView, doc: Node) {
  view.dispatch(
    view.state.tr.replaceWith(0, view.state.doc.content.size, doc.content),
  );
}

// --- peers ------------------------------------------------------------------

/**
 * BlockNote renders the marks that have no `toDOM` (its attribution marks)
 * through the editor; a plain ProseMirror view needs a stand-in for them.
 */
const markViews = Object.fromEntries(
  Object.values(schema.marks)
    .filter((mark) => mark.spec.toDOM === undefined)
    .map((mark) => [
      mark.name,
      () => {
        const dom = document.createElement("span");
        return { dom, contentDOM: dom };
      },
    ]),
);

/** The transformer under test, in the shape `syncPlugin` takes. */
const transformers = [persistentBlockGroups];

const pipeline = YPM.defaultTransformer({ transformers });

type Peer = {
  view: EditorView;
  ydoc: Y.Doc;
  errors: Error[];
  destroy: () => void;
};

/** A BlockNote-shaped editor bound to `ytype` through the transformer. */
function createPeer(
  ydoc: Y.Doc,
  {
    ytype = ydoc.get("bn"),
    renderer = null,
    withTransformer = true,
  }: {
    ytype?: Y.Node;
    renderer?: Y.AbstractRenderer | null;
    withTransformer?: boolean;
  } = {},
): Peer {
  const errors: Error[] = [];
  const plugin = YPM.syncPlugin({
    transformers: withTransformer ? transformers : [],
    customCompare: blockMatchNodes,
    onInternalError: (err) => {
      errors.push(err);
    },
  });
  const view = new EditorView(
    { mount: document.createElement("div") },
    { state: EditorState.create({ schema, plugins: [plugin] }), markViews },
  );
  YPM.configureYProsemirror({ ytype, renderer })(view.state, view.dispatch);
  return { view, ydoc, errors, destroy: () => view.destroy() };
}

/**
 * A network between Y docs that can hold updates back. Idempotent under the
 * state vector, so flushing after every change is as good as live sync.
 */
function createNetwork(docs: Y.Doc[]) {
  let queue: Array<{ from: Y.Doc; update: Uint8Array }> = [];
  let live = true;
  const flush = () => {
    const q = queue;
    queue = [];
    for (const { from, update } of q) {
      for (const to of docs) {
        if (to !== from) {
          Y.applyUpdate(to, update, "network");
        }
      }
    }
  };
  for (const from of docs) {
    from.on("update", (update: Uint8Array, origin: unknown) => {
      if (origin === "network") {
        return;
      }
      queue.push({ from, update });
      if (live) {
        flush();
      }
    });
  }
  // initial exchange
  for (const a of docs) {
    for (const b of docs) {
      if (a !== b) {
        Y.applyUpdate(b, Y.encodeStateAsUpdate(a), "network");
      }
    }
  }
  return {
    pause: () => {
      live = false;
    },
    resume: () => {
      live = true;
      flush();
    },
    flush,
  };
}

function json(doc: Node): unknown {
  return JSON.parse(JSON.stringify(doc.toJSON()));
}

/** The doc JSON with attribution marks stripped (content only). */
function stripMarks(node: unknown): unknown {
  if (node === null || typeof node !== "object") {
    return node;
  }
  const out = { ...(node as Record<string, unknown>) };
  if (Array.isArray(out.marks)) {
    const marks = out.marks.filter(
      (m: { type: string }) => !String(m.type).startsWith("y-attributed"),
    );
    if (marks.length > 0) {
      out.marks = marks;
    } else {
      delete out.marks;
    }
  }
  if (Array.isArray(out.content)) {
    out.content = out.content.map(stripMarks);
  }
  return out;
}

/** The value of a delta node's attribute (`d.attrs[key]` is the attr *op*). */
function attrValue(d: AnyDelta, key: string): unknown {
  const op: unknown = (d.attrs as Record<string, unknown>)[key];
  return op !== undefined && delta.$setAttrOp.check(op) ? op.value : undefined;
}

/**
 * The Y layout of every container: its id and the child counts of its
 * `blockGroup` children, in document order.
 */
function yContainers(ytype: Y.Node): Array<{ id: string; groups: number[] }> {
  const out: Array<{ id: string; groups: number[] }> = [];
  function rec(node: AnyDelta) {
    for (const op of node.children) {
      if (!delta.$insertOp.check(op)) {
        continue;
      }
      for (const el of op.insert) {
        if (!delta.$deltaAny.check(el)) {
          continue;
        }
        if (el.name === "blockContainer") {
          const groups: number[] = [];
          for (const cop of el.children) {
            if (!delta.$insertOp.check(cop)) {
              continue;
            }
            for (const c of cop.insert) {
              if (delta.$deltaAny.check(c) && c.name === "blockGroup") {
                groups.push(c.childCnt);
              }
            }
          }
          out.push({ id: String(attrValue(el, "id")), groups });
        }
        rec(el);
      }
    }
  }
  rec(ytype.toDeltaDeep() as AnyDelta);
  return out;
}

function yContainer(ytype: Y.Node, id: string) {
  const c = yContainers(ytype).find((c) => c.id === id);
  if (c === undefined) {
    throw new Error(`no container ${id}`);
  }
  return c;
}

/** Render the ytype through the pipeline (what a freshly bound view shows). */
function render(ytype: Y.Node, renderer: Y.AbstractRenderer | null = null) {
  return YPM.ynodeToPmnode(ytype, schema, { renderer, transformer: pipeline });
}

/**
 * Assert that every peer shows the same document, that it equals the
 * pipeline's rendering of the Y document, and that no peer reported an
 * internal error.
 */
function assertConverged(peers: Peer[], msg: string) {
  for (const p of peers) {
    expect(
      p.errors.map((e) => e.message),
      `${msg}: no internal errors`,
    ).toEqual([]);
  }
  const first = json(peers[0].view.state.doc);
  for (const p of peers.slice(1)) {
    expect(json(p.view.state.doc), `${msg}: peers agree`).toEqual(first);
  }
  expect(
    json(render(peers[0].ydoc.get("bn"))),
    `${msg}: the view equals the rendering of the Y document`,
  ).toEqual(first);
}

// --- 1. the per-container stage on hand-built deltas -------------------------

/**
 * A container delta.
 *
 * @param children `null` = no group, `[]` = an empty group
 */
function yblock(
  id: string,
  text: string,
  children: AnyBuilder[] | null = null,
): AnyBuilder {
  const b: AnyBuilder = delta
    .create("blockContainer", { id })
    .insert([delta.create("paragraph", {}, text)]);
  if (children !== null) {
    b.insert([delta.create("blockGroup", {}).insert(children)]);
  }
  return b;
}

function ydocOf(blocks: AnyBuilder[]): AnyBuilder {
  return delta.create().insert([delta.create("blockGroup", {}).insert(blocks)]);
}

/** A fresh pipeline stage over `$prosemirrorDelta`. */
function stage() {
  return persistentBlockGroups(YPM.$prosemirrorDelta).init();
}

/** A change on the top-level group's i-th container. */
function onBlock(i: number, containerChange: AnyBuilder): AnyBuilder {
  return delta
    .create()
    .modify(delta.create().retain(i).modify(containerChange));
}

function expectDelta(
  actual: { toJSON(): unknown },
  expected: { toJSON(): unknown },
  msg: string,
) {
  expect(actual.toJSON(), msg).toEqual(expected.toJSON());
}

describe("persistent block groups: the per-container stage", () => {
  it("hides empty groups at every depth", () => {
    const s = stage();
    const d = ydocOf([
      yblock("a", "A", []),
      yblock("b", "B"),
      yblock("c", "C", [yblock("c1", "C1", [])]),
    ]);
    const b = s.applyA(delta.cloneDeep(d.done(false))).b!;
    expectDelta(
      b,
      ydocOf([
        yblock("a", "A"),
        yblock("b", "B"),
        yblock("c", "C", [yblock("c1", "C1")]),
      ]),
      "a legacy container and a hidden-group container render the same",
    );
  });

  it("shows the view group while it has children and hides it again", () => {
    const s = stage();
    s.applyA(delta.cloneDeep(ydocOf([yblock("a", "A", [])]).done(false)));
    // Y inserts a child into the hidden group
    const appear = s.applyA(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(delta.create().insert([yblock("x", "X", [])])),
      ),
    ).b!;
    expectDelta(
      appear,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .insert([delta.create("blockGroup", {}).insert([yblock("x", "X")])]),
      ),
      "the view group appears with its children",
    );
    // a second child: the group is modified
    const grow = s.applyA(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(
            delta
              .create()
              .retain(1)
              .insert([yblock("y", "Y", [])]),
          ),
      ),
    ).b!;
    expectDelta(
      grow,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(
            delta
              .create()
              .retain(1)
              .insert([yblock("y", "Y")]),
          ),
      ),
      "a visible group is modified in place",
    );
    // text typed into the nested child: a plain modify chain
    const typed = s.applyA(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(
            delta
              .create()
              .retain(1)
              .modify(
                delta.create().modify(delta.create().retain(1).insert("!")),
              ),
          ),
      ),
    ).b!;
    expectDelta(
      typed,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(
            delta
              .create()
              .retain(1)
              .modify(
                delta.create().modify(delta.create().retain(1).insert("!")),
              ),
          ),
      ),
      "a modify chain passes through",
    );
    // delete both children: the view group disappears
    const vanish = s.applyA(
      onBlock(0, delta.create().retain(1).modify(delta.create().delete(2))),
    ).b!;
    expectDelta(
      vanish,
      onBlock(0, delta.create().retain(1).delete(1)),
      "the view group disappears when the last child goes",
    );
    // the group still exists for the transformer: a later insert shows it again
    const again = s.applyA(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(delta.create().insert([yblock("z", "Z", [])])),
      ),
    ).b!;
    expectDelta(
      again,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .insert([delta.create("blockGroup", {}).insert([yblock("z", "Z")])]),
      ),
      "the kept group reappears",
    );
  });

  /** A container with two groups, as a legacy document has after concurrent first nesting. */
  function twoGroups(): AnyBuilder {
    return delta
      .create("blockContainer", { id: "p" })
      .insert([
        delta.create("paragraph", {}, "P"),
        delta
          .create("blockGroup", {})
          .insert([yblock("a", "A"), yblock("b", "B")]),
        delta.create("blockGroup", {}).insert([yblock("c", "C")]),
      ]);
  }

  it("merges several groups of a container into one", () => {
    const s = stage();
    const b = s.applyA(
      delta.cloneDeep(
        delta
          .create()
          .insert([delta.create("blockGroup", {}).insert([twoGroups()])])
          .done(false),
      ),
    ).b!;
    expectDelta(
      b,
      ydocOf([
        yblock("p", "P", [
          yblock("a", "A"),
          yblock("b", "B"),
          yblock("c", "C"),
        ]),
      ]),
      "groups merge in order",
    );
    // an insert at the start of the second group lands at merged offset 2
    const ins = s.applyA(
      onBlock(
        0,
        delta
          .create()
          .retain(2)
          .modify(delta.create().insert([yblock("d", "D")])),
      ),
    ).b!;
    expectDelta(
      ins,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(
            delta
              .create()
              .retain(2)
              .insert([yblock("d", "D")]),
          ),
      ),
      "a second-group insert is offset by the first group",
    );
    // deleting the whole first group deletes its two children from the merged group
    const del = s.applyA(onBlock(0, delta.create().retain(1).delete(1))).b!;
    expectDelta(
      del,
      onBlock(0, delta.create().retain(1).modify(delta.create().delete(2))),
      "deleting a group deletes its children from the view",
    );
    // changes to both groups in one change merge into one modify
    const s2 = stage();
    s2.applyA(
      delta.cloneDeep(
        delta
          .create()
          .insert([delta.create("blockGroup", {}).insert([twoGroups()])])
          .done(false),
      ),
    );
    const both = s2.applyA(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(delta.create().retain(1).delete(1))
          .modify(
            delta
              .create()
              .retain(1)
              .insert([yblock("e", "E")]),
          ),
      ),
    ).b!;
    expectDelta(
      both,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(
            delta
              .create()
              .retain(1)
              .delete(1)
              .retain(1)
              .insert([yblock("e", "E")]),
          ),
      ),
      "ops on several groups form one merged change",
    );
  });

  it("creates a group for every container the view inserts, never for a legacy one", () => {
    const s = stage();
    const a = s.applyB(
      delta.cloneDeep(
        ydocOf([yblock("a", "A"), yblock("b", "B", [yblock("b1", "B1")])]).done(
          false,
        ),
      ),
    ).a!;
    expectDelta(
      a,
      ydocOf([
        yblock("a", "A", []),
        yblock("b", "B", [yblock("b1", "B1", [])]),
      ]),
      "every view-created container gets a group, at every depth",
    );
    // a container inserted later from the view
    const ins = s.applyB(
      delta.create().modify(
        delta
          .create()
          .retain(2)
          .insert([yblock("c", "C")]),
      ),
    ).a!;
    expectDelta(
      ins,
      delta.create().modify(
        delta
          .create()
          .retain(2)
          .insert([yblock("c", "C", [])]),
      ),
      "a later view insert gets its group too",
    );
    // a legacy container from Y stays without a group until the view nests something
    const s2 = stage();
    s2.applyA(delta.cloneDeep(ydocOf([yblock("l", "L")]).done(false)));
    const typed = s2.applyB(
      onBlock(0, delta.create().modify(delta.create().retain(1).insert("!"))),
    ).a!;
    expectDelta(
      typed,
      onBlock(0, delta.create().modify(delta.create().retain(1).insert("!"))),
      "typing into a legacy container creates no group",
    );
    const nested = s2.applyB(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .insert([delta.create("blockGroup", {}).insert([yblock("n", "N")])]),
      ),
    ).a!;
    expectDelta(
      nested,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .insert([
            delta.create("blockGroup", {}).insert([yblock("n", "N", [])]),
          ]),
      ),
      "the first nesting creates the group as the view built it; the nested container gets its own",
    );
  });

  it("can be configured without implicit groups", () => {
    const s = persistentBlockGroups(YPM.$prosemirrorDelta, {
      implicitGroups: false,
    }).init();
    const a = s.applyB(
      delta.cloneDeep(
        ydocOf([yblock("a", "A"), yblock("b", "B", [yblock("b1", "B1")])]).done(
          false,
        ),
      ),
    ).a!;
    expectDelta(
      a,
      ydocOf([yblock("a", "A"), yblock("b", "B", [yblock("b1", "B1")])]),
      "no group is added",
    );
    const del = s.applyB(onBlock(1, delta.create().retain(1).delete(1))).a!;
    expectDelta(
      del,
      onBlock(1, delta.create().retain(1).modify(delta.create().delete(1))),
      "but an existing group is still kept when emptied",
    );
  });

  it("routes view changes into the kept groups", () => {
    const s = stage();
    s.applyA(delta.cloneDeep(ydocOf([yblock("a", "A", [])]).done(false)));
    const ins = s.applyB(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .insert([delta.create("blockGroup", {}).insert([yblock("x", "X")])]),
      ),
    ).a!;
    expectDelta(
      ins,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(delta.create().insert([yblock("x", "X", [])])),
      ),
      "a view group insert routes into the hidden group",
    );
    const del = s.applyB(onBlock(0, delta.create().retain(1).delete(1))).a!;
    expectDelta(
      del,
      onBlock(0, delta.create().retain(1).modify(delta.create().delete(1))),
      "removing the view group empties the group and keeps it",
    );
    const ins2 = s.applyB(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .insert([delta.create("blockGroup", {}).insert([yblock("y", "Y")])]),
      ),
    ).a!;
    expectDelta(
      ins2,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(delta.create().insert([yblock("y", "Y", [])])),
      ),
      "the kept group is reused",
    );
    // two groups: [a, b] + [c]
    const s2 = stage();
    s2.applyA(
      delta.cloneDeep(
        delta
          .create()
          .insert([delta.create("blockGroup", {}).insert([twoGroups()])])
          .done(false),
      ),
    );
    // insert at the boundary (merged offset 2): the earlier group wins
    const boundary = s2.applyB(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(
            delta
              .create()
              .retain(2)
              .insert([yblock("d", "D")]),
          ),
      ),
    ).a!;
    expectDelta(
      boundary,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(
            delta
              .create()
              .retain(2)
              .insert([yblock("d", "D", [])]),
          ),
      ),
      "a boundary insert goes to the earlier group",
    );
    // merged layout is now [a, b, d] + [c]; delete offsets 1..3 spans both groups
    const span = s2.applyB(
      onBlock(
        0,
        delta.create().retain(1).modify(delta.create().retain(1).delete(3)),
      ),
    ).a!;
    expectDelta(
      span,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(delta.create().retain(1).delete(2))
          .modify(delta.create().delete(1)),
      ),
      "a delete spanning groups is split, groups are kept",
    );
    // merged layout is [a] + []; the view group still exists; modify its only child
    const mod = s2.applyB(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(
            delta
              .create()
              .modify(
                delta.create().modify(delta.create().retain(1).insert("!")),
              ),
          ),
      ),
    ).a!;
    expectDelta(
      mod,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(
            delta
              .create()
              .modify(
                delta.create().modify(delta.create().retain(1).insert("!")),
              ),
          ),
      ),
      "a modify reaches the group holding the position",
    );
    // remove the view group: only the non-empty group gets a delete
    const del2 = s2.applyB(onBlock(0, delta.create().retain(1).delete(1))).a!;
    expectDelta(
      del2,
      onBlock(0, delta.create().retain(1).modify(delta.create().delete(1))),
      "emptying touches only the non-empty groups",
    );
    // now both are empty; a new view group routes into the first
    const ins3 = s2.applyB(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .insert([delta.create("blockGroup", {}).insert([yblock("e", "E")])]),
      ),
    ).a!;
    expectDelta(
      ins3,
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(delta.create().insert([yblock("e", "E", [])])),
      ),
      "the first empty group takes a new view group",
    );
  });

  it("maps positions through the layout in both directions", () => {
    const s = stage();
    s.applyA(
      delta.cloneDeep(
        delta
          .create()
          .insert([
            delta
              .create("blockGroup", {})
              .insert([twoGroups(), yblock("q", "Q", [])]),
          ])
          .done(false),
      ),
    );
    // Y: doc > group > p > [paragraph, g1[a, b], g2[c]] > paragraph of c > offset 1
    const inC = dpos.create([0, 0, 2, 0, 0, 1]);
    const mappedC = dpos.mapPositionsA(s, [inC])[0];
    expect(
      mappedC?.path,
      "a position in the second group maps to the merged offset",
    ).toEqual([0, 0, 1, 2, 0, 1]);
    const back = dpos.mapPositionsB(s, [mappedC!])[0];
    expect(back?.path, "and maps back into the second group").toEqual([
      0, 0, 2, 0, 0, 1,
    ]);
    const inA = dpos.create([0, 0, 1, 0, 0, 1]);
    expect(
      dpos.mapPositionsA(s, [inA])[0]?.path,
      "a position in the first group keeps its path",
    ).toEqual([0, 0, 1, 0, 0, 1]);
    // a gap in the container's child list after the hidden group of q: Y [paragraph, g[]] gap 2 -> view gap 1
    const gapQ = dpos.create([0, 1, 2]);
    expect(
      dpos.mapPositionsA(s, [gapQ])[0]?.path,
      "a gap behind a hidden group maps before it",
    ).toEqual([0, 1, 1]);
    expect(
      dpos.mapPositionsB(s, [dpos.create([0, 1, 1])])[0]?.path,
      "a view gap at the end of a container maps to the end of the Y child list",
    ).toEqual([0, 1, 2]);
  });
});

// --- 2. the binding -----------------------------------------------------------

describe("persistent block groups: the binding", () => {
  it("keeps groups across nesting and un-nesting", () => {
    const ydoc = new Y.Doc({ gc: false });
    const a = createPeer(ydoc);
    try {
      setDoc(a.view, docOf([block("p", "P"), block("q", "Q")]));
      expect(
        yContainers(ydoc.get("bn")).map((c) => c.groups),
        "every block the view creates has an empty group in Y",
      ).toEqual([[0], [0]]);
      setDoc(a.view, nest(a.view.state.doc, [1]));
      expect(
        yContainer(ydoc.get("bn"), "p").groups,
        "nesting the first child fills the existing group",
      ).toEqual([1]);
      expect(
        yContainer(ydoc.get("bn"), "q").groups,
        "the moved block keeps a group",
      ).toEqual([0]);
      setDoc(a.view, typeText(a.view.state.doc, [0, 0], "!"));
      expect(
        blockAt(render(ydoc.get("bn")), [0, 0]).textContent,
        "typing into a nested block syncs",
      ).toBe("Q!");
      setDoc(a.view, unnest(a.view.state.doc, [0, 0]));
      expect(
        yContainer(ydoc.get("bn"), "p").groups,
        "un-nesting the last child keeps the group, empty",
      ).toEqual([0]);
      expect(a.view.state.doc.child(0).childCount).toBe(2);
      expect(
        blockAt(a.view.state.doc, [0]).childCount,
        "the view shows no group on the emptied parent",
      ).toBe(1);
      const b = createPeer(ydoc);
      try {
        assertConverged([a, b], "a later peer");
      } finally {
        b.destroy();
      }
    } finally {
      a.destroy();
    }
  });

  it("merges two users nesting a first child under the same block", () => {
    const da = new Y.Doc({ gc: false });
    const db = new Y.Doc({ gc: false });
    const net = createNetwork([da, db]);
    const a = createPeer(da);
    const b = createPeer(db);
    try {
      setDoc(
        a.view,
        docOf([block("p", "P"), block("x", "X"), block("y", "Y")]),
      );
      assertConverged([a, b], "seed");
      net.pause();
      // peer a nests x under p; peer b removes x and nests y under p
      setDoc(a.view, nest(a.view.state.doc, [1])); // p[x], y
      setDoc(b.view, nest(remove(b.view.state.doc, [1]), [1])); // p[y]
      expect(yContainer(da.get("bn"), "p").groups).toEqual([1]);
      expect(yContainer(db.get("bn"), "p").groups).toEqual([1]);
      net.resume();
      assertConverged([a, b], "after merge");
      expect(
        yContainer(da.get("bn"), "p").groups,
        "p has exactly one group in Y, holding both moved blocks",
      ).toEqual([2]);
      expect(
        a.view.state.doc.child(0).childCount,
        "the view has a single top-level block",
      ).toBe(1);
      expect(
        childrenOf(blockAt(a.view.state.doc, [0]))
          .map((c) => String(c.attrs.id))
          .sort((x, y) => x.localeCompare(y)),
        "with both nested blocks, no duplicates",
      ).toEqual(["x", "y"]);
      expect(yContainers(da.get("bn")).length, "three containers in Y").toBe(3);
    } finally {
      a.destroy();
      b.destroy();
      da.destroy();
      db.destroy();
    }
  });

  it("merges two users adding a new nested block under the same parent", () => {
    const da = new Y.Doc({ gc: false });
    const db = new Y.Doc({ gc: false });
    const net = createNetwork([da, db]);
    const a = createPeer(da);
    const b = createPeer(db);
    try {
      setDoc(a.view, docOf([block("p", "P")]));
      assertConverged([a, b], "seed");
      net.pause();
      setDoc(
        a.view,
        updateSiblings(a.view.state.doc, [0], () => [block("a1", "A1")]),
      );
      setDoc(
        b.view,
        updateSiblings(b.view.state.doc, [0], () => [block("b1", "B1")]),
      );
      expect(yContainer(da.get("bn"), "p").groups).toEqual([1]);
      expect(yContainer(db.get("bn"), "p").groups).toEqual([1]);
      net.resume();
      assertConverged([a, b], "after merge");
      expect(
        yContainer(da.get("bn"), "p").groups,
        "one group with both children",
      ).toEqual([2]);
      expect(
        childrenOf(blockAt(a.view.state.doc, [0]))
          .map((c) => String(c.attrs.id))
          .sort((x, y) => x.localeCompare(y)),
      ).toEqual(["a1", "b1"]);
      expect(
        yContainers(da.get("bn")).length,
        "no container was duplicated",
      ).toBe(3);
      // and the group survives both children being removed, on either peer
      setDoc(a.view, remove(a.view.state.doc, [0, 0]));
      setDoc(b.view, remove(b.view.state.doc, [0, 0]));
      assertConverged([a, b], "after emptying");
      expect(
        yContainer(da.get("bn"), "p").groups,
        "the group is kept, empty",
      ).toEqual([0]);
      expect(
        blockAt(a.view.state.doc, [0]).childCount,
        "the view hides it",
      ).toBe(1);
    } finally {
      a.destroy();
      b.destroy();
      da.destroy();
      db.destroy();
    }
  });

  it("merges the groups of a legacy document and routes later edits into them", () => {
    const da = new Y.Doc({ gc: false });
    // a legacy document: written without groups
    da.get("bn").applyDelta(
      ydocOf([yblock("p", "P"), yblock("q", "Q")]).done(),
    );
    const db = new Y.Doc({ gc: false });
    const net = createNetwork([da, db]);
    const a = createPeer(da);
    const b = createPeer(db);
    try {
      assertConverged([a, b], "legacy seed");
      expect(
        yContainers(da.get("bn")).map((c) => c.groups),
        "legacy containers have no group and get none implicitly",
      ).toEqual([[], []]);
      setDoc(a.view, typeText(a.view.state.doc, [0], "!"));
      expect(
        yContainer(da.get("bn"), "p").groups,
        "editing a legacy container creates no group",
      ).toEqual([]);
      net.pause();
      setDoc(
        a.view,
        updateSiblings(a.view.state.doc, [0], () => [block("a1", "A1")]),
      );
      setDoc(
        b.view,
        updateSiblings(b.view.state.doc, [0], () => [block("b1", "B1")]),
      );
      net.resume();
      assertConverged([a, b], "after merge");
      expect(yContainer(da.get("bn"), "p").groups, "two groups in Y").toEqual([
        1, 1,
      ]);
      expect(
        childrenOf(blockAt(a.view.state.doc, [0])).length,
        "the view merges them",
      ).toBe(2);
      // type into both nested blocks and nest a third; everything stays in sync
      setDoc(a.view, typeText(a.view.state.doc, [0, 0], "?"));
      setDoc(b.view, typeText(b.view.state.doc, [0, 1], "?"));
      setDoc(
        a.view,
        updateSiblings(a.view.state.doc, [0], (sibs) => [
          ...sibs,
          block("c1", "C1"),
        ]),
      );
      assertConverged([a, b], "after edits in a merged group");
      expect(
        yContainer(da.get("bn"), "p").groups.reduce((s, n) => s + n, 0),
        "three nested blocks across the two groups",
      ).toBe(3);
      // removing all nested blocks keeps both groups
      setDoc(
        b.view,
        updateSiblings(b.view.state.doc, [0], () => []),
      );
      assertConverged([a, b], "after emptying");
      expect(
        yContainer(da.get("bn"), "p").groups,
        "both groups are kept",
      ).toEqual([0, 0]);
    } finally {
      a.destroy();
      b.destroy();
      da.destroy();
      db.destroy();
    }
  });

  it("syncs moves: nest under a parent with children, un-nest, delete a parent", () => {
    const da = new Y.Doc({ gc: false });
    const db = new Y.Doc({ gc: false });
    createNetwork([da, db]);
    const a = createPeer(da);
    const b = createPeer(db);
    try {
      setDoc(
        a.view,
        docOf([
          block("p", "P", [block("a", "A"), block("b", "B"), block("c", "C")]),
          block("q", "Q"),
        ]),
      );
      assertConverged([a, b], "seed");
      setDoc(b.view, nest(b.view.state.doc, [1])); // q under p: p[a, b, c, q]
      assertConverged([a, b], "nest under a parent with children");
      expect(
        yContainer(da.get("bn"), "p").groups,
        "routed into the existing group",
      ).toEqual([4]);
      setDoc(a.view, unnest(a.view.state.doc, [0, 1])); // b out: p[a], b[c, q]
      assertConverged([a, b], "un-nest a middle child");
      expect(
        yContainer(da.get("bn"), "p").groups,
        "the parent keeps a one-child group",
      ).toEqual([1]);
      expect(
        yContainer(da.get("bn"), "b").groups,
        "the lifted block holds its followers",
      ).toEqual([2]);
      setDoc(b.view, remove(b.view.state.doc, [1])); // delete b with its children
      assertConverged([a, b], "delete a parent");
      expect(
        yContainers(da.get("bn")).map((c) => c.id),
        "the subtree is gone",
      ).toEqual(["p", "a"]);
      setDoc(
        a.view,
        updateSiblings(a.view.state.doc, [0], () => []),
      );
      setDoc(
        b.view,
        updateSiblings(b.view.state.doc, [], (sibs) => [
          ...sibs,
          block("r", "R"),
        ]),
      );
      assertConverged([a, b], "empty a group while another peer appends");
    } finally {
      a.destroy();
      b.destroy();
      da.destroy();
      db.destroy();
    }
  });

  it("still replaces the container on a block type change, with its group", () => {
    const ydoc = new Y.Doc({ gc: false });
    const a = createPeer(ydoc);
    try {
      setDoc(a.view, docOf([block("p", "P", [block("a", "A")])]));
      const asHeading = docOf([
        N.blockContainer.create({ id: "p" }, [
          N.heading.create(null, schema.text("P")),
          N.blockGroup.create(null, [block("a", "A")]),
        ]),
      ]);
      setDoc(a.view, asHeading);
      expect(
        yContainer(ydoc.get("bn"), "p").groups,
        "the replaced container has one group with the child",
      ).toEqual([1]);
      expect(json(render(ydoc.get("bn"))), "the rendering agrees").toEqual(
        json(a.view.state.doc),
      );
    } finally {
      a.destroy();
    }
  });

  /**
   * The suggestion setup of BlockNote's demo: a base doc, a suggestion doc
   * with a diff renderer in view mode and one in suggestion mode.
   */
  function createSuggestionSetup() {
    const base = new Y.Doc({ gc: false, guid: "base" });
    const viewDoc = new Y.Doc({
      isSuggestionDoc: true,
      gc: false,
      guid: "view",
    });
    const editDoc = new Y.Doc({
      isSuggestionDoc: true,
      gc: false,
      guid: "edit",
    });
    const attributions = Y.createContentMap();
    const viewRenderer = Y.createDiffRenderer(base, viewDoc, { attributions });
    viewRenderer.suggestionMode = false;
    const editRenderer = Y.createDiffRenderer(base, editDoc, { attributions });
    editRenderer.suggestionMode = true;
    createNetwork([viewDoc, editDoc]);
    const baseView = createPeer(base);
    const viewing = createPeer(viewDoc, { renderer: viewRenderer });
    const editing = createPeer(editDoc, { renderer: editRenderer });
    return {
      base,
      baseView,
      viewing,
      editing,
      destroy: () => {
        baseView.destroy();
        viewing.destroy();
        editing.destroy();
      },
    };
  }

  function hasDeleteMark(n: Node): boolean {
    let found = n.marks.some((m) => m.type.name === "y-attributed-delete");
    n.descendants((d) => {
      if (d.marks.some((m) => m.type.name === "y-attributed-delete")) {
        found = true;
      }
    });
    return found;
  }

  it("works in suggestion mode: suggest, reject, accept, suggest a deletion", () => {
    const s = createSuggestionSetup();
    try {
      setDoc(s.baseView.view, docOf([block("p", "P"), block("q", "Q")]));
      expect(
        stripMarks(json(s.editing.view.state.doc)),
        "the suggesting peer sees the base",
      ).toEqual(json(s.baseView.view.state.doc));
      // suggest a nested block under p
      setDoc(
        s.editing.view,
        updateSiblings(s.editing.view.state.doc, [0], () => [block("n", "N")]),
      );
      expect(
        yContainer(s.base.get("bn"), "p").groups,
        "the base doc is untouched (the insert is a suggestion)",
      ).toEqual([0]);
      const shown = blockAt(s.viewing.view.state.doc, [0, 0]);
      expect(
        shown?.attrs.id,
        "the viewing peer renders the suggested nested block",
      ).toBe("n");
      expect(s.viewing.errors).toEqual([]);
      expect(s.editing.errors).toEqual([]);
      // reject: the child goes, the group hides
      YPM.rejectAllChanges()(s.viewing.view.state, s.viewing.view.dispatch);
      expect(
        stripMarks(json(s.viewing.view.state.doc)),
        "rejecting removes the nested block",
      ).toEqual(json(docOf([block("p", "P"), block("q", "Q")])));
      expect(
        stripMarks(json(s.editing.view.state.doc)),
        "the suggesting peer agrees",
      ).toEqual(json(docOf([block("p", "P"), block("q", "Q")])));
      expect(
        blockAt(s.viewing.view.state.doc, [0]).childCount,
        "the group is hidden again",
      ).toBe(1);
      // suggest again and accept
      setDoc(
        s.editing.view,
        updateSiblings(s.editing.view.state.doc, [0], () => [block("m", "M")]),
      );
      YPM.acceptAllChanges()(s.viewing.view.state, s.viewing.view.dispatch);
      expect(
        json(s.baseView.view.state.doc),
        "accepting lands the nested block in the base",
      ).toEqual(
        json(docOf([block("p", "P", [block("m", "M")]), block("q", "Q")])),
      );
      expect(
        yContainer(s.base.get("bn"), "p").groups,
        "in the one group",
      ).toEqual([1]);
      // delete the only nested block as a suggestion: it stays visible as a pending deletion
      setDoc(
        s.editing.view,
        updateSiblings(s.editing.view.state.doc, [0], () => []),
      );
      const pending = blockAt(s.viewing.view.state.doc, [0, 0]);
      expect(
        pending?.attrs.id,
        "the deleted nested block is still rendered",
      ).toBe("m");
      expect(hasDeleteMark(pending), "as a pending deletion").toBe(true);
      expect(
        stripMarks(json(s.editing.view.state.doc)),
        "both suggestion peers agree",
      ).toEqual(stripMarks(json(s.viewing.view.state.doc)));
      expect(s.viewing.errors).toEqual([]);
      expect(s.editing.errors).toEqual([]);
      expect(s.baseView.errors).toEqual([]);
      YPM.acceptAllChanges()(s.viewing.view.state, s.viewing.view.dispatch);
      expect(
        json(s.baseView.view.state.doc),
        "accepting the deletion removes it from the base",
      ).toEqual(json(docOf([block("p", "P"), block("q", "Q")])));
      expect(
        yContainer(s.base.get("bn"), "p").groups,
        "and keeps the group",
      ).toEqual([0]);
      expect(
        blockAt(s.viewing.view.state.doc, [0]).childCount,
        "which the viewing peer hides",
      ).toBe(1);
    } finally {
      s.destroy();
    }
  });

  it("round-trips relative positions across peers", () => {
    const da = new Y.Doc({ gc: false });
    const db = new Y.Doc({ gc: false });
    createNetwork([da, db]);
    const a = createPeer(da);
    const b = createPeer(db);
    try {
      setDoc(
        a.view,
        docOf([
          block("p", "P", [block("a", "Alpha"), block("b", "Beta")]),
          block("q", "Q"),
        ]),
      );
      assertConverged([a, b], "seed");
      // the position after "Al" in the nested block a
      let posA = -1;
      a.view.state.doc.descendants((n, pos) => {
        if (n.isText && n.text === "Alpha") {
          posA = pos + 2;
        }
        return posA === -1;
      });
      expect(posA, "found the text").toBeGreaterThan(0);
      const rpos = YPM.resolvedPositionToRelativePosition(
        a.view,
        a.view.state.doc.resolve(posA),
      );
      expect(rpos, "maps into Y through the transformer").not.toBeNull();
      const onB = YPM.relativePositionToResolvedPosition(b.view, rpos!);
      expect(onB?.pos, "resolves to the same position on the other peer").toBe(
        posA,
      );
      // still valid after the other peer adds a nested block before it (one group, no replacement)
      setDoc(
        b.view,
        updateSiblings(b.view.state.doc, [0], (sibs) => [
          block("z", "Zed"),
          ...sibs,
        ]),
      );
      assertConverged([a, b], "after an insert before the position");
      const after = YPM.relativePositionToResolvedPosition(a.view, rpos!);
      expect(after).not.toBeNull();
      expect(
        a.view.state.doc.textBetween(after!.pos - 2, after!.pos),
        "the relative position follows its text",
      ).toBe("Al");
    } finally {
      a.destroy();
      b.destroy();
      da.destroy();
      db.destroy();
    }
  });

  it("applies to the standalone conversions", () => {
    const pm = docOf([block("p", "P", [block("a", "A")]), block("q", "Q")]);
    const d = YPM.pmnodeToDelta(pm, { transformer: pipeline });
    const ydoc = new Y.Doc({ gc: false });
    ydoc.get("bn").applyDelta(d);
    expect(
      yContainers(ydoc.get("bn")).map((c) => c.groups),
      "pmnodeToDelta writes a group into every container",
    ).toEqual([[1], [0], [0]]);
    expect(
      json(render(ydoc.get("bn"))),
      "ynodeToPmnode renders it back",
    ).toEqual(json(pm));
    const a = createPeer(ydoc);
    try {
      expect(json(a.view.state.doc), "a bound view shows the same").toEqual(
        json(pm),
      );
      expect(
        yContainers(ydoc.get("bn")).map((c) => c.groups),
        "binding wrote nothing back",
      ).toEqual([[1], [0], [0]]);
      // without the transformer the empty groups are schema-invalid and get dropped: the compat path
      const plain = YPM.ynodeToPmnode(ydoc.get("bn"), schema);
      expect(
        json(plain),
        "without the transformer, ynodeToPmnode drops the empty groups",
      ).toEqual(json(pm));
    } finally {
      a.destroy();
    }
  });

  it("keeps syncing with a client that has no transformer", () => {
    const da = new Y.Doc({ gc: false });
    const db = new Y.Doc({ gc: false });
    createNetwork([da, db]);
    const a = createPeer(da);
    try {
      setDoc(
        a.view,
        docOf([block("p", "P", [block("a", "A")]), block("q", "Q")]),
      );
      const old = createPeer(db, { withTransformer: false });
      try {
        expect(
          json(old.view.state.doc),
          "the old client shows the document",
        ).toEqual(json(a.view.state.doc));
        expect(
          yContainers(da.get("bn")).map((c) => c.groups),
          "the old client deleted the empty groups from Y",
        ).toEqual([[1], [], []]);
        setDoc(old.view, typeText(old.view.state.doc, [1], "!"));
        setDoc(
          a.view,
          updateSiblings(a.view.state.doc, [1], () => [block("n", "N")]),
        );
        expect(json(old.view.state.doc), "both keep syncing").toEqual(
          json(a.view.state.doc),
        );
        expect(
          yContainer(da.get("bn"), "q").groups,
          "the first nesting under a stripped container creates its group",
        ).toEqual([1]);
        expect(a.errors).toEqual([]);
        expect(old.errors).toEqual([]);
      } finally {
        old.destroy();
      }
    } finally {
      a.destroy();
      da.destroy();
      db.destroy();
    }
  });
});

// --- 3. fuzz ----------------------------------------------------------------

describe("persistent block groups: random nesting on two peers", () => {
  /**
   * Random editing on two peers with random sync points. After every full
   * sync both peers show the same document, which equals the pipeline's
   * rendering of the Y document, every container the view created holds a
   * group, and no container ever holds more than one (the whole point: the
   * view only ever writes into existing groups).
   */
  function run(seed: number) {
    const gen = prng.create(seed);
    const da = new Y.Doc({ gc: false });
    const db = new Y.Doc({ gc: false });
    const net = createNetwork([da, db]);
    const peers = [createPeer(da), createPeer(db)];
    let nextId = 0;
    const newBlock = () => block(`b${nextId++}`, prng.word(gen, 1, 4));
    try {
      setDoc(peers[0].view, docOf([newBlock(), newBlock(), newBlock()]));
      assertConverged(peers, `seed ${seed}`);
      const rounds = prng.uint32(gen, 1, 6);
      for (let r = 0; r < rounds; r++) {
        net.pause();
        const ops = prng.uint32(gen, 1, 8);
        for (let i = 0; i < ops; i++) {
          const peer = prng.oneOf(gen, peers);
          const doc = peer.view.state.doc;
          const paths = allPaths(doc);
          const path = prng.oneOf(gen, paths);
          const choice = prng.uint32(gen, 0, 5);
          let next = doc;
          if (choice === 0) {
            next = insertAfter(doc, path, newBlock());
          } else if (choice === 1) {
            if (
              paths.length > 1 &&
              !(path.length === 1 && topBlocks(doc).length === 1)
            ) {
              next = remove(doc, path);
            }
          } else if (choice === 2) {
            if (path[path.length - 1] > 0) {
              next = nest(doc, path);
            }
          } else if (choice === 3) {
            if (path.length > 1) {
              next = unnest(doc, path);
            }
          } else {
            next = typeText(doc, path, prng.word(gen, 1, 3));
          }
          if (next !== doc) {
            setDoc(peer.view, next);
          }
        }
        net.resume();
        assertConverged(peers, `seed ${seed}, round ${r}`);
        for (const c of yContainers(da.get("bn"))) {
          expect(
            c.groups.length,
            `seed ${seed}: container ${c.id} holds exactly one group`,
          ).toBe(1);
        }
      }
    } finally {
      peers.forEach((p) => p.destroy());
      da.destroy();
      db.destroy();
    }
  }

  const seeds = Array.from({ length: 150 }, (_, i) => i);
  it(
    "converges and keeps one group per container",
    { timeout: 120_000 },
    () => {
      for (const seed of seeds) {
        run(seed);
      }
    },
  );
});
