import { describe, expect } from "vite-plus/test";
import type { BlockNoteEditor } from "../../BlockNoteEditor.js";
import { createExtension } from "../../BlockNoteExtension.js";

it("validates shortcut names at initialization", async ({ setupEditor }) => {
  await expect(
    setupEditor({
      extensions: [
        createExtension({
          key: "invalid-shortcut",
          keyboardShortcuts: { "InvalidModifier-k": () => true },
        }),
      ],
    }),
  ).rejects.toThrow("Unrecognized modifier name: InvalidModifier");
});

describe("extension dependencies", () => {
  it("does not replace an already registered dependency", async ({
    setupEditor,
  }) => {
    const depDirect = createExtension(() => ({ key: "dep", value: "direct" }));
    const depFromParent = createExtension(() => ({
      key: "dep",
      value: "from-parent",
    }));
    const parent = createExtension(() => ({
      key: "parent",
      blockNoteExtensions: [depFromParent()],
    }));
    const { editor } = await setupEditor({
      extensions: [depDirect(), parent()],
    });

    expect(editor.getExtension(parent)).toBeDefined();
    expect(editor.getExtension(depDirect)?.value).toBe("direct");
    expect(editor.getExtension(depFromParent)).toBeUndefined();
    expect(editor.extensions.get("dep")).toHaveProperty("value", "direct");
  });

  it("registers a dependency declared via blockNoteExtensions", async ({
    setupEditor,
  }) => {
    const dep = createExtension(() => ({ key: "lonely-dep", value: "dep" }));
    const parent = createExtension(() => ({
      key: "lonely-parent",
      blockNoteExtensions: [dep()],
    }));
    const { editor } = await setupEditor({ extensions: [parent()] });

    expect(editor.getExtension(parent)).toBeDefined();
    expect(editor.getExtension(dep)?.value).toBe("dep");
  });
});

describe("runtime extension registration", () => {
  it("preserves factory lookup when registering an instance directly", async ({
    setupEditor,
  }) => {
    const extension = createExtension(() => ({ key: "factory", value: 42 }));
    const { editor } = await setupEditor({ extensions: [extension()] });
    const instance = editor.getExtension(extension)!;

    expect(editor.unregisterExtension(extension)).toBe(instance);
    editor.registerExtension(instance);
    expect(editor.getExtension(extension)).toBe(instance);
  });

  it("returns only registered instances once when removing a group", async ({
    setupEditor,
  }) => {
    const first = { key: "first" };
    const second = { key: "second" };
    const { editor } = await setupEditor({
      extensions: [() => first, () => second],
    });

    expect(
      editor.unregisterExtension([first, first, second, "missing"]),
    ).toEqual([first, second]);
    expect(editor.unregisterExtension(first)).toBeUndefined();
  });

  it("accepts callers whose argument can be a key or a group", async ({
    setupEditor,
  }) => {
    function remove(editor: BlockNoteEditor, keys: string | string[]) {
      return editor.unregisterExtension(keys);
    }
    const first = { key: "first" };
    const second = { key: "second" };
    const { editor } = await setupEditor({
      extensions: [() => first, () => second],
    });

    expect(remove(editor, "first")).toBe(first);
    expect(remove(editor, ["second"])).toEqual([second]);
  });
});
