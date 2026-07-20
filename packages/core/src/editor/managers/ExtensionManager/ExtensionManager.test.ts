/**
 * @vitest-environment jsdom
 */
import { Plugin, PluginKey } from "prosemirror-state";
import { describe, expect, it } from "vite-plus/test";

import { createExtension } from "../../BlockNoteExtension.js";
import { BlockNoteEditor } from "../../BlockNoteEditor.js";

function createMountedEditor(
  extensions: BlockNoteEditor<any, any, any>["options"]["extensions"],
) {
  const editor = BlockNoteEditor.create({ extensions });
  editor.mount(document.createElement("div"));
  return editor;
}

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
  it("registers only the first extension when two share a key", () => {
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

    const editor = createMountedEditor([first(), second()]);

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

  it("does not re-register a dependency declared via blockNoteExtensions when it is already registered", () => {
    // Two distinct factories sharing the key "dep".
    const depDirect = createExtension(() => ({
      key: "dep",
      value: "direct",
    }));
    const depFromParent = createExtension(() => ({
      key: "dep",
      value: "from-parent",
    }));
    const parent = createExtension(() => ({
      key: "parent",
      blockNoteExtensions: [depFromParent()],
    }));

    // Register the dependency directly first, then a parent that also pulls in
    // its own "dep" via blockNoteExtensions.
    const editor = createMountedEditor([depDirect(), parent()]);

    expect(editor.getExtension(parent)).toBeDefined();
    // The directly-registered dependency wins; the one declared by the parent
    // is skipped rather than overriding it.
    expect(editor.getExtension(depDirect)?.value).toBe("direct");
    expect(editor.getExtension(depFromParent)).toBeUndefined();
    expect((editor.extensions.get("dep") as any)?.value).toBe("direct");
  });

  it("registers a dependency declared via blockNoteExtensions when it isn't registered otherwise", () => {
    const dep = createExtension(() => ({
      key: "lonely-dep",
      value: "dep",
    }));
    const parent = createExtension(() => ({
      key: "lonely-parent",
      blockNoteExtensions: [dep()],
    }));

    const editor = createMountedEditor([parent()]);

    expect(editor.getExtension(parent)).toBeDefined();
    expect(editor.getExtension(dep)?.value).toBe("dep");
  });
});

describe("ExtensionManager ordering", () => {
  it("orders an extension before another it declares in runsBefore", () => {
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
    const editor = createMountedEditor([second(), first()]);

    expect(pluginIndex(editor, firstKey)).toBeLessThan(
      pluginIndex(editor, secondKey),
    );
  });

  it("flattens sub-extensions and runs the parent after its blockNoteExtensions dependency", () => {
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

    const editor = createMountedEditor([parent()]);

    // The sub-extension is flattened into the editor's extensions...
    expect(editor.getExtension(sub)).toBeDefined();
    expect(editor.getExtension(parent)).toBeDefined();

    // ...and because the parent declares the sub as a dependency, the sub runs
    // before the parent (even though the parent is registered first).
    expect(pluginIndex(editor, subKey)).toBeLessThan(
      pluginIndex(editor, parentKey),
    );
  });

  it("forces a blockNoteExtensions dependency before a parent that has a higher base priority", () => {
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

    const editor = createMountedEditor([parent(), other()]);

    // The parent runs before the unrelated extension (its declared runsBefore)...
    expect(pluginIndex(editor, parentKey)).toBeLessThan(
      pluginIndex(editor, otherKey),
    );
    // ...but its dependency still runs before it.
    expect(pluginIndex(editor, subKey)).toBeLessThan(
      pluginIndex(editor, parentKey),
    );
  });

  it("runs a shared sub-dependency before both extensions that declare it", () => {
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

    const editor = createMountedEditor([parentA(), parentB(), other()]);

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
