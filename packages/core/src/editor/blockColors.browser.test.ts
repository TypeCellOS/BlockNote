import { afterEach, describe, expect, it } from "vite-plus/test";

import "../style.css";
import { BlockNoteSchema } from "../blocks/BlockNoteSchema.js";
import { defaultToggledState } from "../blocks/ToggleWrapper/createToggleFrame.js";
import { defaultProps } from "../blocks/defaultProps.js";
import { createBlockSpec } from "../schema/blocks/createSpec.js";
import { BlockNoteEditor } from "./BlockNoteEditor.js";

// A block's text and background color also apply to its child blocks. The
// block's content may sit inside a frame (`renderFrame`), at any depth.

const RED = "rgb(224, 62, 62)";
const GREEN = "rgb(77, 100, 97)";
const BLUE_BACKGROUND = "rgb(221, 235, 241)";

// A custom block whose frame puts the content two levels down.
const framedNote = createBlockSpec(
  { type: "framedNote", propSchema: { ...defaultProps }, content: "inline" },
  {
    render() {
      const dom = document.createElement("p");
      return { dom, contentDOM: dom };
    },
    renderFrame() {
      const dom = document.createElement("section");
      const inner = document.createElement("div");
      const slot = document.createElement("div");
      inner.append(slot);
      dom.append(inner);
      return { dom, slot };
    },
  },
)();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: { framedNote },
});

let editor: BlockNoteEditor<any, any, any> | undefined;
let root: HTMLElement | undefined;

afterEach(() => {
  editor?._tiptapEditor.destroy();
  root?.remove();
  editor = undefined;
  root = undefined;
});

function mount(type: string) {
  // Toggles hide their children until opened.
  defaultToggledState.set({ id: "parent" }, true);
  root = document.createElement("div");
  document.body.appendChild(root);
  editor = BlockNoteEditor.create({
    schema,
    initialContent: [
      {
        id: "parent",
        type,
        props: { textColor: "red", backgroundColor: "blue" },
        content: "Parent",
        children: [{ id: "child", type: "paragraph", content: "Child" }],
      },
    ],
  });
  editor.mount(root);
  return root;
}

function childContent(container: HTMLElement) {
  const child = container.querySelector<HTMLElement>(
    '[data-id="child"] .bn-inline-content',
  );
  if (!child) {
    throw new Error("child block not rendered");
  }
  return child;
}

/** The background painted behind the child: the nearest one set on it or an ancestor. */
function backgroundBehind(element: HTMLElement) {
  for (let el: Element | null = element; el; el = el.parentElement) {
    const background = getComputedStyle(el).backgroundColor;
    if (background !== "rgba(0, 0, 0, 0)") {
      return background;
    }
  }
  return undefined;
}

describe.each(["paragraph", "toggleListItem", "framedNote"])(
  "a %s's colors",
  (type) => {
    it("apply to its child blocks", () => {
      const container = mount(type);

      expect(getComputedStyle(childContent(container)).color).toBe(RED);
      expect(backgroundBehind(childContent(container))).toBe(BLUE_BACKGROUND);
    });

    it("follow changes to the block's props", () => {
      const container = mount(type);

      editor!.updateBlock("parent", {
        props: { textColor: "green", backgroundColor: "default" },
      });

      expect(getComputedStyle(childContent(container)).color).toBe(GREEN);
      expect(backgroundBehind(childContent(container))).not.toBe(
        BLUE_BACKGROUND,
      );
    });

    it("apply to its child blocks in the internal HTML", () => {
      mount(type);
      const html = document.createElement("div");
      html.className = "bn-default-styles";
      html.innerHTML = editor!.blocksToFullHTML(editor!.document);
      document.body.appendChild(html);
      try {
        expect(getComputedStyle(childContent(html)).color).toBe(RED);
        expect(backgroundBehind(childContent(html))).toBe(BLUE_BACKGROUND);
      } finally {
        html.remove();
      }
    });
  },
);
