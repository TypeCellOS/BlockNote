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

describe("ExtensionManager unique keys", () => {
  it("throws when two extensions are registered directly with the same key", () => {
    const first = createExtension(() => ({
      key: "dup",
      value: "first",
    }));
    const second = createExtension(() => ({
      key: "dup",
      value: "second",
    }));

    // Two registrations of the same key are a configuration error and must fail
    // loudly rather than silently dropping the second.
    expect(() => createMountedEditor([first(), second()])).toThrow(
      /already registered/,
    );
  });

  it("throws when a blockNoteExtensions dependency reuses an already-registered key", () => {
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

    // Registering the dependency directly and also declaring a (distinct)
    // extension with the same key via blockNoteExtensions is a duplicate - keys
    // must be unique regardless of how the extension is registered.
    expect(() => createMountedEditor([depDirect(), parent()])).toThrow(
      /already registered/,
    );
  });

  it("throws when a shared sub-dependency is declared by two parents", () => {
    // A single sub-extension factory declared by two different parents produces
    // two distinct instances with the same key - a duplicate. Shared extensions
    // must be registered once, not depended upon by multiple parents.
    const sharedSub = createExtension(() => ({ key: "shared-sub" }));
    const parentA = createExtension(() => ({
      key: "parent-a",
      blockNoteExtensions: [sharedSub()],
    }));
    const parentB = createExtension(() => ({
      key: "parent-b",
      blockNoteExtensions: [sharedSub()],
    }));

    expect(() => createMountedEditor([parentA(), parentB()])).toThrow(
      /already registered/,
    );
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
});
