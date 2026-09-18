/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../blocks/BlockNoteSchema.js";
import {
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { createExtension } from "../editor/BlockNoteExtension.js";
import { createBlockSpec } from "./blocks/createSpec.js";
import { createInlineContentSpec } from "./inlineContent/createSpec.js";
import { createStyleSpec } from "./styles/createSpec.js";

const editorsToCleanup: BlockNoteEditor<any, any, any>[] = [];

afterEach(() => {
  for (const editor of editorsToCleanup) {
    editor.unmount();
  }
  editorsToCleanup.length = 0;
});

function createMountedEditor(
  options: Parameters<typeof BlockNoteEditor.create>[0],
) {
  const editor = BlockNoteEditor.create(options);
  editor.mount(document.createElement("div"));
  editorsToCleanup.push(editor);
  return editor;
}

// A block spec that registers an editor extension, like
// `@blocknote/xl-multi-column`'s `ColumnBlock` does with its drop handler.
const CustomBlockExtension = createExtension(() => ({
  key: "customBlockExtension",
}));

const createCustomBlockSpec = createBlockSpec(
  { type: "customBlock", propSchema: {}, content: "none" },
  { render: () => ({ dom: document.createElement("div") }) },
  [CustomBlockExtension()],
);

const customInlineContent = createInlineContentSpec(
  { type: "customInlineContent", propSchema: {}, content: "none" },
  { render: () => ({ dom: document.createElement("span") }) },
);

const customStyle = createStyleSpec(
  { type: "customStyle", propSchema: "boolean" },
  { render: () => ({ dom: document.createElement("span") }) },
);

describe("CustomBlockNoteSchema.extend", () => {
  it("does not mutate the default specs shared by every default schema", () => {
    const extended = BlockNoteSchema.create().extend({
      blockSpecs: { customBlock: createCustomBlockSpec() },
      inlineContentSpecs: { customInlineContent },
      styleSpecs: { customStyle },
    });

    // The extended schema has the added specs...
    expect(extended.blockSchema).toHaveProperty("customBlock");
    expect(extended.inlineContentSchema).toHaveProperty("customInlineContent");
    expect(extended.styleSchema).toHaveProperty("customStyle");

    // ...the module-level defaults it was created from are untouched...
    expect(defaultBlockSpecs).not.toHaveProperty("customBlock");
    expect(defaultInlineContentSpecs).not.toHaveProperty("customInlineContent");
    expect(defaultStyleSpecs).not.toHaveProperty("customStyle");

    // ...so a default schema created afterwards doesn't inherit them.
    const fresh = BlockNoteSchema.create();
    expect(fresh.blockSchema).not.toHaveProperty("customBlock");
    expect(fresh.inlineContentSchema).not.toHaveProperty("customInlineContent");
    expect(fresh.styleSchema).not.toHaveProperty("customStyle");
  });

  it("does not mutate the spec objects passed to `create`", () => {
    const blockSpecs = { paragraph: defaultBlockSpecs.paragraph };

    BlockNoteSchema.create({ blockSpecs }).extend({
      blockSpecs: { customBlock: createCustomBlockSpec() },
    });

    expect(Object.keys(blockSpecs)).toEqual(["paragraph"]);
  });

  it("keeps an extended schema's blocks and their extensions out of later default-schema editors", () => {
    // Regression: extending a default schema used to write the added block
    // specs into the shared default specs, so every editor created afterwards
    // without an explicit schema silently got the extra block types - and the
    // editor extensions they register (e.g. multi-column's drop handler).
    const extendedEditor = createMountedEditor({
      schema: BlockNoteSchema.create().extend({
        blockSpecs: { customBlock: createCustomBlockSpec() },
      }),
    });
    expect(extendedEditor.getExtension(CustomBlockExtension)).toBeDefined();

    const defaultEditor = createMountedEditor({});
    expect(defaultEditor.schema.blockSchema).not.toHaveProperty("customBlock");
    expect(defaultEditor.pmSchema.nodes).not.toHaveProperty("customBlock");
    expect(defaultEditor.getExtension(CustomBlockExtension)).toBeUndefined();
  });
});
