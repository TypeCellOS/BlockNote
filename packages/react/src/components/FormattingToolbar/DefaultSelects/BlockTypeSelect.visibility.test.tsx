/** @vitest-environment node */
import { BlockNoteSchema, createBlockSpec } from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { ComponentProps } from "../../../editor/ComponentsContext.js";
import { BlockTypeSelect } from "./BlockTypeSelect.js";

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    custom: createBlockSpec(
      { type: "custom", propSchema: {}, content: "inline" },
      { render: () => ({ dom: document.createElement("div") }) },
    )(),
    customMedia: createBlockSpec(
      { type: "customMedia", propSchema: {}, content: "none" },
      { render: () => ({ dom: document.createElement("div") }) },
    )(),
  },
});

// Visibility and menu construction don't require a DOM. Replace only the
// editor subscription and UI skin; run the real component and schema filtering.
let selectedBlocks = [{ id: "custom", type: "custom", props: {} }];
let renderedSelect: ComponentProps["FormattingToolbar"]["Select"] | undefined;
const editor = {
  schema,
  dictionary: en,
  isEditable: true,
  focus: vi.fn(),
  transact: (callback: () => void) => callback(),
  updateBlock: vi.fn(),
};

vi.mock("../../../hooks/useBlockNoteEditor.js", () => ({
  useBlockNoteEditor: () => editor,
}));
vi.mock("../../../hooks/useEditorState.js", () => ({
  useEditorState: () => selectedBlocks,
}));
vi.mock("../../../editor/PortalElementOverride.js", () => ({
  usePortalElement: () => null,
}));
vi.mock("../../../editor/UIModeContext.js", () => ({
  useUIMode: () => "desktop",
}));
vi.mock("../../../editor/ComponentsContext.js", () => ({
  useComponentsContext: () => ({
    FormattingToolbar: {
      Select: (props: ComponentProps["FormattingToolbar"]["Select"]) => {
        renderedSelect = props;
        return null;
      },
    },
  }),
}));

beforeEach(() => {
  selectedBlocks = [{ id: "custom", type: "custom", props: {} }];
  renderedSelect = undefined;
  editor.isEditable = true;
  vi.clearAllMocks();
});

describe("BlockTypeSelect visibility", () => {
  it("allows converting an unlisted custom inline block without rebuilding the toolbar", () => {
    renderToStaticMarkup(<BlockTypeSelect />);
    expect(renderedSelect).toBeDefined();
    const current = renderedSelect!.items.find((item) => item.isSelected);
    expect(current).toMatchObject({ text: "custom", isDisabled: true });
    const paragraph = renderedSelect!.items.find(
      (item) => item.text === "Paragraph",
    );
    expect(paragraph?.isSelected).toBe(false);
    paragraph!.onClick();
    expect(editor.focus).toHaveBeenCalledOnce();
    expect(editor.updateBlock).toHaveBeenCalledWith(selectedBlocks[0], {
      type: "paragraph",
      props: undefined,
    });
  });

  it("keeps the existing label and options for listed block types", () => {
    selectedBlocks = [{ id: "paragraph", type: "paragraph", props: {} }];
    renderToStaticMarkup(<BlockTypeSelect />);
    expect(
      renderedSelect!.items.filter((item) => item.isSelected),
    ).toMatchObject([{ text: "Paragraph" }]);
    expect(renderedSelect!.items).toHaveLength(15);
  });

  it("uses a supplied custom block label instead of adding a fallback", () => {
    renderToStaticMarkup(
      <BlockTypeSelect
        items={[{ name: "Custom label", type: "custom", icon: () => null }]}
      />,
    );
    expect(renderedSelect!.items).toHaveLength(1);
    expect(renderedSelect!.items[0]).toMatchObject({
      text: "Custom label",
      isSelected: true,
    });
    expect(renderedSelect!.items[0].isDisabled).not.toBe(true);
  });

  it("converts every selected block using the existing transaction", () => {
    selectedBlocks.push({ id: "second", type: "paragraph", props: {} });
    renderToStaticMarkup(<BlockTypeSelect />);
    renderedSelect!.items.find((item) => item.text === "Paragraph")!.onClick();
    expect(editor.updateBlock.mock.calls).toEqual(
      selectedBlocks.map((block) => [
        block,
        { type: "paragraph", props: undefined },
      ]),
    );
  });

  it.each(["image", "table", "audio", "file", "video", "customMedia"])(
    "keeps the select hidden for %s blocks",
    (type) => {
      selectedBlocks = [{ id: type, type, props: {} }];
      renderToStaticMarkup(<BlockTypeSelect />);
      expect(renderedSelect).toBeUndefined();
    },
  );

  it("does not show an empty menu", () => {
    renderToStaticMarkup(<BlockTypeSelect items={[]} />);
    expect(renderedSelect).toBeUndefined();
  });

  it("does not show a fallback when all destinations are filtered out", () => {
    renderToStaticMarkup(
      <BlockTypeSelect
        items={[{ name: "Missing block", type: "missing", icon: () => null }]}
      />,
    );
    expect(renderedSelect).toBeUndefined();
  });

  it("does not show the select in a read-only editor", () => {
    editor.isEditable = false;
    renderToStaticMarkup(<BlockTypeSelect />);
    expect(renderedSelect).toBeUndefined();
  });
});
