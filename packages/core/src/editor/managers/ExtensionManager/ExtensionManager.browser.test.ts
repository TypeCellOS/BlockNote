import { Plugin, PluginKey } from "prosemirror-state";
import { aroundEach, describe, expect, vi } from "vite-plus/test";

import { withTiptapStyleCleanup } from "../../../../../../tests/src/commands/browser/tiptapFixtureStyles.js";
import { createExtension } from "../../BlockNoteExtension.js";
import type { BlockNoteEditor } from "../../BlockNoteEditor.js";

// Check the stylesheet after the mounted editor fixture removes its host.
aroundEach(withTiptapStyleCleanup);

describe("runtime extension lifecycle", () => {
  it("mounts nested plugin-less extensions once and cleans them up", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: "dom" });
    const host = editor.domElement!;
    const parentCleanup = vi.fn();
    const childCleanup = vi.fn();
    const parentMount = vi.fn(() => parentCleanup);
    const childMount = vi.fn(() => childCleanup);
    const child = { key: "child", mount: childMount };
    const parent = {
      key: "parent",
      mount: parentMount,
      blockNoteExtensions: [() => child],
    };
    editor.registerExtension(parent);
    editor.registerExtension(parent);
    expect(parentMount).toHaveBeenCalledTimes(1);
    expect(childMount).toHaveBeenCalledTimes(1);
    editor.unregisterExtension([parent, child]);
    expect(parentCleanup).toHaveBeenCalledTimes(1);
    expect(childCleanup).toHaveBeenCalledTimes(1);
    editor.registerExtension(parent);
    editor.unmount();
    editor.mount(host);
    expect(parentMount).toHaveBeenCalledTimes(3);
    expect(childMount).toHaveBeenCalledTimes(3);
  });

  it("cleans up removed controllers even when replacement plugins conflict", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: "dom" });
    const key = new PluginKey("replacement-collision");
    const cleanup = vi.fn();
    const removed = { key: "removed-before-conflict", mount: () => cleanup };
    editor.registerExtension([
      removed,
      {
        key: "retained-before-conflict",
        prosemirrorPlugins: [new Plugin({ key })],
      },
    ]);
    expect(() =>
      editor.replaceExtension(removed, {
        key: "conflicting-replacement",
        prosemirrorPlugins: [new Plugin({ key })],
      }),
    ).toThrow(/keyed plugin/);
    expect(cleanup).toHaveBeenCalledTimes(1);
    editor.unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("allows cleanup to re-register the same instance after plugin removal", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: "dom" });
    const host = editor.domElement!;
    const key = new PluginKey("cleanup-identical");
    const plugin = new Plugin({ key });
    let resurrect = true;
    let registrationError: unknown;
    const mount = vi.fn(() => () => {
      if (resurrect) {
        resurrect = false;
        try {
          editor.registerExtension(extension);
        } catch (error) {
          registrationError = error;
        }
      }
    });
    const extension = {
      key: "cleanup-identical",
      prosemirrorPlugins: [plugin],
      mount,
    };
    editor.registerExtension(extension);
    editor.unregisterExtension(extension);
    expect(registrationError).toBeUndefined();
    expect(editor.getExtension(extension.key)).toBe(extension);
    expect(mount).toHaveBeenCalledTimes(2);
    expect(key.get(editor.prosemirrorState)).toBe(plugin);
    editor.unmount();
    editor.mount(host);
    expect(key.get(editor.prosemirrorState)).toBe(plugin);
  });

  it("does not mount an extension removed by an earlier mount hook", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: "dom" });
    const childMount = vi.fn();
    const child = { key: "removed-child", mount: childMount };
    editor.registerExtension([
      {
        key: "removing-parent",
        mount() {
          editor.unregisterExtension(child);
        },
      },
      child,
    ]);
    expect(editor.getExtension(child.key)).toBeUndefined();
    expect(childMount).not.toHaveBeenCalled();
  });

  it("mounts runtime extensions and cleans them up when removed", async ({
    setupEditor,
  }) => {
    let mounts = 0;
    let unmounts = 0;
    const extension = createExtension(() => ({
      key: "runtime-lifecycle",
      mount({ signal }: { signal: AbortSignal }) {
        expect(signal.aborted).toBe(false);
        mounts++;
        return () => {
          unmounts++;
        };
      },
    }));
    const { editor } = await setupEditor({ mountType: "dom" });
    const host = editor.domElement!;
    editor.registerExtension(extension());
    expect(mounts).toBe(1);
    const instance = editor.getExtension(extension)!;
    editor.unregisterExtension(extension);
    expect(unmounts).toBe(1);
    editor.registerExtension(instance);
    expect(mounts).toBe(2);
    editor.unmount();
    expect(unmounts).toBe(2);
    editor.mount(host);
    expect(mounts).toBe(3);
  });
});

describe("Extension keyboard shortcuts", () => {
  it("preserves the outer event for fallback matching after a nested key event", async ({
    setupEditor,
  }) => {
    const nestedEvent = new KeyboardEvent("keydown", {
      key: "x",
      bubbles: true,
    });
    const nested = vi.fn(() => true);
    const fallback = vi.fn(() => true);
    const { editor } = await setupEditor({
      mountType: "dom",
      extensions: [
        createExtension({
          key: "nested-shortcuts",
          keyboardShortcuts: {
            "Shift-K": ({ editor }) => {
              editor.domElement!.dispatchEvent(nestedEvent);
              return false;
            },
            K: fallback,
            x: nested,
          },
        }),
      ],
    });
    const outerEvent = new KeyboardEvent("keydown", {
      key: "K",
      keyCode: 75,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    editor.domElement!.dispatchEvent(outerEvent);
    expect(nested).toHaveBeenCalledExactlyOnceWith({
      editor,
      event: nestedEvent,
    });
    expect(fallback).toHaveBeenCalledExactlyOnceWith({
      editor,
      event: outerEvent,
    });
    expect(outerEvent.defaultPrevented).toBe(true);
  });

  it("forwards the original event and preserves modifier matching and fallthrough", async ({
    setupEditor,
  }) => {
    const first = vi.fn(() => false);
    const second = vi.fn(() => true);
    const { editor } = await setupEditor({
      mountType: "dom",
      extensions: [
        createExtension({
          key: "first-shortcut",
          runsBefore: ["second-shortcut"],
          keyboardShortcuts: { "Ctrl-Shift-k": first },
        }),
        createExtension({
          key: "second-shortcut",
          keyboardShortcuts: { "Ctrl-Shift-k": second },
        }),
      ],
    });
    const event = new KeyboardEvent("keydown", {
      key: "K",
      keyCode: 75,
      ctrlKey: true,
      shiftKey: true,
      repeat: true,
      bubbles: true,
      cancelable: true,
    });
    editor.domElement!.dispatchEvent(event);
    expect(first).toHaveBeenCalledExactlyOnceWith({ editor, event });
    expect(second).toHaveBeenCalledExactlyOnceWith({ editor, event });
    expect(event.defaultPrevented).toBe(true);
    editor.domElement!.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", bubbles: true }),
    );
    expect(first).toHaveBeenCalledOnce();
  });
});

/**
 * Returns the index of the plugin identified by `key` within the editor's
 * ProseMirror plugin list. A lower index means it runs/applies earlier.
 */
function pluginIndex(
  editor: BlockNoteEditor<any, any, any>,
  key: PluginKey,
): number {
  return editor.prosemirrorState.plugins.findIndex(
    (plugin) => (plugin as any).spec?.key === key,
  );
}

describe("ExtensionManager de-duplication by key", () => {
  it("registers only the first extension when two share a key", async ({
    setupEditor,
  }) => {
    let mountCount = 0;

    const first = createExtension(() => ({
      key: "dup",
      value: "first",
      mount() {
        mountCount++;
        return () => {};
      },
    }));
    const second = createExtension(() => ({
      key: "dup",
      value: "second",
      mount() {
        mountCount++;
        return () => {};
      },
    }));

    const { editor } = await setupEditor({
      mountType: "dom",
      extensions: [first(), second()],
    });

    // The first registration wins.
    expect(editor.getExtension(first)?.value).toBe("first");
    // The second registration was skipped entirely.
    expect(editor.getExtension(second)).toBeUndefined();
    expect((editor.extensions.get("dup") as any)?.value).toBe("first");
    expect(
      [...editor.extensions.values()].filter((e) => e.key === "dup").length,
    ).toBe(1);
    // Only the registered extension was mounted.
    expect(mountCount).toBe(1);
  });
});

describe("ExtensionManager ordering", () => {
  it("orders an extension before another it declares in runsBefore", async ({
    setupEditor,
  }) => {
    const firstKey = new PluginKey("rb-first");
    const secondKey = new PluginKey("rb-second");

    const first = createExtension(() => ({
      key: "rb-first",
      runsBefore: ["rb-second"],
      prosemirrorPlugins: [new Plugin({ key: firstKey })],
    }));
    const second = createExtension(() => ({
      key: "rb-second",
      prosemirrorPlugins: [new Plugin({ key: secondKey })],
    }));

    // Register in the "wrong" order to prove runsBefore — not array order —
    // determines precedence.
    const { editor } = await setupEditor({
      mountType: "dom",
      extensions: [second(), first()],
    });

    expect(pluginIndex(editor, firstKey)).toBeLessThan(
      pluginIndex(editor, secondKey),
    );
  });

  it("flattens sub-extensions and runs the parent after its blockNoteExtensions dependency", async ({
    setupEditor,
  }) => {
    const subKey = new PluginKey("sub-order");
    const parentKey = new PluginKey("parent-order");

    const sub = createExtension(() => ({
      key: "ordered-sub",
      prosemirrorPlugins: [new Plugin({ key: subKey })],
    }));
    const parent = createExtension(() => ({
      key: "ordered-parent",
      blockNoteExtensions: [sub()],
      prosemirrorPlugins: [new Plugin({ key: parentKey })],
    }));

    const { editor } = await setupEditor({
      mountType: "dom",
      extensions: [parent()],
    });

    // The sub-extension is flattened into the editor's extensions...
    expect(editor.getExtension(sub)).toBeDefined();
    expect(editor.getExtension(parent)).toBeDefined();

    // ...and because the parent declares the sub as a dependency, the sub runs
    // before the parent (even though the parent is registered first).
    expect(pluginIndex(editor, subKey)).toBeLessThan(
      pluginIndex(editor, parentKey),
    );
  });

  it("forces a blockNoteExtensions dependency before a parent that has a higher base priority", async ({
    setupEditor,
  }) => {
    // The parent declares `runsBefore` on an unrelated extension, which raises
    // its priority above the default. Without an explicit dependency edge, the
    // higher-priority parent would run before its sub. The dependency must
    // override that so the sub still runs first.
    const subKey = new PluginKey("forced-sub");
    const parentKey = new PluginKey("forced-parent");
    const otherKey = new PluginKey("forced-other");

    const other = createExtension(() => ({
      key: "forced-other",
      prosemirrorPlugins: [new Plugin({ key: otherKey })],
    }));
    const sub = createExtension(() => ({
      key: "forced-sub",
      prosemirrorPlugins: [new Plugin({ key: subKey })],
    }));
    const parent = createExtension(() => ({
      key: "forced-parent",
      runsBefore: ["forced-other"],
      blockNoteExtensions: [sub()],
      prosemirrorPlugins: [new Plugin({ key: parentKey })],
    }));

    const { editor } = await setupEditor({
      mountType: "dom",
      extensions: [parent(), other()],
    });

    // The parent runs before the unrelated extension (its declared runsBefore)...
    expect(pluginIndex(editor, parentKey)).toBeLessThan(
      pluginIndex(editor, otherKey),
    );
    // ...but its dependency still runs before it.
    expect(pluginIndex(editor, subKey)).toBeLessThan(
      pluginIndex(editor, parentKey),
    );
  });

  it("runs a shared sub-dependency before both extensions that declare it", async ({
    setupEditor,
  }) => {
    const subKey = new PluginKey("shared-sub");
    const parentAKey = new PluginKey("shared-parent-a");
    const parentBKey = new PluginKey("shared-parent-b");
    const otherKey = new PluginKey("shared-other");

    const other = createExtension(() => ({
      key: "shared-other",
      prosemirrorPlugins: [new Plugin({ key: otherKey })],
    }));
    // A single sub-extension instance declared by two different parents. It is
    // registered once (de-duplicated) and must run before both parents.
    const sharedSub = createExtension(() => ({
      key: "shared-sub",
      prosemirrorPlugins: [new Plugin({ key: subKey })],
    }));
    const parentA = createExtension(() => ({
      key: "shared-parent-a",
      blockNoteExtensions: [sharedSub()],
      prosemirrorPlugins: [new Plugin({ key: parentAKey })],
    }));
    // parentB declares the *already-registered* sub (so its registration is
    // de-duplicated) and has a higher base priority via runsBefore. The
    // dependency must still be recorded on the de-duplicated path so the sub
    // runs before parentB too.
    const parentB = createExtension(() => ({
      key: "shared-parent-b",
      runsBefore: ["shared-other"],
      blockNoteExtensions: [sharedSub()],
      prosemirrorPlugins: [new Plugin({ key: parentBKey })],
    }));

    const { editor } = await setupEditor({
      mountType: "dom",
      extensions: [parentA(), parentB(), other()],
    });

    // The sub is registered exactly once despite being declared twice.
    expect(
      [...editor.extensions.values()].filter((e) => e.key === "shared-sub")
        .length,
    ).toBe(1);

    // parentB's higher base priority puts it before the unrelated extension...
    expect(pluginIndex(editor, parentBKey)).toBeLessThan(
      pluginIndex(editor, otherKey),
    );
    // ...but the shared sub still runs before both parents.
    expect(pluginIndex(editor, subKey)).toBeLessThan(
      pluginIndex(editor, parentAKey),
    );
    expect(pluginIndex(editor, subKey)).toBeLessThan(
      pluginIndex(editor, parentBKey),
    );
  });
});
