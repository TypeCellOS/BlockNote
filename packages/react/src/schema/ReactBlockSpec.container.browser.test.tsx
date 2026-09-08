import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { useState } from "react";
import { userEvent } from "vite-plus/test/browser";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vite-plus/test";

import { BlockPopover } from "../components/Popovers/BlockPopover.js";
import { BlockNoteViewRaw } from "../editor/BlockNoteView.js";
import { createReactBlockSpec } from "./ReactBlockSpec.js";

/**
 * Tests for React container blocks in a real browser.
 *
 * Everything here needs a real DOM: the external-HTML path renders the block
 * through a temporary `createRoot` (see `@util/ReactRenderUtil`), and a React
 * node view only runs once `contentComponent` is set, which happens when
 * `BlockNoteViewRaw` mounts the editor. Document-model behaviour of
 * containers in general is covered by the core suites in
 * `api/blockManipulation/containers/`.
 */

// A container: its `contentRef` element holds its child blocks.
const createCallout = createReactBlockSpec(
  {
    type: "callout",
    propSchema: { flavor: { default: "tip" } },
    content: "none",
    children: { allow: "blocks" },
  },
  {
    render: function Callout(props) {
      const [alternate, setAlternate] = useState(false);
      const Tag = alternate ? "section" : "div";
      return (
        <Tag className="callout">
          <button
            contentEditable={false}
            onClick={() => setAlternate(!alternate)}
          >
            Swap root
          </button>
          <div className="callout-body" ref={props.contentRef} />
        </Tag>
      );
    },
  },
);

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    callout: createCallout(),
  },
});

describe("React container block external HTML", () => {
  it("serializes the author's own root element, unwrapped", () => {
    const editor = BlockNoteEditor.create({ schema });

    const html = editor.blocksToHTMLLossy([
      {
        type: "callout",
        id: "c-0",
        children: [{ id: "c-p-0", type: "paragraph", content: "Hello" }],
      },
    ] as any);

    // Container blocks own their outer DOM entirely. Regression test for the
    // React `toExternalHTML` path wrapping them in a spurious
    // `bn-block-content` div (core's `createBlockSpec` passes them through).
    // The root is the element `render` returned, with no React wrapper in
    // between, so `.callout[data-*]` CSS matches it here exactly as in the
    // live editor.
    expect(html).not.toContain('data-content-type="callout"');
    expect(html).not.toContain("data-node-view-wrapper");
    expect(html).toContain('class="callout"');
    expect(html).toContain('data-node-type="callout"');
    expect(html).toContain("Hello");

    editor._tiptapEditor.destroy();
  });
});

let root: Root | undefined;
let div: HTMLDivElement | undefined;
let editor: BlockNoteEditor<any, any, any> | undefined;

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

/** Lets TipTap's deferred node-view render and React's commit run. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function mountEditor(initialContent: any[]) {
  div = document.createElement("div");
  document.body.appendChild(div);

  editor = BlockNoteEditor.create({
    schema,
    trailingBlock: false,
    initialContent,
  }) as BlockNoteEditor<any, any, any>;

  root = createRoot(div);
  flushSync(() => {
    root!.render(<BlockNoteViewRaw editor={editor as any} />);
  });
  // TipTap only renders a node view synchronously when this is set; BlockNote
  // mounts the editor itself and never does, so the first batch of node views
  // takes the deferred path (see `tests/src/unit/react/staleNodeViewPos.test.tsx`).
  (editor as any)._tiptapEditor.isEditorContentInitialized = true;
  await tick();

  return { editor: editor!, div: div! };
}

describe("React container block node view", () => {
  it("anchors a container popover to the author's box", async () => {
    const { editor, div } = await mountEditor([
      {
        id: "outer",
        type: "callout",
        children: [{ id: "inner", type: "callout" }],
      },
    ]);
    const box = div.querySelector<HTMLElement>(".callout")!;
    let anchor: Element | undefined;
    flushSync(() => {
      root!.render(
        <BlockNoteViewRaw editor={editor}>
          <BlockPopover
            blockId="outer"
            focusManagerProps={{ disabled: true }}
            useFloatingOptions={{
              open: true,
              whileElementsMounted(reference) {
                anchor =
                  reference instanceof Element
                    ? reference
                    : reference.contextElement;
                return () => {};
              },
            }}
          >
            Container menu
          </BlockPopover>
        </BlockNoteViewRaw>,
      );
    });
    await expect.poll(() => anchor).toBe(box);
    expect(box.getBoundingClientRect().height).toBeGreaterThan(0);
  });

  it("keeps attributes and native editing after a local state root swap", async () => {
    const { editor, div } = await mountEditor([
      {
        id: "c-0",
        type: "callout",
        props: { flavor: "warning" },
        children: [{ id: "child", type: "paragraph", content: "Body" }],
      },
    ]);
    const child = div.querySelector('[data-id="child"]');
    await userEvent.click(div.querySelector(".callout button")!);
    const box = div.querySelector("section.callout")!;
    expect(box.getAttribute("data-id")).toBe("c-0");
    expect(box.getAttribute("data-node-type")).toBe("callout");
    expect(box.getAttribute("data-flavor")).toBe("warning");
    expect(box.querySelector('[data-id="child"]')).toBe(child);
    editor.focus();
    editor.setTextCursorPosition("child", "end");
    await userEvent.keyboard("!");
    expect(child?.textContent).toBe("Body!");
    expect(editor.getTextCursorPosition().block.id).toBe("child");
  });

  it("stamps only non-default props onto the block's own root, and keeps them in sync", async () => {
    const mounted = await mountEditor([
      { id: "c-0", type: "callout", children: [{ type: "paragraph" }] },
    ]);

    const calloutRoot = mounted.div.querySelector<HTMLElement>(".callout")!;
    // The author's element, not `div.react-renderer` or the node view
    // wrapper: exactly the class the author wrote, and nothing else.
    expect(calloutRoot.className).toBe("callout");
    expect(calloutRoot.getAttribute("data-id")).toBe("c-0");
    // `flavor` is at its default, so no attribute is written for it.
    expect(calloutRoot.hasAttribute("data-flavor")).toBe(false);

    mounted.editor.updateBlock("c-0", { props: { flavor: "warning" } } as any);
    await tick();

    // Re-queried: a prop change must land on whatever element is now the
    // block's root, so `.callout[data-flavor="warning"]` selects in the live
    // editor exactly as it does in the serialized HTML above.
    expect(
      mounted.div
        .querySelector<HTMLElement>(".callout")!
        .getAttribute("data-flavor"),
    ).toBe("warning");
  });

  it("mounts a pure container's children inside its `contentRef` element", async () => {
    const mounted = await mountEditor([
      {
        id: "c-0",
        type: "callout",
        children: [{ id: "c-child", type: "paragraph", content: "Child" }],
      },
    ]);

    const body = mounted.div.querySelector<HTMLElement>(".callout-body")!;
    // A container with no content of its own puts its children where the
    // author placed `contentRef`, not somewhere else in the node view. The
    // child's own block element is a descendant, so this checks structure,
    // not just text that happened to bubble up.
    expect(body.querySelector('[data-id="c-child"]')).not.toBeNull();
    expect(body.textContent).toBe("Child");
  });
});
