import { describe, expect, it, vi } from "vite-plus/test";

import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import {
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
  },
  {
    render: renderDiv,
    meta: { draggable: false },
    renderFrame(block) {
      const dom = document.createElement("section");
      dom.className = "content-frame";
      dom.dataset.title = JSON.stringify(block.content);
      dom.dataset.count = String(block.children.length);
      const slot = document.createElement("div");
      dom.append(slot);
      // The chrome shows the title and the child count, so the frame keeps
      // them current.
      return {
        dom,
        slot,
        update(updated) {
          dom.dataset.title = JSON.stringify(updated.content);
          dom.dataset.count = String(updated.children.length);
          return true;
        },
      };
    },
  },
)();

// A frame without an `update` hook, whose chrome shows a prop.
const PropFrame = createBlockSpec(
  {
    type: "propFrame",
    propSchema: { tone: { default: "calm" } },
    content: "inline",
  },
  {
    render: renderDiv,
    renderFrame(block) {
      const dom = document.createElement("section");
      dom.className = "prop-frame";
      dom.dataset.tone = block.props.tone;
      return { dom, slot: dom };
    },
  },
)();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    toggle: Toggle,
    contentFrame: ContentFrame,
    propFrame: PropFrame,
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
  it("keeps a frame without an update hook until the block's props change", () => {
    const editor = editorWith([
      { id: "frame", type: "propFrame", content: "Title" },
    ]);
    try {
      const root = editor.domElement!;
      const first = root.querySelector(".prop-frame");
      editor.updateBlock("frame", { content: "Typed" });
      editor.updateBlock("frame", {
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      });
      expect(root.querySelector(".prop-frame")).toBe(first);

      editor.updateBlock("frame", { props: { tone: "loud" } });
      const rebuilt = root.querySelector<HTMLElement>(".prop-frame")!;
      expect(rebuilt).not.toBe(first);
      expect(rebuilt.dataset.tone).toBe("loud");
      expect(rebuilt.textContent).toContain("Typed");
      expect(rebuilt.textContent).toContain("Body");
    } finally {
      editor._tiptapEditor.destroy();
    }
  });

  it("does not rebuild a declined frame's block while typing", () => {
    const editor = editorWith([
      {
        id: "frame",
        type: "toggle",
        props: { mode: "plain" },
        content: "Title",
      },
    ]);
    try {
      const block = () =>
        editor.domElement!.querySelector(
          '[data-node-type="blockContainer"][data-id="frame"]',
        );
      const first = block();
      editor.updateBlock("frame", { content: "Typed" });
      editor.updateBlock("frame", {
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      });
      expect(block()).toBe(first);
      expect(editor.domElement!.querySelector(".toggle")).toBeNull();
    } finally {
      editor._tiptapEditor.destroy();
    }
  });

  it("keeps a declined frame's block when a prop change keeps it declined", () => {
    const editor = editorWith([
      {
        id: "heading",
        type: "heading",
        content: "Title",
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      },
    ]);
    try {
      const block = () =>
        editor.domElement!.querySelector(
          '[data-node-type="blockContainer"][data-id="heading"]',
        );
      const child = () => editor.domElement!.querySelector('[data-id="child"]');
      const [firstBlock, firstChild] = [block(), child()];
      editor.updateBlock("heading", { props: { textColor: "red" } });
      expect(block()).toBe(firstBlock);
      expect(child()).toBe(firstChild);

      // Becoming toggleable draws the frame: the view is rebuilt.
      editor.updateBlock("heading", { props: { isToggleable: true } });
      expect(block()).not.toBe(firstBlock);
      expect(block()!.querySelector(".bn-toggle-frame")).not.toBeNull();
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
    expect(block?.node.getAttribute("data-node-type")).toBe("blockContainer");
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

it("supplies the node-view context to vanilla layout block frames, and stamps them", () => {
  const contextualLayout = createBlockSpec(
    {
      type: "contextualLayout",
      propSchema: { tone: { default: "plain" } },
      content: "none",
      layoutOnly: true,
    },
    {
      renderFrame() {
        expect(this.renderType).toBe("nodeView");
        expect(this.props?.node.type.name).toBe("contextualLayout");
        const dom = document.createElement("section");
        const slot = document.createElement("div");
        dom.append(slot);
        return { dom, slot };
      },
    },
  )();
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, contextualLayout },
    }),
    initialContent: [
      {
        id: "box",
        type: "contextualLayout",
        props: { tone: "loud" },
        children: [{ content: "Body" }],
      },
    ],
  });
  try {
    editor.mount(document.createElement("div"));
    const frame = editor.domElement!.querySelector("section")!;
    expect(frame.getAttribute("data-node-type")).toBe("contextualLayout");
    expect(frame.getAttribute("data-id")).toBe("box");
    expect(frame.getAttribute("data-tone")).toBe("loud");
    expect(frame.firstElementChild!.hasAttribute("data-frame-slot")).toBe(true);
  } finally {
    editor._tiptapEditor.destroy();
  }
});

it("rebuilds or declines a frame when update returns false and cleans up each instance", () => {
  const destroy = vi.fn();
  const lifecycleFrame = createBlockSpec(
    {
      type: "lifecycleFrame",
      propSchema: {
        mode: { default: "first", values: ["first", "second", "plain"] },
      },
      content: "inline",
    },
    {
      render: renderDiv,
      renderFrame(block) {
        if (block.props.mode === "plain") {
          return undefined;
        }
        const dom = document.createElement("section");
        dom.className = "lifecycle-frame";
        return {
          dom,
          slot: dom,
          destroy,
          update(updated) {
            return updated.props.mode === block.props.mode;
          },
        };
      },
    },
  )();
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, lifecycleFrame },
    }),
    initialContent: [
      {
        id: "frame",
        type: "lifecycleFrame",
        content: "Title",
        children: [{ id: "child", content: "Body" }],
      },
    ],
  });
  try {
    editor.mount(document.createElement("div"));
    const root = editor.domElement!;
    const first = root.querySelector(".lifecycle-frame");
    editor.updateBlock("frame", { content: "Updated" });
    expect(root.querySelector(".lifecycle-frame")).toBe(first);
    expect(destroy).not.toHaveBeenCalled();
    editor.updateBlock("frame", { props: { mode: "second" } });
    expect(root.querySelector(".lifecycle-frame")).not.toBe(first);
    expect(destroy).toHaveBeenCalledTimes(1);
    editor.updateBlock("frame", { props: { mode: "plain" } });
    expect(root.querySelector(".lifecycle-frame")).toBeNull();
    expect(destroy).toHaveBeenCalledTimes(2);
    expect(editor.getBlock("frame")!.children[0].id).toBe("child");
    expect(root.textContent).toContain("Updated");
    expect(root.textContent).toContain("Body");
    editor.updateBlock("frame", { props: { mode: "first" } });
    expect(root.querySelector(".lifecycle-frame")).not.toBeNull();
  } finally {
    editor._tiptapEditor.destroy();
  }
  // Three frames, plus the one drawn to ask the declined frame again when
  // its mode changed back: each is destroyed.
  expect(destroy).toHaveBeenCalledTimes(4);
});

it("exports title and children inside the static frame slot with the DOM context", () => {
  const staticFrame = createBlockSpec(
    {
      type: "staticFrame",
      propSchema: { framed: { default: true } },
      content: "inline",
    },
    {
      render: renderDiv,
      renderFrame(block) {
        expect(this.renderType).toBe("dom");
        expect(this.props).toBeUndefined();
        expect(this.propSchema).toEqual({ framed: { default: true } });
        if (!block.props.framed) {
          return undefined;
        }
        const dom = document.createElement("section");
        dom.className = "static-frame";
        const slot = document.createElement("div");
        slot.className = "static-slot";
        dom.append(slot);
        return { dom, slot };
      },
    },
  )();
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, staticFrame },
    }),
    initialContent: [
      {
        id: "framed",
        type: "staticFrame",
        content: "Title",
        children: [{ id: "body", content: "Body" }],
      },
      {
        id: "plain",
        type: "staticFrame",
        props: { framed: false },
        content: "Plain",
      },
    ],
  });
  try {
    const dom = document.createElement("div");
    dom.innerHTML = editor.blocksToFullHTML(editor.document);
    expect(dom.querySelectorAll(".static-frame")).toHaveLength(1);
    const slot = dom.querySelector(".static-slot")!;
    expect(slot.querySelector(":scope > .bn-block-content")?.textContent).toBe(
      "Title",
    );
    expect(slot.querySelector(":scope > .bn-block-group")?.textContent).toBe(
      "Body",
    );
    expect(dom.textContent).toContain("Plain");
    expect(editor.tryParseHTMLToBlocks(dom.innerHTML)).toEqual(editor.document);
  } finally {
    editor._tiptapEditor.destroy();
  }
});

it("keeps a vanilla frame whose chrome changes by itself", async () => {
  const counterFrame = createBlockSpec(
    { type: "counterFrame", propSchema: {}, content: "inline" },
    {
      render: renderDiv,
      renderFrame() {
        const dom = document.createElement("section");
        dom.className = "counter-frame";
        const counter = document.createElement("button");
        counter.contentEditable = "false";
        counter.className = "counter";
        counter.textContent = "0";
        const slot = document.createElement("div");
        dom.append(counter, slot);
        return { dom, slot };
      },
    },
  )();
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, counterFrame },
    }),
    initialContent: [{ id: "frame", type: "counterFrame", content: "Title" }],
  });
  try {
    editor.mount(document.createElement("div"));
    const root = editor.domElement!;
    const frame = root.querySelector(".counter-frame");
    // The chrome updates itself, for example from a click handler.
    root.querySelector(".counter")!.textContent = "1";
    // Lets ProseMirror's mutation observer run.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(root.querySelector(".counter-frame")).toBe(frame);
    expect(root.querySelector(".counter")!.textContent).toBe("1");
    expect(editor.document).toHaveLength(1);
    expect(editor.document[0].content).toEqual([
      { type: "text", text: "Title", styles: {} },
    ]);
  } finally {
    editor._tiptapEditor.destroy();
  }
});

it("parses chrome outside the static frame slot as no document content", () => {
  // A frame with a labelled control beside its slot, as the toggle frame
  // draws its buttons. The control's text is in the exported HTML, but the
  // round-trip parse reads only the slot.
  const chromeFrame = createBlockSpec(
    { type: "chromeFrame", propSchema: {}, content: "inline" },
    {
      render: renderDiv,
      renderFrame() {
        const dom = document.createElement("div");
        dom.className = "chrome-frame";
        const control = document.createElement("button");
        control.contentEditable = "false";
        control.textContent = "UI LABEL";
        const slot = document.createElement("div");
        slot.className = "chrome-slot";
        dom.append(control, slot);
        return { dom, slot };
      },
    },
  )();
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, chromeFrame },
    }),
    initialContent: [
      {
        id: "framed",
        type: "chromeFrame",
        content: "Title",
        children: [{ id: "body", content: "Body" }],
      },
    ],
  });
  try {
    const html = editor.blocksToFullHTML(editor.document);
    expect(html).toContain("UI LABEL");
    expect(editor.tryParseHTMLToBlocks(html)).toEqual(editor.document);
  } finally {
    editor._tiptapEditor.destroy();
  }
});

it("never gives one layout block's frame to another layout block", () => {
  // ProseMirror offers a view whose node is gone to the next node of the same
  // type. A frame shows one block, so it must refuse another block.
  const patchedBox = createBlockSpec(
    {
      type: "patchedBox",
      propSchema: { tone: { default: "plain" } },
      content: "none",
      layoutOnly: true,
    },
    {
      renderFrame(block) {
        const dom = document.createElement("section");
        dom.dataset.drawnFor = block.id;
        return { dom, slot: dom, update: () => true };
      },
    },
  )();
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, patchedBox },
    }),
    initialContent: [
      { id: "a", type: "patchedBox", children: [{ content: "A" }] },
      { id: "b", type: "patchedBox", children: [{ content: "B" }] },
    ],
  });
  try {
    editor.mount(document.createElement("div"));
    editor.transact(() => {
      editor.updateBlock("b", { props: { tone: "loud" } });
      editor.removeBlocks(["a"]);
    });
    const frame = editor.domElement!.querySelector('[data-id="b"]')!;
    expect(frame.getAttribute("data-drawn-for")).toBe("b");
  } finally {
    editor._tiptapEditor.destroy();
  }
});
