import {
  type BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
  defaultProps,
} from "@blocknote/core";
import { describe, expect } from "vite-plus/test";

import { installBrowserNoMotion } from "../../../../tests/src/commands/browser/installBrowserTestStyles.js";
import coreStyles from "../style.css?inline";
import { defaultToggledState } from "../blocks/ToggleWrapper/createToggleFrame.js";

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

function childContent(root: HTMLElement) {
  const child = root.querySelector<HTMLElement>(
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

describe.each(["paragraph", "toggleListItem", "framedNote"] as const)(
  "a %s's colors",
  (type) => {
    const it = globalThis.it.extend<{
      colorFixture: {
        editor: BlockNoteEditor<
          typeof schema.blockSchema,
          typeof schema.inlineContentSchema,
          typeof schema.styleSchema
        >;
        root: ShadowRoot;
      };
    }>({
      colorFixture: async ({ setupEditor, onTestFinished }, use) => {
        // Test Core's stylesheet without skin rules already loaded by a
        // previous suite in the same browser document.
        const host = document.createElement("div");
        const root = host.attachShadow({ mode: "open" });
        const style = document.createElement("style");
        style.textContent = coreStyles;
        const mount = document.createElement("div");
        root.append(style, mount);
        document.body.append(host);
        // The editor fixture registers its unmount later, so it runs first.
        onTestFinished(() => host.remove());
        onTestFinished(installBrowserNoMotion(root));

        if (type === "toggleListItem") {
          // Toggles hide their children until opened. Restore just this key.
          const key = "toggle-parent";
          const previous = localStorage.getItem(key);
          onTestFinished(() => {
            if (previous === null) {
              localStorage.removeItem(key);
            } else {
              localStorage.setItem(key, previous);
            }
          });
          defaultToggledState.set({ id: "parent" }, true);
        }
        const { editor } = await setupEditor({
          mountType: false,
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
        editor.mount(mount);
        await use({ editor, root });
      },
    });

    it("apply to its child blocks", ({ colorFixture: { editor } }) => {
      const root = editor.domElement!;
      expect(getComputedStyle(childContent(root)).color).toBe(RED);
      expect(backgroundBehind(childContent(root))).toBe(BLUE_BACKGROUND);
    });

    it("follow changes to the block's props", ({
      colorFixture: { editor },
    }) => {
      const root = editor.domElement!;

      editor.updateBlock("parent", {
        props: { textColor: "green", backgroundColor: "default" },
      });

      expect(getComputedStyle(childContent(root)).color).toBe(GREEN);
      expect(backgroundBehind(childContent(root))).not.toBe(BLUE_BACKGROUND);
    });

    it("apply to its child blocks in the internal HTML", ({
      colorFixture: { editor, root },
    }) => {
      const html = document.createElement("div");
      html.className = "bn-default-styles";
      html.innerHTML = editor.blocksToFullHTML(editor.document);
      root.append(html);
      try {
        expect(getComputedStyle(childContent(html)).color).toBe(RED);
        expect(backgroundBehind(childContent(html))).toBe(BLUE_BACKGROUND);
      } finally {
        html.remove();
      }
    });
  },
);
