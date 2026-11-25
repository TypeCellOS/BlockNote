/**
 * Tests for the transformer stage and the binding on synced Y docs.
 * The headless peers use the same transformer and node pairing as YSyncExtension.
 * The nestingChanges suite in collabBindingPack.browser.test.ts covers the
 * BlockNote editor API.
 */
import * as YPM from "@y/prosemirror";
import * as Y from "@y/y";
import * as delta from "lib0/delta";
import * as dpos from "lib0/delta/position";
import * as prng from "lib0/prng";
import type { Node, Schema } from "prosemirror-model";
import { EditorState, type PluginView } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { describe, expect } from "vite-plus/test";

import type { SetupEditor } from "../../../../../tests/src/commands/node/setupEditor.js";
import { AttributionExtension } from "./AttributionExtension.js";
import { blockMatchNodes } from "./blockMatchNodes.js";
import { persistentBlockGroups } from "./persistentBlockGroups.js";
import { yblock, ydocOf } from "./persistentBlockGroups.fixture.js";

type AnyBuilder = delta.DeltaBuilderAny;
type AnyDelta = delta.DeltaAny;

// --- schema -----------------------------------------------------------------

/** Use the real BlockNote schema, including the collaboration marks. */
async function setupBindingModel(setupEditor: SetupEditor) {
  const { editor } = await setupEditor({
    extensions: [AttributionExtension()],
  });
  const schema = editor.pmSchema;
  const N = schema.nodes;
  return {
    schema,
    block(
      this: void,
      id: string,
      text: string,
      children: Node[] = [],
      type: "paragraph" | "heading" = "paragraph",
    ): Node {
      return N.blockContainer.create({ id }, [
        N[type].create(null, text ? schema.text(text) : null),
        ...(children.length > 0 ? [N.blockGroup.create(null, children)] : []),
      ]);
    },
    docOf(this: void, blocks: Node[]) {
      return docOf(schema, blocks);
    },
    createPeer: createPeer.bind(undefined, schema),
    render: render.bind(undefined, schema),
  };
}

function docOf({ nodes: N }: Schema, blocks: Node[]): Node {
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
  const N = container.type.schema.nodes;
  return N.blockContainer.create(container.attrs, [
    container.child(0),
    ...(children.length > 0 ? [N.blockGroup.create(null, children)] : []),
  ]);
}

function withText(container: Node, text: string): Node {
  const schema = container.type.schema;
  return container.type.create(container.attrs, [
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
  return docOf(doc.type.schema, rec(topBlocks(doc), 0));
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

function allPaths(doc: Node): Path[] {
  const paths: Path[] = [];
  function visit(blocks: Node[], parent: Path) {
    blocks.forEach((block, index) => {
      const path = [...parent, index];
      paths.push(path);
      visit(childrenOf(block), path);
    });
  }
  visit(topBlocks(doc), []);
  return paths;
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
  schema: Schema,
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
  let state = EditorState.create({ schema, plugins: [plugin] });
  let bindingView: PluginView | undefined;
  // The binding and position mapping use only state and dispatch. Keep the
  // real plugin lifecycle and pass the previous state on every transaction.
  const adapter: Pick<EditorView, "state" | "dispatch"> = {
    get state() {
      return state;
    },
    dispatch(tr) {
      const previous = state;
      state = previous.apply(tr);
      bindingView?.update?.(view, previous);
    },
  };
  const view = adapter as EditorView;
  bindingView = plugin.spec.view!(view);
  YPM.configureYProsemirror({ ytype, renderer })(view.state, view.dispatch);
  expect(YPM.ySyncPluginKey.getState(view.state)?.binding).toBeTruthy();
  return { view, ydoc, errors, destroy: () => bindingView?.destroy?.() };
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
function render(
  schema: Schema,
  ytype: Y.Node,
  renderer: Y.AbstractRenderer | null = null,
) {
  return YPM.ynodeToPmnode(ytype, schema, { renderer, transformer: pipeline });
}

/**
 * Assert that every peer shows the same document, that it equals the
 * pipeline's rendering of the Y document, and that no peer reported an
 * internal error.
 */
function assertConverged(peers: Peer[], msg: string) {
  for (const p of peers) {
    if (p.errors.length > 0) {
      expect(
        p.errors.map((e) => e.message),
        `${msg}: no internal errors`,
      ).toEqual([]);
    }
  }
  const first = peers[0].view.state.doc;
  for (const p of peers.slice(1)) {
    const other = p.view.state.doc;
    if (!other.eq(first)) {
      expect(json(other), `${msg}: peers agree`).toEqual(json(first));
    }
  }
  const rendered = render(first.type.schema, peers[0].ydoc.get("bn"));
  if (!rendered.eq(first)) {
    expect(
      json(rendered),
      `${msg}: the view equals the rendering of the Y document`,
    ).toEqual(json(first));
  }
}

describe("persistent block groups: the per-container stage", () => {
  /** A change on the top-level group's i-th container. */
  function onBlock(i: number, containerChange: AnyBuilder): AnyBuilder {
    return delta
      .create()
      .modify(delta.create().retain(i).modify(containerChange));
  }

  it("hides empty persistent groups at every depth alongside legacy containers", () => {
    const stage = persistentBlockGroups(YPM.$prosemirrorDelta).init();
    const source = ydocOf([
      yblock("a", "A", []),
      yblock("b", "B"),
      yblock("c", "C", [yblock("c1", "C1", [])]),
    ]).done(false);

    expect(stage.applyA(delta.cloneDeep(source)).b?.toJSON()).toEqual(
      ydocOf([
        yblock("a", "A"),
        yblock("b", "B"),
        yblock("c", "C", [yblock("c1", "C1")]),
      ]).toJSON(),
    );
  });

  it("can be configured without implicit groups", () => {
    const stage = persistentBlockGroups(YPM.$prosemirrorDelta, {
      implicitGroups: false,
    }).init();
    const seed = ydocOf([
      yblock("a", "A"),
      yblock("b", "B", [yblock("b1", "B1")]),
    ]).done(false);
    const inserted = stage.applyB(delta.cloneDeep(seed)).a;
    expect(inserted?.toJSON(), "no group is added").toEqual(seed.toJSON());

    const emptied = stage.applyB(
      onBlock(1, delta.create().retain(1).delete(1)),
    ).a;
    expect(
      emptied?.toJSON(),
      "an existing group is still kept when emptied",
    ).toEqual(
      onBlock(
        1,
        delta.create().retain(1).modify(delta.create().delete(1)),
      ).toJSON(),
    );
  });

  it("splits a partial deletion across two groups and retains the first child", ({
    onTestFinished,
  }) => {
    const stage = persistentBlockGroups(YPM.$prosemirrorDelta).init();
    const parent = yblock("p", "P", [
      yblock("a", "A"),
      yblock("b", "B"),
      yblock("d", "D"),
    ]);
    parent.insert([delta.create("blockGroup", {}).insert([yblock("c", "C")])]);
    const seed = ydocOf([parent]).done(false);
    stage.applyA(delta.cloneDeep(seed));

    // The view merges [a, b, d] + [c]. Delete b, d, and c, leaving a.
    const split = stage.applyB(
      onBlock(
        0,
        delta.create().retain(1).modify(delta.create().retain(1).delete(3)),
      ),
    ).a!;
    expect(split.toJSON()).toEqual(
      onBlock(
        0,
        delta
          .create()
          .retain(1)
          .modify(delta.create().retain(1).delete(2))
          .modify(delta.create().delete(1)),
      ).toJSON(),
    );

    const doc = new Y.Doc();
    onTestFinished(() => doc.destroy());
    const root = doc.get("bn");
    root.applyDelta(seed);
    root.applyDelta(split.done(false));
    expect(yContainers(root)).toEqual([
      { id: "p", groups: [1, 0] },
      { id: "a", groups: [] },
    ]);
  });

  describe("incremental changes to merged groups", () => {
    function setupTwoGroups() {
      const stage = persistentBlockGroups(YPM.$prosemirrorDelta).init();
      const parent = yblock("p", "P", [yblock("a", "A"), yblock("b", "B")]);
      parent.insert([
        delta.create("blockGroup", {}).insert([yblock("c", "C")]),
      ]);
      stage.applyA(delta.cloneDeep(ydocOf([parent]).done(false)));
      return stage;
    }

    // Skip the paragraph and any earlier group nodes in the container.
    function onGroup(index: number, change: AnyBuilder) {
      return onBlock(
        0,
        delta
          .create()
          .retain(1 + index)
          .modify(change),
      );
    }

    it("offsets a Y insertion at the start of the second group", () => {
      const stage = setupTwoGroups();
      const inserted = stage.applyA(
        onGroup(1, delta.create().insert([yblock("d", "D")])),
      ).b;
      expect(inserted?.toJSON()).toEqual(
        onGroup(
          0,
          delta
            .create()
            .retain(2)
            .insert([yblock("d", "D")]),
        ).toJSON(),
      );
    });

    it("removes the first group's children when Y deletes its group node", () => {
      const stage = setupTwoGroups();
      const deleted = stage.applyA(
        onBlock(0, delta.create().retain(1).delete(1)),
      ).b;
      expect(deleted?.toJSON()).toEqual(
        onGroup(0, delta.create().delete(2)).toJSON(),
      );
    });

    it("combines edits to both Y groups into one view group modification", () => {
      const stage = setupTwoGroups();
      const edited = stage.applyA(
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
      ).b;
      expect(edited?.toJSON()).toEqual(
        onGroup(
          0,
          delta
            .create()
            .retain(1)
            .delete(1)
            .retain(1)
            .insert([yblock("e", "E")]),
        ).toJSON(),
      );
    });

    it("routes a view insertion at the exact boundary into the earlier Y group", () => {
      const stage = setupTwoGroups();
      const inserted = stage.applyB(
        onGroup(
          0,
          delta
            .create()
            .retain(2)
            .insert([yblock("d", "D")]),
        ),
      ).a;
      expect(inserted?.toJSON()).toEqual(
        onGroup(
          0,
          delta
            .create()
            .retain(2)
            .insert([yblock("d", "D", [])]),
        ).toJSON(),
      );
    });
  });

  it("maps positions through the layout in both directions", () => {
    const stage = persistentBlockGroups(YPM.$prosemirrorDelta).init();
    // Legacy concurrent first nesting left p with two child groups.
    const parent = yblock("p", "P", [yblock("a", "A"), yblock("b", "B")]);
    parent.insert([delta.create("blockGroup", {}).insert([yblock("c", "C")])]);
    stage.applyA(
      delta.cloneDeep(ydocOf([parent, yblock("q", "Q", [])]).done(false)),
    );

    // Y: doc > group > p > [paragraph, g1[a, b], g2[c]] > c > paragraph > offset 1.
    const inC = dpos.create([0, 0, 2, 0, 0, 1]);
    const mappedC = dpos.mapPositionsA(stage, [inC])[0];
    expect(
      mappedC?.path,
      "a position in the second group maps to the merged offset",
    ).toEqual([0, 0, 1, 2, 0, 1]);
    expect(
      dpos.mapPositionsB(stage, [mappedC!])[0]?.path,
      "and maps back into the second group",
    ).toEqual(inC.path);

    const inA = dpos.create([0, 0, 1, 0, 0, 1]);
    expect(dpos.mapPositionsA(stage, [inA])[0]?.path).toEqual(inA.path);
    // The gap behind q's hidden group maps before the group in the view.
    const gapQ = dpos.create([0, 1, 2]);
    expect(dpos.mapPositionsA(stage, [gapQ])[0]?.path).toEqual([0, 1, 1]);
    expect(
      dpos.mapPositionsB(stage, [dpos.create([0, 1, 1])])[0]?.path,
    ).toEqual(gapQ.path);
  });
});

describe("persistent block groups: the binding", () => {
  it("keeps groups across nesting and un-nesting", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { block, docOf, createPeer, render } =
      await setupBindingModel(setupEditor);
    const ydoc = new Y.Doc({ gc: false });
    onTestFinished(() => ydoc.destroy());
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

  it("merges two users nesting a first child under the same block", async ({
    setupEditor,
  }) => {
    const { block, docOf, createPeer } = await setupBindingModel(setupEditor);
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

  it("merges two users adding a new nested block under the same parent", async ({
    setupEditor,
  }) => {
    const { block, docOf, createPeer } = await setupBindingModel(setupEditor);
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

  it("merges the groups of a legacy document and routes later edits into them", async ({
    setupEditor,
  }) => {
    const { block, createPeer } = await setupBindingModel(setupEditor);
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

  it("syncs moves: nest under a parent with children, un-nest, delete a parent", async ({
    setupEditor,
  }) => {
    const { block, docOf, createPeer } = await setupBindingModel(setupEditor);
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

  it("still replaces the container on a block type change, with its group", async ({
    setupEditor,
  }) => {
    const { block, docOf, createPeer, render } =
      await setupBindingModel(setupEditor);
    const ydoc = new Y.Doc({ gc: false });
    const a = createPeer(ydoc);
    try {
      setDoc(a.view, docOf([block("p", "P", [block("a", "A")])]));
      const asHeading = docOf([block("p", "P", [block("a", "A")], "heading")]);
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
  function createSuggestionSetup(
    createPeer: Awaited<ReturnType<typeof setupBindingModel>>["createPeer"],
    onTestFinished: (cleanup: () => void) => void,
  ) {
    const base = new Y.Doc({ gc: false, guid: "base" });
    onTestFinished(() => base.destroy());
    const viewDoc = new Y.Doc({
      isSuggestionDoc: true,
      gc: false,
      guid: "view",
    });
    onTestFinished(() => viewDoc.destroy());
    const editDoc = new Y.Doc({
      isSuggestionDoc: true,
      gc: false,
      guid: "edit",
    });
    onTestFinished(() => editDoc.destroy());
    const attributions = Y.createContentMap();
    const viewRenderer = Y.createDiffRenderer(base, viewDoc, { attributions });
    onTestFinished(() => viewRenderer.destroy());
    viewRenderer.suggestionMode = false;
    const editRenderer = Y.createDiffRenderer(base, editDoc, { attributions });
    onTestFinished(() => editRenderer.destroy());
    editRenderer.suggestionMode = true;
    createNetwork([viewDoc, editDoc]);
    const baseView = createPeer(base);
    onTestFinished(baseView.destroy);
    const viewing = createPeer(viewDoc, { renderer: viewRenderer });
    onTestFinished(viewing.destroy);
    const editing = createPeer(editDoc, { renderer: editRenderer });
    onTestFinished(editing.destroy);
    return {
      base,
      baseView,
      viewing,
      editing,
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

  it("works in suggestion mode: suggest, reject, accept, suggest a deletion", async ({
    setupEditor,
    onTestFinished,
  }) => {
    const { block, docOf, createPeer } = await setupBindingModel(setupEditor);
    const s = createSuggestionSetup(createPeer, onTestFinished);
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
  });

  it("round-trips relative positions across peers", async ({ setupEditor }) => {
    const { block, docOf, createPeer } = await setupBindingModel(setupEditor);
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

  it("applies to the standalone conversions", async ({ setupEditor }) => {
    const { schema, block, docOf, createPeer, render } =
      await setupBindingModel(setupEditor);
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

  it("keeps syncing with a client that has no transformer", async ({
    setupEditor,
  }) => {
    const { block, docOf, createPeer } = await setupBindingModel(setupEditor);
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

  it("converges across reconnects when nested groups are emptied and refilled", async ({
    setupEditor,
  }) => {
    const { block, docOf, createPeer } = await setupBindingModel(setupEditor);
    const da = new Y.Doc({ gc: false });
    const db = new Y.Doc({ gc: false });
    const net = createNetwork([da, db]);
    const a = createPeer(da);
    const b = createPeer(db);
    const y = block("y", "Y");
    const z = block("z", "Z");

    function assertMerged(
      message: string,
      expected: Node,
      layout: ReturnType<typeof yContainers>,
    ) {
      assertConverged([a, b], message);
      expect(json(a.view.state.doc), message).toEqual(json(expected));
      for (const doc of [da, db]) {
        expect(
          yContainers(doc.get("bn")),
          `${message}: exactly one group per container on both peers`,
        ).toEqual(layout);
      }
    }

    try {
      setDoc(a.view, docOf([block("p", "P", [block("x", "X", [y])])]));
      assertConverged([a, b], "seed");

      net.pause();
      // A lifts x's only child; B inserts a sibling beside it and types in x.
      setDoc(a.view, unnest(a.view.state.doc, [0, 0, 0]));
      setDoc(b.view, insertAfter(b.view.state.doc, [0, 0, 0], z));
      setDoc(b.view, typeText(b.view.state.doc, [0, 0], "!"));
      net.resume();
      assertMerged(
        "after lifting y and inserting z",
        docOf([block("p", "P", [block("x", "X!", [z]), y])]),
        [
          { id: "p", groups: [2] },
          { id: "x", groups: [1] },
          { id: "z", groups: [0] },
          { id: "y", groups: [0] },
        ],
      );

      net.pause();
      // A deletes the last child of x while B nests y back under it.
      setDoc(a.view, remove(a.view.state.doc, [0, 0, 0]));
      setDoc(b.view, nest(b.view.state.doc, [0, 1]));
      expect(yContainer(da.get("bn"), "x").groups).toEqual([0]);
      expect(yContainer(db.get("bn"), "x").groups).toEqual([2]);
      net.resume();
      assertMerged(
        "after deleting z and nesting y back",
        docOf([block("p", "P", [block("x", "X!", [y])])]),
        [
          { id: "p", groups: [1] },
          { id: "x", groups: [1] },
          { id: "y", groups: [0] },
        ],
      );
    } finally {
      a.destroy();
      b.destroy();
      da.destroy();
      db.destroy();
    }
  });

  it.for(Array.from({ length: 16 }, (_, seed) => seed))(
    "converges and retains one group per container after seeded edits (seed %i)",
    async (seed, { setupEditor, onTestFinished }) => {
      const { block, docOf, createPeer } = await setupBindingModel(setupEditor);
      const gen = prng.create(seed);
      const docs = [new Y.Doc({ gc: false }), new Y.Doc({ gc: false })];
      for (const [index, doc] of docs.entries()) {
        doc.clientID = index + 1;
        onTestFinished(() => doc.destroy());
      }
      const net = createNetwork(docs);
      const peers = docs.map((doc) => {
        const peer = createPeer(doc);
        onTestFinished(peer.destroy);
        return peer;
      });
      let nextId = 0;
      const newBlock = () => block(`b${nextId++}`, prng.word(gen, 1, 4));
      setDoc(peers[0].view, docOf([newBlock(), newBlock(), newBlock()]));

      for (let round = 0; round < 4; round++) {
        net.pause();
        const ops = prng.uint32(gen, 2, 8);
        for (let i = 0; i < ops; i++) {
          const { view } = prng.oneOf(gen, peers);
          const doc = view.state.doc;
          const path = prng.oneOf(gen, allPaths(doc));
          const choice = prng.uint32(gen, 0, 4);
          let next = doc;
          if (choice === 0) {
            next = insertAfter(doc, path, newBlock());
          } else if (
            choice === 1 &&
            (path.length > 1 || topBlocks(doc).length > 1)
          ) {
            next = remove(doc, path);
          } else if (choice === 2 && path[path.length - 1] > 0) {
            next = nest(doc, path);
          } else if (choice === 3 && path.length > 1) {
            next = unnest(doc, path);
          } else {
            next = typeText(doc, path, prng.word(gen, 1, 3));
          }
          setDoc(view, next);
        }
        net.resume();
        const message = `seed ${seed}, round ${round}`;
        assertConverged(peers, message);
        for (const doc of docs) {
          const containers = yContainers(doc.get("bn"));
          expect(containers.length, message).toBeGreaterThan(0);
          for (const { id, groups } of containers) {
            expect(groups, `${message}: ${id}`).toHaveLength(1);
          }
        }
      }
    },
  );
});
