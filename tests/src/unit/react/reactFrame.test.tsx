import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import {
  BlockNoteViewRaw,
  createReactBlockSpec,
  type ReactCustomBlockFrameProps,
} from "@blocknote/react";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";

// Pure containers continue to draw their outer box through render.
const createFrameBox = createReactBlockSpec(
  {
    type: "frameBox",
    propSchema: { flavor: { default: "tip" } },
    content: "none",
    children: { allow: "blocks" },
  },
  {
    render: function Container(props) {
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
          <div className="frame-slot" ref={props.contentRef} />
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
  children: { allow: "blocks" },
} as const;

function FrameChrome(props: { children: ReactNode; flavor: string }) {
  return (
    <div className="alert-frame" data-flavor={props.flavor}>
      {props.children}
    </div>
  );
}

function AlertFrame(props: ReactCustomBlockFrameProps<typeof alertConfig>) {
  const label = useContext(FrameContext);
  const [clicks, setClicks] = useState(0);
  useEffect(() => {
    activeFrames++;
    return () => {
      activeFrames--;
    };
  }, []);
  if (!props.block.props.framed) {
    return null;
  }
  return (
    <FrameChrome flavor={props.block.props.flavor}>
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
          props.editor.updateBlock(props.block, {
            props: { flavor: "warning" },
          })
        }
      >
        Change flavor
      </button>
      <div className="alert-slot" ref={props.contentRef} />
    </FrameChrome>
  );
}

const createFrameAlert = createReactBlockSpec(alertConfig, {
  render: (props) => <div className="alert-title" ref={props.contentRef} />,
  renderFrame: AlertFrame,
});

// Framing alone must not turn ordinary nesting into an owned body.
const createToggle = createReactBlockSpec(
  { type: "frameToggle", propSchema: {}, content: "inline" },
  {
    render: (props) => <div ref={props.contentRef} />,
    renderFrame: (props) => (
      <div className="toggle-frame" ref={props.contentRef} />
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
let editor: BlockNoteEditor<any, any, any> | undefined;
/** Render-phase errors. React 19 reports rather than rethrows these. */
let uncaught: unknown[] = [];

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function mountEditor(initialContent: any[]) {
  div = document.createElement("div");
  document.body.appendChild(div);

  editor = BlockNoteEditor.create({
    schema,
    trailingBlock: false,
    initialContent,
  }) as BlockNoteEditor<any, any, any>;

  uncaught = [];
  root = createRoot(div, {
    onUncaughtError: (error) => uncaught.push(error),
    onCaughtError: (error) => uncaught.push(error),
  });
  // Mount during a React commit as applications do. Frame construction must
  // not depend on a nested synchronous React render succeeding.
  flushSync(() => {
    root!.render(
      <FrameContext.Provider value="inside">
        <BlockNoteViewRaw editor={editor!} />
      </FrameContext.Provider>,
    );
  });

  return editor;
}

afterEach(() => {
  root?.unmount();
  root = undefined;
  if (div) {
    document.body.removeChild(div);
    div = undefined;
  }
  editor?._tiptapEditor.destroy();
  editor = undefined;
});

describe("React renderFrame", () => {
  it("keeps container identity and child DOM through prop and author-root changes", async () => {
    const mounted = mountEditor([
      {
        id: "box-0",
        type: "frameBox",
        props: { flavor: "warning" },
        children: [{ id: "box-child", type: "paragraph", content: "Child" }],
      },
    ]);
    await tick();
    const child = div!.querySelector('[data-id="box-child"]');
    const slot = div!.querySelector(".frame-slot");
    expect(slot?.textContent).toBe("Child");
    mounted.updateBlock("box-0", { props: { flavor: "success" } });
    await vi.waitFor(() =>
      expect(
        div!.querySelector(".frame-box")?.getAttribute("data-flavor"),
      ).toBe("success"),
    );
    expect(div!.querySelector(".frame-slot")).toBe(slot);
    flushSync(() =>
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

  it("renders plain nesting when the frame mounts no slot", async () => {
    mountEditor([
      {
        id: "alert-0",
        type: "frameAlert",
        props: { framed: false },
        content: "Heads up",
        children: [{ id: "alert-child", type: "paragraph", content: "Body" }],
      },
    ]);
    await tick();

    expect(div!.querySelector(".alert-frame")).toBeNull();
    expect(div!.textContent).toContain("Heads up");
    expect(div!.textContent).toContain("Body");
    expect(uncaught).toEqual([]);
  });

  it("keeps React state, context, and child DOM through frame updates", async () => {
    const mounted = mountEditor([
      {
        id: "alert",
        type: "frameAlert",
        content: "Title",
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      },
    ]);
    await vi.waitFor(() =>
      expect(div!.querySelector(".frame-counter")?.textContent).toBe(
        "inside: 0",
      ),
    );
    expect(div!.querySelector(".alert-slot")?.textContent).toBe("TitleBody");
    const child = div!.querySelector('[data-id="child"]');
    const title = div!.querySelector(".alert-title");
    div!.querySelector<HTMLButtonElement>(".frame-counter")!.click();
    await vi.waitFor(() =>
      expect(div!.querySelector(".frame-counter")?.textContent).toBe(
        "inside: 1",
      ),
    );
    div!.querySelector<HTMLButtonElement>(".frame-flavor")!.click();
    await vi.waitFor(() =>
      expect(
        div!.querySelector(".alert-frame")?.getAttribute("data-flavor"),
      ).toBe("warning"),
    );
    root!.render(
      <FrameContext.Provider value="updated">
        <BlockNoteViewRaw editor={mounted} />
      </FrameContext.Provider>,
    );
    await vi.waitFor(() =>
      expect(div!.querySelector(".frame-counter")?.textContent).toBe(
        "updated: 1",
      ),
    );
    expect(div!.querySelector('[data-id="child"]')).toBe(child);
    expect(div!.querySelector(".alert-title")).toBe(title);
    expect(mounted.getBlock("child")?.content).toEqual([
      { type: "text", text: "Body", styles: {} },
    ]);
    expect(uncaught).toEqual([]);
  });

  it("switches framing off and on without losing title or child node views", async () => {
    const mounted = mountEditor([
      {
        id: "alert",
        type: "frameAlert",
        content: "Title",
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      },
    ]);
    await vi.waitFor(() =>
      expect(div!.querySelector(".alert-slot")?.textContent).toBe("TitleBody"),
    );
    const child = div!.querySelector('[data-id="child"]');
    mounted.updateBlock("alert", { props: { framed: false } });
    await vi.waitFor(() =>
      expect(div!.querySelector(".alert-frame")).toBeNull(),
    );
    expect(div!.textContent).toContain("TitleBody");
    expect(div!.querySelector('[data-id="child"]')).toBe(child);
    mounted.updateBlock("alert", { props: { framed: true } });
    await vi.waitFor(() =>
      expect(div!.querySelector(".alert-slot")?.textContent).toBe("TitleBody"),
    );
    expect(div!.querySelector('[data-id="child"]')).toBe(child);
    expect(uncaught).toEqual([]);
  });

  it("unmounts the frame component when its block is removed", async () => {
    const mounted = mountEditor([
      { id: "alert", type: "frameAlert", content: "Title" },
      { id: "after", type: "paragraph", content: "After" },
    ]);
    await vi.waitFor(() => expect(activeFrames).toBe(1));
    mounted.removeBlocks(["alert"]);
    await vi.waitFor(() => expect(activeFrames).toBe(0));
    expect(div!.querySelector(".alert-frame")).toBeNull();
    expect(uncaught).toEqual([]);
  });

  it("exports a titled React frame with its content and children in the slot", () => {
    const headless = BlockNoteEditor.create({ schema });
    try {
      const html = headless.blocksToHTMLLossy([
        {
          type: "frameAlert",
          content: "Title",
          children: [{ type: "paragraph", content: "Body" }],
        },
      ]);
      const output = document.createElement("div");
      output.innerHTML = html;
      expect(output.querySelector(".alert-slot")?.textContent).toBe(
        "TitleBody",
      );
      expect(output.querySelector(".frame-counter")?.textContent).toBe(
        "outside: 0",
      );
    } finally {
      headless._tiptapEditor.destroy();
    }
  });

  it("exports a declined frame as plain content and disposes its effects", () => {
    const headless = BlockNoteEditor.create({ schema });
    try {
      const html = headless.blocksToHTMLLossy([
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
    } finally {
      headless._tiptapEditor.destroy();
    }
  });

  it("keeps ordinary Shift-Tab behavior inside a frame without declared children", async () => {
    const mounted = mountEditor([
      {
        id: "toggle",
        type: "frameToggle",
        content: "Title",
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      },
    ]);
    await vi.waitFor(() =>
      expect(div!.querySelector(".toggle-frame")?.textContent).toBe(
        "TitleBody",
      ),
    );
    mounted.setTextCursorPosition("child", "start");
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      code: "Tab",
      keyCode: 9,
      shiftKey: true,
      bubbles: true,
    });
    mounted._tiptapEditor.view.dom.dispatchEvent(event);
    expect(mounted.getParentBlock("child")).toBeUndefined();
    expect(mounted.getBlock("toggle")?.children).toHaveLength(0);
    expect(uncaught).toEqual([]);
  });
});
