import { describe, expect, it } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
  CONTAINER_SELECTOR,
  getBlockFromElement,
  getDraggableBlockFromElement,
} from "../../extensions/blockDOM.js";
import type { LooseBlockSpec } from "./types.js";
import { createBlockSpec } from "./createSpec.js";

// Behaviour of the vanilla `renderFrame` hook: a block draws the box around
// its content and children, and may decline the frame by returning
// `undefined` — the toggle pattern. A frame can be patched
// in place through `update`.

const renderDiv = () => {
  const dom = document.createElement("div");
  return { dom, contentDOM: dom };
};

// A titled block that is only framed when it says so: closed toggles draw
// the box, open ones render as plain nesting.
const Toggle = createBlockSpec(
  {
    type: "toggle" as const,
    propSchema: {
      mode: {
        default: "plain",
        values: ["plain", "framed"],
      },
    },
    content: "inline",
    children: { allow: "blocks" },
  },
  {
    render: renderDiv,
    renderFrame: (block) => {
      if (block.props.mode !== "framed") {
        return undefined;
      }
      const dom = document.createElement("div");
      dom.className = "toggle";
      const slot = document.createElement("div");
      slot.className = "toggle-slot";
      dom.append(slot);
      return { dom, slot };
    },
  },
)();

// A titled block with an update hook that patches frame chrome in place.
const FrameBox = createBlockSpec(
  {
    type: "frameBox" as const,
    propSchema: {
      flavor: {
        default: "tip",
        values: ["tip", "warning"],
      },
    },
    content: "inline",
    children: { allow: "blocks" },
  },
  {
    render: renderDiv,
    renderFrame: (block) => {
      const dom = document.createElement("div");
      dom.className = "frame-box";
      dom.dataset.flavor = block.props.flavor;
      const slot = document.createElement("div");
      slot.className = "frame-slot";
      dom.append(slot);
      return {
        dom,
        slot,
        update: (newBlock) => {
          dom.dataset.flavor = (newBlock as any).props.flavor;
        },
      };
    },
  },
)();

const ContentFrame = createBlockSpec(
  {
    type: "contentFrame",
    propSchema: {},
    content: "inline",
    children: { allow: "blocks" },
  },
  {
    render: renderDiv,
    meta: { draggable: false },
    renderFrame(block) {
      if (block.children.length === 0) {
        return undefined;
      }
      const dom = document.createElement("section");
      dom.className = "content-frame";
      dom.dataset.title = JSON.stringify(block.content);
      dom.dataset.count = String(block.children.length);
      const slot = document.createElement("div");
      dom.append(slot);
      const fragment = document.createDocumentFragment();
      fragment.append(dom);
      return { dom: fragment, slot };
    },
  },
)();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    toggle: Toggle,
    contentFrame: ContentFrame,
    frameBox: FrameBox,
  } as const,
});

function editorWith(initialContent: any[]) {
  const editor = BlockNoteEditor.create({ schema, initialContent });
  editor.mount(document.createElement("div"));
  return editor;
}

describe("renderFrame decline", () => {
  it("renders plain nesting when declined, frames when accepted, and flips back", () => {
    const editor = editorWith([
      {
        id: "t1",
        type: "toggle",
        props: { mode: "plain" },
        content: "Title",
        children: [{ id: "c1", type: "paragraph", content: "Body" }],
      },
    ]);
    try {
      const root = editor.domElement!;
      // Declined: ordinary nesting, no box.
      expect(root.querySelector(".toggle")).toBeNull();
      expect(root.textContent).toContain("Title");
      expect(root.textContent).toContain("Body");

      editor.updateBlock("t1", {
        props: { mode: "framed" },
      } as any);

      // Accepted: the box wraps the title and the body together, and the
      // child block survives the rebuild.
      const framed = root.querySelector<HTMLElement>(".toggle")!;
      expect(framed).not.toBeNull();
      const slot = framed.querySelector<HTMLElement>(".toggle-slot")!;
      expect(slot.textContent).toContain("Title");
      expect(slot.querySelector('[data-id="c1"]')).not.toBeNull();
      expect(slot.textContent).toContain("Body");
      expect(() => editor.prosemirrorState.doc.check()).not.toThrow();

      editor.updateBlock("t1", {
        props: { mode: "plain" },
      } as any);

      // Declined again: the box is gone, the content is intact.
      expect(root.querySelector(".toggle")).toBeNull();
      expect(root.textContent).toContain("Title");
      expect(root.textContent).toContain("Body");
      expect(root.querySelector('[data-id="c1"]')).not.toBeNull();
      expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
    } finally {
      editor._tiptapEditor.destroy();
    }
  });
});

describe("renderFrame updates", () => {
  it("re-evaluates a declined frame when children appear and disappear", () => {
    const editor = editorWith([
      { id: "frame", type: "contentFrame", content: "Title" },
    ]);
    try {
      expect(editor.domElement!.querySelector(".content-frame")).toBeNull();
      editor.updateBlock("frame", {
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      });
      expect(
        editor
          .domElement!.querySelector(".content-frame")
          ?.getAttribute("data-count"),
      ).toBe("1");
      editor.removeBlocks(["child"]);
      expect(editor.domElement!.querySelector(".content-frame")).toBeNull();
      expect(editor.domElement!.textContent).toContain("Title");
    } finally {
      editor._tiptapEditor.destroy();
    }
  });

  it("refreshes vanilla frame chrome when title content changes", () => {
    const editor = editorWith([
      {
        id: "frame",
        type: "contentFrame",
        content: "Title",
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      },
    ]);
    try {
      editor.updateBlock("frame", { content: "Updated" });
      expect(
        editor
          .domElement!.querySelector(".content-frame")
          ?.getAttribute("data-title"),
      ).toContain("Updated");
      expect(
        editor.domElement!.querySelector('[data-id="child"]')?.textContent,
      ).toBe("Body");
    } finally {
      editor._tiptapEditor.destroy();
    }
  });

  it("mounts children in the slot and patches chrome in place on prop change", () => {
    const editor = editorWith([
      {
        id: "box-0",
        type: "frameBox",
        props: { flavor: "warning" },
        children: [{ id: "box-child", type: "paragraph", content: "Child" }],
      },
    ]);
    try {
      const root = editor.domElement!;
      const box = root.querySelector<HTMLElement>(".frame-box")!;
      // Non-default props are stamped for the round-trip parse to read.
      expect(box.getAttribute("data-flavor")).toBe("warning");
      const slot = box.querySelector<HTMLElement>(".frame-slot")!;
      expect(slot.querySelector('[data-id="box-child"]')).not.toBeNull();
      expect(slot.textContent).toBe("Child");

      editor.updateBlock("box-0", {
        props: { flavor: "tip" },
      } as any);

      // The chrome follows the prop change, and the slot element itself is
      // untouched: the frame patched in place instead of rebuilding. The
      // author's frame also follows a prop returning to its default.
      expect(
        root.querySelector(".frame-box")!.getAttribute("data-flavor"),
      ).toBe("tip");
      expect(root.querySelector(".frame-slot")).toBe(slot);
      expect(slot.querySelector('[data-id="box-child"]')).not.toBeNull();
      expect(() => editor.prosemirrorState.doc.check()).not.toThrow();
    } finally {
      editor._tiptapEditor.destroy();
    }
  });
});

it("honors a titled block's draggable flag through its regular block wrapper", () => {
  const editor = editorWith([
    { id: "locked", type: "contentFrame", content: "Title" },
  ]);
  try {
    const blockSpecs: Record<string, LooseBlockSpec> = editor.schema.blockSpecs;
    const title = editor.domElement!.querySelector(
      '[data-content-type="contentFrame"]',
    )!;
    expect(
      getDraggableBlockFromElement(
        title,
        editor._tiptapEditor.view,
        (type) => blockSpecs[type].implementation.meta?.draggable !== false,
      ),
    ).toBeUndefined();
    const block = getBlockFromElement(title, editor._tiptapEditor.view);
    expect(block).toMatchObject({ id: "locked", type: "contentFrame" });
    expect(block?.node.matches(CONTAINER_SELECTOR)).toBe(false);
  } finally {
    editor._tiptapEditor.destroy();
  }
});

it("supplies the node-view context to vanilla frames", () => {
  const contextualFrame = createBlockSpec(
    { type: "contextualFrame", propSchema: {}, content: "inline" },
    {
      render: renderDiv,
      renderFrame() {
        expect(this.renderType).toBe("nodeView");
        expect(this.props?.node.firstChild?.type.name).toBe("contextualFrame");
        expect(this.blockContentDOMAttributes).toEqual({
          "data-test": "content",
        });
        expect(this.propSchema).toEqual({});
        const dom = document.createElement("div");
        dom.className = "contextual-frame";
        return { dom, slot: dom };
      },
    },
  )();
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, contextualFrame },
    }),
    domAttributes: { blockContent: { "data-test": "content" } },
    initialContent: [{ type: "contextualFrame", content: "Title" }],
  });
  try {
    editor.mount(document.createElement("div"));
    expect(
      editor.domElement?.querySelector(".contextual-frame")?.textContent,
    ).toBe("Title");
  } finally {
    editor._tiptapEditor.destroy();
  }
});
