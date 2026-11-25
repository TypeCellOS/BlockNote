import {
  BlockNoteSchema,
  getBlockElementForNode,
  getNodeById,
} from "@blocknote/core";
import {
  BlockNoteViewRaw,
  createReactBlockSpec,
  type ReactCustomBlockFrameProps,
} from "@blocknote/react";
import {
  act,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, vi } from "vite-plus/test";

import type { SetupEditor } from "../../commands/browser/setupEditor.js";

// A layout block draws its box in `renderFrame`.
const createFrameBox = createReactBlockSpec(
  {
    type: "frameBox",
    propSchema: { flavor: { default: "tip" } },
    content: "none",
    layoutOnly: true,
  },
  {
    renderFrame: function LayoutFrame(props) {
      const [alternate, setAlternate] = useState(false);
      const Tag = alternate ? "section" : "div";
      return (
        <Tag className="frame-box">
          <button
            className="swap-root"
            contentEditable={false}
            onClick={() => setAlternate(!alternate)}
          >
            Swap root
          </button>
          <div className="frame-slot" ref={props.slotRef} />
        </Tag>
      );
    },
  },
);

const FrameContext = createContext("outside");
let activeFrames = 0;
const alertConfig = {
  type: "frameAlert",
  propSchema: { flavor: { default: "tip" }, framed: { default: true } },
  content: "inline",
} as const;

function FrameChrome(props: { children: ReactNode; flavor: string }) {
  return (
    <div className="alert-frame" data-flavor={props.flavor}>
      {props.children}
    </div>
  );
}

function AlertFrame({
  block,
  editor,
  slotRef,
}: ReactCustomBlockFrameProps<typeof alertConfig>) {
  const label = useContext(FrameContext);
  const [clicks, setClicks] = useState(0);
  useEffect(() => {
    activeFrames++;
    return () => {
      activeFrames--;
    };
  }, []);
  if (!block.props.framed) {
    return null;
  }
  return (
    <FrameChrome flavor={block.props.flavor}>
      <button
        className="frame-counter"
        contentEditable={false}
        onClick={() => setClicks(clicks + 1)}
      >
        {label}: {clicks}
      </button>
      <button
        className="frame-flavor"
        contentEditable={false}
        onClick={() =>
          editor.updateBlock(block, {
            props: { flavor: "warning" },
          })
        }
      >
        Change flavor
      </button>
      <div className="alert-slot" ref={slotRef} />
    </FrameChrome>
  );
}

const createFrameAlert = createReactBlockSpec(alertConfig, {
  render: (props) => <div className="alert-title" ref={props.contentRef} />,
  renderFrame: AlertFrame,
});

// Framing alone must not change how the block's children nest.
const createToggle = createReactBlockSpec(
  { type: "frameToggle", propSchema: {}, content: "inline" },
  {
    render: (props) => <div ref={props.contentRef} />,
    renderFrame: (props) => (
      <div className="toggle-frame" ref={props.slotRef} />
    ),
  },
);

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    frameBox: createFrameBox(),
    frameAlert: createFrameAlert(),
    frameToggle: createToggle(),
  },
});

let root: Root | undefined;
let div: HTMLDivElement | undefined;
/** Render-phase errors. React 19 reports rather than rethrows these. */
let uncaught: unknown[] = [];

function FrameTestView({
  editor,
  label = "inside",
}: {
  editor: typeof schema.BlockNoteEditor;
  label?: string;
}) {
  return (
    <FrameContext.Provider value={label}>
      <BlockNoteViewRaw
        editor={editor}
        formattingToolbar={false}
        linkToolbar={false}
        slashMenu={false}
        sideMenu={false}
        filePanel={false}
        tableHandles={false}
        emojiPicker={false}
      />
    </FrameContext.Provider>
  );
}

async function mountEditor(
  setupEditor: SetupEditor,
  initialContent: (typeof schema.PartialBlock)[],
) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  div = document.createElement("div");
  document.body.appendChild(div);

  const { editor } = await setupEditor({
    mountType: false,
    schema,
    trailingBlock: false,
    initialContent,
  });

  uncaught = [];
  root = createRoot(div, {
    onUncaughtError: (error) => uncaught.push(error),
    onCaughtError: (error) => uncaught.push(error),
  });
  // Mount during a React commit as applications do. Frame construction must
  // not depend on a nested synchronous React render succeeding.
  await act(async () => {
    root!.render(<FrameTestView editor={editor} />);
  });

  return editor;
}

afterEach(async () => {
  // TipTap only removes its shared stylesheet once no editor host is
  // connected. Detach this fixture's host before React unmounts the view.
  div?.remove();
  try {
    if (root) {
      await act(async () => root!.unmount());
    }
  } finally {
    vi.unstubAllGlobals();
    root = undefined;
    div = undefined;
  }
  expect(activeFrames).toBe(0);
});

describe("React renderFrame", () => {
  it("keeps layout block identity and child DOM through prop and author-root changes", async ({
    setupEditor,
  }) => {
    const mounted = await mountEditor(setupEditor, [
      {
        id: "box-0",
        type: "frameBox",
        props: { flavor: "warning" },
        children: [{ id: "box-child", type: "paragraph", content: "Child" }],
      },
    ]);
    const child = div!.querySelector('[data-id="box-child"]');
    const slot = div!.querySelector(".frame-slot");
    expect(slot?.textContent).toBe("Child");
    await act(async () => {
      mounted.updateBlock("box-0", { props: { flavor: "success" } });
    });
    expect(div!.querySelector(".frame-box")?.getAttribute("data-flavor")).toBe(
      "success",
    );
    expect(div!.querySelector(".frame-slot")).toBe(slot);
    await act(async () =>
      div!.querySelector<HTMLButtonElement>(".swap-root")!.click(),
    );
    const box = div!.querySelector("section.frame-box")!;
    expect(box).not.toBeNull();
    expect(box.getAttribute("data-id")).toBe("box-0");
    expect(box.getAttribute("data-node-type")).toBe("frameBox");
    expect(box.getAttribute("data-flavor")).toBe("success");
    expect(box.querySelector('[data-id="box-child"]')).toBe(child);
    expect(mounted.getBlock("box-child")?.content).toEqual([
      { type: "text", text: "Child", styles: {} },
    ]);
    expect(uncaught).toEqual([]);
  });

  it("never gives one React layout block's frame to another layout block", async ({
    setupEditor,
  }) => {
    // ProseMirror offers a view whose node is gone to the next node of the
    // same type. A frame shows one block, so its state must not move to
    // another block.
    const mounted = await mountEditor(setupEditor, [
      { id: "a", type: "frameBox", children: [{ type: "paragraph" }] },
      { id: "b", type: "frameBox", children: [{ type: "paragraph" }] },
    ]);
    // `a`'s frame switches its root to a <section> (its own state).
    await act(async () =>
      div!
        .querySelector('[data-id="a"]')!
        .querySelector<HTMLButtonElement>(".swap-root")!
        .click(),
    );
    expect(div!.querySelector('section[data-id="a"]')).not.toBeNull();
    await act(async () => {
      mounted.transact(() => {
        mounted.updateBlock("b", { props: { flavor: "warning" } });
        mounted.removeBlocks(["a"]);
      });
    });
    // `b` keeps its own frame: a <div>, not `a`'s <section>.
    expect(div!.querySelector('div[data-id="b"]')).not.toBeNull();
    expect(uncaught).toEqual([]);
  });

  it("finds a React layout block's own element, not React's wrappers", async ({
    setupEditor,
  }) => {
    const mounted = await mountEditor(setupEditor, [
      {
        id: "box-0",
        type: "frameBox",
        children: [{ id: "box-child", type: "paragraph", content: "Child" }],
      },
    ]);
    const { posBeforeNode } = mounted.transact(({ doc }) =>
      getNodeById("box-0", doc),
    )!;
    // Exercise the real nodeDOM result: the frame must be found even when
    // React supplies surrounding wrappers.
    const element = getBlockElementForNode(
      mounted.prosemirrorView,
      posBeforeNode,
      "box-0",
    );
    expect(element).toBe(div!.querySelector(".frame-box"));
    expect(uncaught).toEqual([]);
  });

  it("draws a React-framed block again when its type changes", async ({
    setupEditor,
  }) => {
    const mounted = await mountEditor(setupEditor, [
      {
        id: "alert-0",
        type: "frameAlert",
        content: "Heads up",
        children: [{ id: "alert-child", type: "paragraph", content: "Body" }],
      },
    ]);
    expect(div!.querySelector(".alert-frame")).not.toBeNull();
    await act(async () => {
      mounted.updateBlock("alert-0", { type: "paragraph" });
    });
    expect(div!.querySelector(".alert-frame")).toBeNull();
    expect(div!.textContent).toContain("Heads up");
    expect(div!.textContent).toContain("Body");
    expect(uncaught).toEqual([]);
  });

  it("renders plain nesting when the frame mounts no slot", async ({
    setupEditor,
  }) => {
    await mountEditor(setupEditor, [
      {
        id: "alert-0",
        type: "frameAlert",
        props: { framed: false },
        content: "Heads up",
        children: [{ id: "alert-child", type: "paragraph", content: "Body" }],
      },
    ]);

    expect(div!.querySelector(".alert-frame")).toBeNull();
    expect(div!.textContent).toContain("Heads up");
    expect(div!.textContent).toContain("Body");
    expect(uncaught).toEqual([]);
  });

  it("keeps React state, context, and child DOM through frame updates", async ({
    setupEditor,
  }) => {
    const mounted = await mountEditor(setupEditor, [
      {
        id: "alert",
        type: "frameAlert",
        content: "Title",
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      },
    ]);
    const counter = () =>
      div!.querySelector<HTMLButtonElement>(".frame-counter")!;
    expect(counter().textContent).toBe("inside: 0");
    expect(div!.querySelector(".alert-slot")?.textContent).toBe("TitleBody");
    const child = div!.querySelector('[data-id="child"]');
    const title = div!.querySelector(".alert-title");
    await act(async () => counter().click());
    expect(counter().textContent).toBe("inside: 1");
    await act(async () => {
      div!.querySelector<HTMLButtonElement>(".frame-flavor")!.click();
    });
    expect(
      div!.querySelector(".alert-frame")?.getAttribute("data-flavor"),
    ).toBe("warning");
    await act(async () => {
      root!.render(<FrameTestView editor={mounted} label="updated" />);
    });
    expect(counter().textContent).toBe("updated: 1");
    expect(div!.querySelector('[data-id="child"]')).toBe(child);
    expect(div!.querySelector(".alert-title")).toBe(title);
    expect(mounted.getBlock("child")?.content).toEqual([
      { type: "text", text: "Body", styles: {} },
    ]);
    expect(uncaught).toEqual([]);
  });

  it("switches framing off and on without losing title or child node views", async ({
    setupEditor,
  }) => {
    const mounted = await mountEditor(setupEditor, [
      {
        id: "alert",
        type: "frameAlert",
        content: "Title",
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      },
    ]);
    expect(div!.querySelector(".alert-slot")?.textContent).toBe("TitleBody");
    const child = div!.querySelector('[data-id="child"]');
    await act(async () => {
      mounted.updateBlock("alert", { props: { framed: false } });
    });
    expect(div!.querySelector(".alert-frame")).toBeNull();
    expect(div!.textContent).toContain("TitleBody");
    expect(div!.querySelector('[data-id="child"]')).toBe(child);
    await act(async () => {
      mounted.updateBlock("alert", { props: { framed: true } });
    });
    expect(div!.querySelector(".alert-slot")?.textContent).toBe("TitleBody");
    expect(div!.querySelector('[data-id="child"]')).toBe(child);
    expect(uncaught).toEqual([]);
  });

  it("unmounts the frame component when its block is removed", async ({
    setupEditor,
  }) => {
    const mounted = await mountEditor(setupEditor, [
      { id: "alert", type: "frameAlert", content: "Title" },
      { id: "after", type: "paragraph", content: "After" },
    ]);
    expect(activeFrames).toBe(1);
    await act(async () => {
      mounted.removeBlocks(["alert"]);
    });
    expect(activeFrames).toBe(0);
    expect(div!.querySelector(".alert-frame")).toBeNull();
    expect(uncaught).toEqual([]);
  });

  it("exports a titled React frame around its content and children", async ({
    setupEditor,
  }) => {
    // Without an explicit `toExternalHTML`, external HTML keeps the frame,
    // with the content and the children in its slot.
    const { editor } = await setupEditor({ mountType: false, schema });
    const html = editor.blocksToHTMLLossy([
      {
        type: "frameAlert",
        content: "Title",
        children: [{ type: "paragraph", content: "Body" }],
      },
    ]);
    const dom = document.createElement("div");
    dom.innerHTML = html;
    const slot = dom.querySelector(".alert-frame .alert-slot");
    expect(slot?.querySelector(".alert-title")?.textContent).toBe("Title");
    expect(slot?.textContent).toContain("Body");
    expect(activeFrames).toBe(0);
  });

  it("exports a declined frame as plain content and disposes its effects", async ({
    setupEditor,
  }) => {
    const { editor } = await setupEditor({ mountType: false, schema });
    const html = editor.blocksToHTMLLossy([
      {
        type: "frameAlert",
        props: { framed: false },
        content: "Title",
        children: [{ type: "paragraph", content: "Body" }],
      },
    ]);
    expect(html).not.toContain("alert-frame");
    expect(html).toContain("Title");
    expect(html).toContain("Body");
    expect(activeFrames).toBe(0);
  });

  it("keeps ordinary Shift-Tab behavior inside a frame without declared children", async ({
    setupEditor,
  }) => {
    const mounted = await mountEditor(setupEditor, [
      {
        id: "toggle",
        type: "frameToggle",
        content: "Title",
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      },
    ]);
    expect(div!.querySelector(".toggle-frame")?.textContent).toBe("TitleBody");
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      code: "Tab",
      keyCode: 9,
      shiftKey: true,
      bubbles: true,
    });
    await act(async () => {
      mounted.setTextCursorPosition("child", "start");
      mounted.domElement!.dispatchEvent(event);
    });
    expect(mounted.getParentBlock("child")).toBeUndefined();
    expect(mounted.getBlock("toggle")?.children).toHaveLength(0);
    expect(uncaught).toEqual([]);
  });
});
