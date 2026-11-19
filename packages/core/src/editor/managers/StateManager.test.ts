/** @vitest-environment jsdom */
import { Plugin } from "prosemirror-state";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { BlockNoteEditor } from "../BlockNoteEditor.js";
import { createExtension } from "../BlockNoteExtension.js";

describe("StateManager editability", () => {
  let editor: BlockNoteEditor;

  beforeEach(() => {
    editor = BlockNoteEditor.create();
    editor.mount(document.createElement("div"));
  });

  afterEach(() => editor.unmount());

  const restriction = createExtension(() => ({
    key: "testRestriction",
    prosemirrorPlugins: [new Plugin({ props: { editable: () => false } })],
  }));

  it.each(["mount", "register", "replace", "unregister"] as const)(
    "allows editability subscribers to register plugins during %s without duplicate views",
    (operation) => {
      editor.unmount();
      const createView = vi.fn();
      const destroyView = vi.fn();
      const updateView = vi.fn();
      const observer = createExtension(() => ({
        key: "testObserver",
        prosemirrorPlugins: [
          new Plugin({
            view() {
              createView();
              return { update: updateView, destroy: destroyView };
            },
          }),
        ],
      }));
      editor = BlockNoteEditor.create({
        extensions:
          operation === "mount" || operation === "unregister"
            ? [restriction()]
            : [],
      });
      if (operation !== "mount") {
        editor.mount(document.createElement("div"));
      }
      const observed: boolean[] = [];
      const unsubscribe = editor.onEditableChange((editable) => {
        observed.push(editable);
        editor.registerExtension(observer());
      });
      if (operation === "mount") {
        editor.mount(document.createElement("div"));
      } else if (operation === "register") {
        editor.registerExtension(restriction());
      } else if (operation === "replace") {
        editor.replaceExtension(undefined, restriction());
      } else {
        editor.unregisterExtension(restriction);
      }
      expect(observed).toEqual([operation === "unregister"]);
      expect(createView).toHaveBeenCalledTimes(1);
      editor.transact((tr) => tr.setMeta("testUpdate", true));
      expect(updateView).toHaveBeenCalledTimes(1);
      unsubscribe();
      editor.unmount();
      expect(destroyView).toHaveBeenCalledTimes(1);
    },
  );

  it("keeps editing disabled until every independent lock is released", () => {
    const releasePreview = editor.acquireEditingLock();
    const releaseUpload = editor.acquireEditingLock();
    expect(editor.isEditable).toBe(false);

    releasePreview();
    releasePreview();
    expect(editor.isEditable).toBe(false);

    releaseUpload();
    expect(editor.isEditable).toBe(true);

    const releaseOther = editor.acquireEditingLock();
    releaseUpload();
    expect(editor.isEditable).toBe(false);
    releaseOther();
    expect(editor.isEditable).toBe(true);
  });

  it("preserves the application's latest editable setting", () => {
    const release = editor.acquireEditingLock();
    editor.isEditable = true;
    expect(editor.isEditable).toBe(false);

    editor.isEditable = false;
    release();
    expect(editor.isEditable).toBe(false);

    editor.isEditable = true;
    expect(editor.isEditable).toBe(true);
  });

  it("notifies transaction subscribers without reporting document changes", () => {
    const changes = vi.fn();
    const editableStates: boolean[] = [];
    editor.onChange(changes);
    editor._tiptapEditor.on("transaction", () => {
      editableStates.push(editor.isEditable);
    });

    const release = editor.acquireEditingLock();
    expect(editableStates.length).toBeGreaterThan(0);
    expect(editableStates.every((editable) => !editable)).toBe(true);
    editableStates.length = 0;
    const releaseOther = editor.acquireEditingLock();
    releaseOther();
    expect(editableStates).toEqual([]);
    release();

    expect(editableStates.length).toBeGreaterThan(0);
    expect(editableStates.every((editable) => editable)).toBe(true);
    expect(changes).not.toHaveBeenCalled();
  });

  it("uses editable metadata for both inputs and skips changes that keep editing locked", () => {
    const metadata: unknown[] = [];
    const changes = vi.fn();
    editor.onChange(changes);
    editor._tiptapEditor.on("transaction", ({ transaction }) => {
      metadata.push(transaction.getMeta("editable"));
    });

    editor.isEditable = false;
    expect(metadata.filter((value) => value !== undefined)).toEqual([true]);
    metadata.length = 0;
    const releasePreview = editor.acquireEditingLock();
    editor.isEditable = true;
    const releaseUpload = editor.acquireEditingLock();
    releasePreview();
    expect(metadata).toEqual([]);
    expect(editor.isEditable).toBe(false);

    releaseUpload();
    expect(metadata.filter((value) => value !== undefined)).toEqual([true]);
    expect(editor.isEditable).toBe(true);
    expect(changes).not.toHaveBeenCalled();
  });

  it("applies initial editability and preserves it across remounts", () => {
    editor.unmount();
    editor = BlockNoteEditor.create({ _tiptapOptions: { editable: false } });
    editor.mount(document.createElement("div"));
    expect(editor.isEditable).toBe(false);
    expect(editor.prosemirrorView.editable).toBe(false);

    editor.isEditable = true;
    expect(editor.isEditable).toBe(true);
    editor.isEditable = false;
    editor.unmount();
    editor.mount(document.createElement("div"));
    expect(editor.prosemirrorView.editable).toBe(false);
  });

  it("honours editability set before mount", () => {
    editor.unmount();
    editor = BlockNoteEditor.create();
    editor.isEditable = false;
    expect(editor.isEditable).toBe(false);
    editor.mount(document.createElement("div"));
    expect(editor.isEditable).toBe(false);
    expect(editor.prosemirrorView.editable).toBe(false);
  });

  it("groups application editability changes into the pending transaction", () => {
    const transactions = vi.fn();
    const changes = vi.fn();
    editor._tiptapEditor.on("transaction", transactions);
    editor.onChange(changes);

    editor.transact(() => {
      editor.isEditable = false;
    });
    expect(editor.isEditable).toBe(false);
    expect(transactions).toHaveBeenCalled();
    expect(changes).not.toHaveBeenCalled();

    transactions.mockClear();
    editor.transact((tr) => {
      tr.insertText("hello", 1);
      editor.isEditable = true;
    });
    expect(editor.isEditable).toBe(true);
    expect(editor.prosemirrorState.doc.textContent).toContain("hello");
    expect(transactions).toHaveBeenCalled();
    expect(changes).toHaveBeenCalledTimes(1);
  });

  it("composes with pending document and metadata-only transactions", () => {
    const release = editor.transact((tr) => {
      tr.insertText("hello", 1);
      return editor.acquireEditingLock();
    });
    expect(editor.prosemirrorState.doc.textContent).toContain("hello");
    expect(editor.isEditable).toBe(false);

    editor.transact(release);
    expect(editor.isEditable).toBe(true);
  });

  it("publishes changes to a plugin's editability restriction", () => {
    editor.unmount();
    let pluginAllowsEditing = true;
    const restriction = createExtension(() => ({
      key: "testEditability",
      prosemirrorPlugins: [
        new Plugin({ props: { editable: () => pluginAllowsEditing } }),
      ],
    }));
    editor = BlockNoteEditor.create({ extensions: [restriction()] });
    expect(editor.isEditable).toBe(true);
    editor.mount(document.createElement("div"));

    const observed: boolean[] = [];
    const unsubscribe = editor.onEditableChange((editable) => {
      expect(editable).toBe(editor.isEditable);
      observed.push(editable);
    });
    const changes = vi.fn();
    editor.onChange(changes);

    pluginAllowsEditing = false;
    editor.transact((tr) => tr.setMeta("testEditability", true));
    expect(editor.isEditable).toBe(false);
    expect(observed).toEqual([false]);

    pluginAllowsEditing = true;
    editor.transact((tr) => tr.setMeta("testEditability", true));
    expect(editor.isEditable).toBe(true);
    expect(observed).toEqual([false, true]);

    expect(changes).not.toHaveBeenCalled();
    unsubscribe();
  });

  it.each(
    [false, true].flatMap((mounted) =>
      [false, true].flatMap((initiallyEditable) =>
        [false, true].map((pluginAllowsEditing) => ({
          mounted,
          initiallyEditable,
          pluginAllowsEditing,
        })),
      ),
    ),
  )(
    "keeps getters and subscriptions consistent (mounted=$mounted, initial=$initiallyEditable, plugin=$pluginAllowsEditing)",
    ({ mounted, initiallyEditable, pluginAllowsEditing }) => {
      editor.unmount();
      const restriction = createExtension(() => ({
        key: "testEditability",
        prosemirrorPlugins: [
          new Plugin({ props: { editable: () => pluginAllowsEditing } }),
        ],
      }));
      editor = BlockNoteEditor.create({
        _tiptapOptions: { editable: initiallyEditable },
        extensions: [restriction()],
      });
      if (mounted) {
        editor.mount(document.createElement("div"));
      }
      const observed: boolean[] = [];
      const expected: boolean[] = [];
      let previous = initiallyEditable && (!mounted || pluginAllowsEditing);
      const unsubscribe = editor.onEditableChange((editable) => {
        expect(editor.isEditable).toBe(editable);
        observed.push(editable);
      });

      function expectEditable(editable: boolean) {
        expect(editor.isEditable).toBe(editable);
        if (mounted) {
          expect(editor.prosemirrorView.editable).toBe(editable);
        }
        if (previous !== editable) {
          expected.push(editable);
          previous = editable;
        }
        expect(observed).toEqual(expected);
      }

      expectEditable(previous);
      editor.isEditable = !initiallyEditable;
      expectEditable(!initiallyEditable && (!mounted || pluginAllowsEditing));
      const releasePreview = editor.acquireEditingLock();
      expectEditable(false);
      const releaseUpload = editor.acquireEditingLock();
      expectEditable(false);
      releasePreview();
      editor.isEditable = true;
      expectEditable(false);
      releaseUpload();
      expectEditable(!mounted || pluginAllowsEditing);
      releaseUpload();
      editor.isEditable = true;
      expectEditable(!mounted || pluginAllowsEditing);
      const releaseOther = editor.acquireEditingLock();
      expectEditable(false);
      editor.isEditable = false;
      expectEditable(false);
      releaseOther();
      expectEditable(false);

      unsubscribe();
      unsubscribe();
      editor.isEditable = true;
      editor.acquireEditingLock()();
      expect(observed).toEqual(expected);
    },
  );

  it.each(["application", "feature"] as const)(
    "honours %s restrictions before a pending transaction reaches the view",
    (source) => {
      const observed = vi.fn((editable: boolean) => {
        expect(editor.isEditable).toBe(editable);
      });
      const unsubscribe = editor.onEditableChange(observed);

      const release = editor.transact(() => {
        let release: () => void;
        if (source === "application") {
          editor.isEditable = false;
          release = () => {
            editor.isEditable = true;
          };
        } else {
          release = editor.acquireEditingLock();
        }
        // The view has not received the transaction yet, but cannot override
        // the application's or a feature's read-only restriction.
        expect(editor.prosemirrorView.editable).toBe(true);
        expect(editor.isEditable).toBe(false);
        expect(observed.mock.calls).toEqual([[false]]);
        return release;
      });
      expect(editor.prosemirrorView.editable).toBe(false);
      editor.transact(release);
      expect(editor.prosemirrorView.editable).toBe(true);
      expect(editor.isEditable).toBe(true);
      expect(observed.mock.calls).toEqual([[false], [true]]);
      unsubscribe();
    },
  );

  it("rechecks plugin restrictions on mount and clears them on unmount", () => {
    editor.unmount();
    const restriction = createExtension(() => ({
      key: "testEditability",
      prosemirrorPlugins: [new Plugin({ props: { editable: () => false } })],
    }));
    editor = BlockNoteEditor.create({ extensions: [restriction()] });
    const observed = vi.fn();
    const unsubscribe = editor.onEditableChange(observed);
    const host = document.createElement("div");

    expect(editor.isEditable).toBe(true);
    editor.mount(host);
    expect(editor.isEditable).toBe(false);
    editor.unmount();
    expect(editor.isEditable).toBe(true);
    editor.mount(host);
    expect(editor.isEditable).toBe(false);
    expect(observed.mock.calls).toEqual([[false], [true], [false]]);
    unsubscribe();
  });
});
