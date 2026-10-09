// @vitest-environment node
import * as Y from "yjs";
import {
  prosemirrorToYXmlFragment,
  ySyncPluginKey,
  yXmlFragmentToProseMirrorRootNode,
} from "y-prosemirror";
import { expect, it } from "vite-plus/test";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { withCollaboration } from "./index.js";
import { blocksToYXmlFragment } from "../utils.js";
import {
  createVersioningExtension,
  type VersioningController,
} from "../../extensions/Versioning/Versioning.js";
import { createYjsVersionView, YjsVersioningExtension } from "./Versioning.js";
import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { DiffVersioningExtension } from "../../y/index.js";

it("discards diff marks and resumes live updates after a nested-fragment preview", async () => {
  const doc = new Y.Doc();
  const fragment = new Y.XmlFragment();
  doc.getMap("documents").set("body", fragment);
  const snapshots = new Map<string, Uint8Array>();
  const editor = BlockNoteEditor.create(
    withCollaboration({
      extensions: [
        DiffVersioningExtension(),
        YjsVersioningExtension({
          storage: {
            list: async () => ({
              ok: true,
              value: {
                snapshots: [
                  { id: "latest", createdAt: 2 },
                  { id: "first", createdAt: 1 },
                ],
              },
            }),
            getContent: async (id) => {
              const content = snapshots.get(id);
              return content
                ? { ok: true, value: content }
                : { ok: false, error: { type: "not-found" } };
            },
          },
        }),
      ],
      collaboration: { fragment, user: { name: "Test", color: "red" } },
    }),
  );
  const mode = editor.getExtension<VersioningController>("versioning")!;
  // Headless editors have no plugin view, so synchronize the binding explicitly.
  function hydrateBinding() {
    const content = yXmlFragmentToProseMirrorRootNode(
      ySyncPluginKey.getState(editor.prosemirrorState).type,
      editor.pmSchema,
    );
    editor.transact((tr) =>
      tr.replaceWith(0, tr.doc.content.size, content.content),
    );
  }
  function expectNoDiffMarks() {
    editor.prosemirrorState.doc.descendants((node) => {
      expect(
        node.marks.some((mark) => mark.type.name.startsWith("y-attributed-")),
      ).toBe(false);
    });
  }
  try {
    for (const [id, content] of [
      ["first", "axc"],
      ["latest", "abc"],
    ]) {
      editor.replaceBlocks(editor.document, [
        { id: "paragraph", type: "paragraph", content },
      ]);
      blocksToYXmlFragment(editor, editor.document, fragment);
      snapshots.set(id, Y.encodeStateAsUpdate(doc));
    }
    editor.prosemirrorView.updateState(
      editor.prosemirrorState.reconfigure({
        plugins: editor._tiptapEditor.extensionManager.plugins,
      }),
    );
    const live = Y.encodeStateAsUpdate(doc);
    mode.open();
    expect(await mode.list()).toEqual({ status: "done" });
    expect(
      await mode.select({ type: "current" }, { compareTo: "first" }),
    ).toEqual({ status: "done" });
    const inserted: string[] = [];
    const deleted: string[] = [];
    editor.prosemirrorState.doc.descendants((node) => {
      if (!node.isText) {
        return;
      }
      if (node.marks.some((mark) => mark.type.name === "y-attributed-insert")) {
        inserted.push(node.text!);
      }
      if (node.marks.some((mark) => mark.type.name === "y-attributed-delete")) {
        deleted.push(node.text!);
      }
    });
    expect(inserted.join("")).toBe("b");
    expect(deleted.join("")).toBe("x");
    const previewFragment = ySyncPluginKey.getState(
      editor.prosemirrorState,
    ).type;
    expect(previewFragment).not.toBe(fragment);
    prosemirrorToYXmlFragment(editor.prosemirrorState.doc, previewFragment);
    hydrateBinding();
    expect(editor.prosemirrorState.doc.textContent).toContain("x");
    expect(Y.encodeStateAsUpdate(doc)).toEqual(live);
    await mode.select({ type: "snapshot", id: "first" });
    hydrateBinding();
    expect(editor.prosemirrorState.doc.textContent).toBe("axc");
    expectNoDiffMarks();
    await mode.select({ type: "current" });
    hydrateBinding();
    expect(editor.prosemirrorState.doc.textContent).toBe("abc");
    expectNoDiffMarks();
    mode.close();
    expect(ySyncPluginKey.getState(editor.prosemirrorState).type).toBe(
      fragment,
    );
    expect(Y.encodeStateAsUpdate(doc)).toEqual(live);
    hydrateBinding();
    editor.updateBlock("paragraph", { content: "after preview" });
    prosemirrorToYXmlFragment(
      editor.prosemirrorState.doc,
      ySyncPluginKey.getState(editor.prosemirrorState).type,
    );
    expect(
      yXmlFragmentToProseMirrorRootNode(fragment, editor.pmSchema).textContent,
    ).toBe("after preview");
    expectNoDiffMarks();
  } finally {
    mode.dispose();
    editor._tiptapEditor.destroy();
    doc.destroy();
  }
});

it.each(["current", "snapshot"] as const)(
  "renders an opt-in %s diff without changing the live Yjs 13 document",
  async (target) => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("custom-document");
    const snapshots = new Map<string, Uint8Array>();
    const editor = BlockNoteEditor.create(
      withCollaboration({
        extensions: [
          DiffVersioningExtension(),
          YjsVersioningExtension({
            storage: {
              historyIncludesBeginning: true,
              list: async () => ({
                ok: true,
                value: {
                  snapshots: [
                    { id: "latest", createdAt: 2 },
                    { id: "first", createdAt: 1 },
                  ],
                },
              }),
              getContent: async (id, signal) => {
                signal.throwIfAborted();
                const content = snapshots.get(id);
                return content
                  ? { ok: true, value: content }
                  : { ok: false, error: { type: "not-found" } };
              },
            },
          }),
        ],
        collaboration: { fragment, user: { name: "Test", color: "red" } },
      }),
    );
    const mode = editor.getExtension<VersioningController>("versioning")!;
    try {
      for (const [id, content] of [
        ["first", "a"],
        ["latest", "abc"],
      ]) {
        editor.replaceBlocks(editor.document, [
          { id: "paragraph", type: "paragraph", content },
        ]);
        blocksToYXmlFragment(editor, editor.document, fragment);
        snapshots.set(id, Y.encodeStateAsUpdate(doc));
      }
      editor.prosemirrorView.updateState(
        editor.prosemirrorState.reconfigure({
          plugins: editor._tiptapEditor.extensionManager.plugins,
        }),
      );
      const live = Y.encodeStateAsUpdate(doc);
      expect(mode.canCompare).toBe(true);
      expect(createYjsVersionView(editor, fragment).supportsComparison).toBe(
        true,
      );
      mode.open();
      expect(await mode.list()).toEqual({ status: "done" });
      expect(
        await mode.select(
          target === "current"
            ? { type: "current" }
            : { type: "snapshot", id: "latest" },
          { compareTo: "first" },
        ),
      ).toEqual({ status: "done" });
      const inserted: string[] = [];
      editor.prosemirrorState.doc.descendants((node) => {
        if (
          node.isText &&
          node.marks.some((mark) => mark.type.name === "y-attributed-insert")
        ) {
          inserted.push(node.text!);
        }
      });
      // Compared to "first" ("a"), only what came after it is inserted.
      expect(inserted.join("")).toBe("bc");
      expect(Y.encodeStateAsUpdate(doc)).toEqual(live);
      await mode.select({ type: "snapshot", id: "first" });
      await mode.select({ type: "current" });
      // Headless editors have no plugin view to hydrate a replaced binding.
      const preview = yXmlFragmentToProseMirrorRootNode(
        ySyncPluginKey.getState(editor.prosemirrorState).type,
        editor.pmSchema,
      );
      editor.transact((tr) =>
        tr.replaceWith(0, tr.doc.content.size, preview.content),
      );
      expect(editor.prosemirrorState.doc.textContent).toBe("abc");
      editor.prosemirrorState.doc.descendants((node) => {
        expect(
          node.marks.some((mark) => mark.type.name.startsWith("y-attributed-")),
        ).toBe(false);
      });
      mode.close();
      expect(ySyncPluginKey.getState(editor.prosemirrorState)?.type).toBe(
        fragment,
      );
      expect(Y.encodeStateAsUpdate(doc)).toEqual(live);
    } finally {
      mode.dispose();
      editor._tiptapEditor.destroy();
      doc.destroy();
    }
  },
);

it.each([undefined, false])(
  "keeps the live fragment separate while replacing snapshots in its fork, Current capture=%s",
  async (showCurrentVersion) => {
    const doc = new Y.Doc();
    const fragment = doc.getXmlFragment("doc");
    let saved: Uint8Array = new Uint8Array();
    const editor = BlockNoteEditor.create(
      withCollaboration({
        extensions: [
          YjsVersioningExtension({
            storage: {
              showCurrentVersion,
              list: async () => ({
                ok: true,
                value: { snapshots: [{ id: "saved", createdAt: 1 }] },
              }),
              getContent: async () => ({ ok: true, value: saved }),
            },
          }),
        ],
        collaboration: { fragment, user: { name: "Test", color: "red" } },
      }),
    );
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Captured" },
    ]);
    blocksToYXmlFragment(editor, editor.document, fragment);
    saved = Y.encodeStateAsUpdate(doc);
    editor.prosemirrorView.updateState(
      editor.prosemirrorState.reconfigure({
        plugins: editor._tiptapEditor.extensionManager.plugins,
      }),
    );
    const mode = editor.getExtension<VersioningController>("versioning")!;
    try {
      mode.open();
      expect(mode.canCompare).toBe(false);
      expect(editor.isEditable).toBe(false);
      expect(await mode.list()).toEqual({ status: "done" });
      expect(mode.store.state).toMatchObject({
        displayed:
          showCurrentVersion === false
            ? { type: "snapshot", id: "saved" }
            : { type: "current" },
      });
      expect(ySyncPluginKey.getState(editor.prosemirrorState)?.type).not.toBe(
        fragment,
      );
      const latest = BlockNoteEditor.create();
      try {
        latest.replaceBlocks(latest.document, [
          { type: "paragraph", content: "Remote latest" },
        ]);
        blocksToYXmlFragment(latest, latest.document, fragment);
      } finally {
        latest._tiptapEditor.destroy();
      }
      const remoteContent = Y.encodeStateAsUpdate(doc);
      await mode.select({ type: "snapshot", id: "saved" });
      await mode.select({ type: "current" });
      expect(editor.prosemirrorState.doc.textContent).toBe("Captured");
      mode.close();
      expect(editor.isEditable).toBe(true);
      expect(ySyncPluginKey.getState(editor.prosemirrorState)?.type).toBe(
        fragment,
      );
      // Headless editors do not run the plugin view that hydrates the restored binding.
      expect(Y.encodeStateAsUpdate(doc)).toEqual(remoteContent);
    } finally {
      mode.dispose();
      editor._tiptapEditor.destroy();
      doc.destroy();
    }
  },
);

it("accepts a non-default schema in the public view and extension factory", () => {
  const schema = BlockNoteSchema.create();
  const paragraphOnly = BlockNoteSchema.create({
    blockSpecs: { paragraph: schema.blockSpecs.paragraph },
  });
  const doc = new Y.Doc();
  const fragment = doc.getXmlFragment("doc");
  const Versions = createVersioningExtension(
    (
      editor: BlockNoteEditor<
        typeof paragraphOnly.blockSchema,
        typeof paragraphOnly.inlineContentSchema,
        typeof paragraphOnly.styleSchema
      >,
    ) => ({
      adapter: createYjsVersionView(editor, fragment),
      storage: {
        async list() {
          return { ok: true, value: { snapshots: [] } };
        },
        async getContent() {
          return { ok: true, value: Y.encodeStateAsUpdate(doc) };
        },
      },
    }),
  );
  const editor = BlockNoteEditor.create(
    withCollaboration({
      schema: paragraphOnly,
      extensions: [Versions()],
      collaboration: { fragment, user: { name: "Test", color: "red" } },
    }),
  );
  try {
    editor.prosemirrorView.updateState(
      editor.prosemirrorState.reconfigure({
        plugins: editor._tiptapEditor.extensionManager.plugins,
      }),
    );
    const mode = editor.getExtension(Versions)!;
    mode.open();
    expect(mode.store.state.mode).toBe("versions");
    mode.close();
  } finally {
    editor._tiptapEditor.destroy();
    doc.destroy();
  }
});
