// @vitest-environment jsdom
import { Plugin, PluginKey } from "prosemirror-state";
import { Extension as TiptapExtension } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../../blocks/BlockNoteSchema.js";
import { createBlockSpec } from "../../../schema/blocks/createSpec.js";
import { createInlineContentSpec } from "../../../schema/inlineContent/createSpec.js";
import { createStyleSpec } from "../../../schema/styles/createSpec.js";
import { createExtension } from "../../BlockNoteExtension.js";
import { BlockNoteEditor } from "../../BlockNoteEditor.js";

const editors: Array<{ unmount(): void }> = [];
const hosts: HTMLElement[] = [];
afterEach(() => {
  for (const editor of editors.splice(0)) {
    editor.unmount();
  }
  for (const host of hosts.splice(0)) {
    host.remove();
  }
});

function remountEditor(editor: Pick<BlockNoteEditor, "mount" | "unmount">) {
  editor.unmount();
  const host = document.createElement("div");
  document.body.append(host);
  hosts.push(host);
  editor.mount(host);
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
    remountEditor(editor);
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
    remountEditor(editor);
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
    remountEditor(editor);
    expect(key.get(editor.prosemirrorState)).toBeDefined();
    editor.unregisterExtension(extension);
    remountEditor(editor);
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
    remountEditor(editor);
    editor.registerExtension({ key: "added", prosemirrorPlugins: [plugin] });
    editor.replaceBlocks(editor.document, [
      { type: "paragraph", content: "Changed" },
    ]);
    expect(key.getState(editor.prosemirrorState)).toBe(1);
    remountEditor(editor);
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
    remountEditor(editor);
    editor.replaceExtension(original, replacement);
    expect(editor.prosemirrorState.plugins.at(-1)).toBe(
      replacement.prosemirrorPlugins[0],
    );
    remountEditor(editor);
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
    remountEditor(editor);
    editor.registerExtension({ key: "runtime", prosemirrorPlugins: [added] });
    expect(editor.prosemirrorState.plugins.at(-1)).toBe(added);
    remountEditor(editor);
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

it("registers extensions and plugins from editor options, nested extensions, and schema specs", () => {
  function render() {
    const dom = document.createElement("span");
    return { dom, contentDOM: dom };
  }

  function registration(key: string) {
    const plugin = new Plugin({ key: new PluginKey(key) });
    const nestedPlugin = new Plugin({ key: new PluginKey(`${key}-nested`) });
    const extension = createExtension(() => ({
      key,
      prosemirrorPlugins: [plugin],
      tiptapExtensions: [
        TiptapExtension.create({
          name: `${key}-tiptap`,
          addExtensions: () => [
            TiptapExtension.create({
              name: `${key}-nested`,
              addProseMirrorPlugins: () => [nestedPlugin],
            }),
          ],
        }),
      ],
    }));
    return { extension, plugin, nestedPlugin };
  }

  const options = registration("options");
  const nested = registration("nested");
  const block = registration("block");
  const inline = registration("inline");
  const style = registration("style");
  const styleChild = registration("style-child");
  const blockSpec = createBlockSpec(
    { type: "customBlock", propSchema: {}, content: "inline" },
    { render },
  )();
  const inlineSpec = createInlineContentSpec(
    { type: "customInline", propSchema: {}, content: "styled" },
    { render },
    [inline.extension()],
  );
  const styleSpec = createStyleSpec(
    { type: "customStyle", propSchema: "boolean" },
    { render },
    [
      style.extension(),
      createExtension({
        key: "style-parent",
        blockNoteExtensions: [styleChild.extension()],
      }),
    ],
  );
  const inlinePlugin = new Plugin({ key: new PluginKey("inline-node") });
  const stylePlugin = new Plugin({ key: new PluginKey("style-mark") });
  const schema = BlockNoteSchema.create().extend({
    blockSpecs: {
      customBlock: { ...blockSpec, extensions: [block.extension()] },
    },
    inlineContentSpecs: {
      customInline: {
        ...inlineSpec,
        implementation: {
          ...inlineSpec.implementation,
          node: inlineSpec.implementation.node.extend({
            addProseMirrorPlugins: () => [inlinePlugin],
          }),
        },
      },
    },
    styleSpecs: {
      customStyle: {
        ...styleSpec,
        implementation: {
          render,
          mark: styleSpec.implementation.mark.extend({
            addProseMirrorPlugins: () => [stylePlugin],
          }),
        },
      },
    },
  });
  const editor = BlockNoteEditor.create({
    schema,
    extensions: [
      options.extension(),
      createExtension({
        key: "parent",
        blockNoteExtensions: [nested.extension()],
      }),
    ],
  });
  editors.push(editor);
  remountEditor(editor);
  const plugins = editor.prosemirrorState.plugins;

  expect(editor.pmSchema.nodes.customBlock).toBeDefined();
  expect(editor.pmSchema.nodes.customInline).toBeDefined();
  expect(editor.pmSchema.marks.customStyle).toBeDefined();
  for (const { extension, plugin, nestedPlugin } of [
    options,
    nested,
    block,
    inline,
    style,
    styleChild,
  ]) {
    expect(editor.getExtension(extension)).toBeDefined();
    expect(plugins).toContain(plugin);
    expect(plugins).toContain(nestedPlugin);
  }
  expect(plugins).toContain(inlinePlugin);
  expect(plugins).toContain(stylePlugin);
});
