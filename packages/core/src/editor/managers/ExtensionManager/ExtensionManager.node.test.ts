// @vitest-environment node
import { Plugin, PluginKey } from "prosemirror-state";
import { Extension as TiptapExtension } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { createExtension } from "../../BlockNoteExtension.js";
import { BlockNoteEditor } from "../../BlockNoteEditor.js";

const editors: BlockNoteEditor[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor._tiptapEditor.destroy();
  }
});

function rebuildPlugins(editor: BlockNoteEditor) {
  // This is the state-only step Tiptap performs on every mount. No view is
  // required to prove that its plugin source disagrees with BlockNote's registry.
  editor.prosemirrorView.updateState(
    editor.prosemirrorState.reconfigure({
      plugins: editor._tiptapEditor.extensionManager.plugins,
    }),
  );
}

describe("runtime extension plugin source", () => {
  it("resets selected plugin state without resetting retained plugins", () => {
    const key = new PluginKey<number>("reset");
    const retainedKey = new PluginKey<number>("retained");
    const original = {
      key: "reset",
      prosemirrorPlugins: [
        new Plugin({
          key,
          state: {
            init: () => 1,
            apply: (_tr, value) => value,
          },
        }),
      ],
    };
    const replacement = {
      key: "reset",
      prosemirrorPlugins: [
        new Plugin({
          key,
          state: {
            init: () => 2,
            apply: (_tr, value) => value,
          },
        }),
      ],
    };
    const editor = BlockNoteEditor.create({
      extensions: [
        () => original,
        () => ({
          key: "retained",
          prosemirrorPlugins: [
            new Plugin({
              key: retainedKey,
              state: { init: () => 99, apply: (_tr, value) => value },
            }),
          ],
        }),
      ],
    });
    editors.push(editor);
    rebuildPlugins(editor);
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Keep content" },
    ]);
    editor.replaceExtension(original, replacement);
    expect(key.getState(editor.prosemirrorState)).toBe(1);
    editor.replaceExtension(replacement, replacement, {
      resetPluginStateFor: [key],
    });
    expect(key.getState(editor.prosemirrorState)).toBe(2);
    expect(retainedKey.getState(editor.prosemirrorState)).toBe(99);
    expect(editor.prosemirrorState.doc.textContent).toBe("Keep content");
    rebuildPlugins(editor);
    expect(key.getState(editor.prosemirrorState)).toBe(2);
  });
  it("does not reinstall a removed extension", () => {
    const key = new PluginKey("removed");
    const extension = createExtension(() => ({
      key: "removed",
      prosemirrorPlugins: [new Plugin({ key })],
    }));
    const editor = BlockNoteEditor.create({ extensions: [extension()] });
    editors.push(editor);
    rebuildPlugins(editor);
    expect(key.get(editor.prosemirrorState)).toBeDefined();
    editor.unregisterExtension(extension);
    rebuildPlugins(editor);
    expect(key.get(editor.prosemirrorState)).toBeUndefined();
  });

  it("retains a runtime addition and its state", () => {
    const key = new PluginKey<number>("added");
    const plugin = new Plugin({
      key,
      state: {
        init: () => 0,
        apply: (tr, previous) => previous + (tr.docChanged ? 1 : 0),
      },
    });
    const editor = BlockNoteEditor.create();
    editors.push(editor);
    rebuildPlugins(editor);
    editor.registerExtension({ key: "added", prosemirrorPlugins: [plugin] });
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Changed" },
    ]);
    expect(key.getState(editor.prosemirrorState)).toBe(1);
    rebuildPlugins(editor);
    expect(key.get(editor.prosemirrorState)).toBe(plugin);
    expect(key.getState(editor.prosemirrorState)).toBe(1);
  });

  it("uses the replacement, not the original plugin", () => {
    const key = new PluginKey("replaced");
    const original = {
      key: "replaced",
      prosemirrorPlugins: [new Plugin({ key })],
    };
    const replacement = {
      key: "replaced",
      prosemirrorPlugins: [new Plugin({ key })],
    };
    const editor = BlockNoteEditor.create({ extensions: [() => original] });
    editors.push(editor);
    rebuildPlugins(editor);
    editor.replaceExtension(original, replacement);
    expect(editor.prosemirrorState.plugins.at(-1)).toBe(
      replacement.prosemirrorPlugins[0],
    );
    rebuildPlugins(editor);
    expect(key.get(editor.prosemirrorState)).toBe(
      replacement.prosemirrorPlugins[0],
    );
    expect(editor.prosemirrorState.plugins.at(-1)).toBe(
      replacement.prosemirrorPlugins[0],
    );
  });

  it("keeps runtime additions after low-priority Tiptap plugins", () => {
    const original = new Plugin({ key: new PluginKey("low-priority") });
    const added = new Plugin({ key: new PluginKey("runtime") });
    const editor = BlockNoteEditor.create({
      extensions: [
        () => ({
          key: "low-priority",
          tiptapExtensions: [
            TiptapExtension.create({
              name: "low-priority",
              priority: -1,
              addProseMirrorPlugins: () => [original],
            }),
          ],
        }),
      ],
    });
    editors.push(editor);
    rebuildPlugins(editor);
    editor.registerExtension({ key: "runtime", prosemirrorPlugins: [added] });
    expect(editor.prosemirrorState.plugins.at(-1)).toBe(added);
    rebuildPlugins(editor);
    expect(editor.prosemirrorState.plugins.at(-1)).toBe(added);
  });

  it("preserves factory lookup when registering an instance directly", () => {
    const extension = createExtension(() => ({ key: "factory", value: 42 }));
    const editor = BlockNoteEditor.create({ extensions: [extension()] });
    editors.push(editor);
    const instance = editor.getExtension(extension)!;
    const removed = editor.unregisterExtension(extension);
    expect(removed).toBe(instance);
    editor.registerExtension(instance);
    expect(editor.getExtension(extension)).toBe(instance);
  });

  it("returns only registered instances once when removing a group", () => {
    const first = { key: "first" };
    const second = { key: "second" };
    const editor = BlockNoteEditor.create({
      extensions: [() => first, () => second],
    });
    editors.push(editor);
    expect(
      editor.unregisterExtension([first, first, second, "missing"]),
    ).toEqual([first, second]);
    expect(editor.unregisterExtension(first)).toBeUndefined();
  });

  it("accepts callers whose argument can be a key or a group", () => {
    function remove(editor: BlockNoteEditor, keys: string | string[]) {
      return editor.unregisterExtension(keys);
    }
    const first = { key: "first" };
    const second = { key: "second" };
    const editor = BlockNoteEditor.create({
      extensions: [() => first, () => second],
    });
    editors.push(editor);
    expect(remove(editor, "first")).toBe(first);
    expect(remove(editor, ["second"])).toEqual([second]);
  });
});
