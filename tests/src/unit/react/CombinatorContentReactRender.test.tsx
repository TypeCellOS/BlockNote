import {
  BlockNoteEditor,
  BlockNoteSchema,
  c,
  combinatorContentType,
  defaultBlockSpecs,
} from "@blocknote/core";
import { BlockNoteViewRaw, createReactBlockSpec } from "@blocknote/react";
import { act } from "react";
import { flushSync } from "react-dom";
import { createRoot, Root } from "react-dom/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// End-to-end test for combinator content schemas through the React render
// pipeline:
//   - Build a custom block whose content is `record({ title, body })` of inlines
//     compiled via `combinatorContentType`.
//   - Define it via `createReactBlockSpec`, with a React render placing
//     `contentRef` on the chrome's content area.
//   - Mount it in a real BlockNoteViewRaw (jsdom + React) and verify both that
//     the React chrome is present in the DOM, and that the parent record's
//     slot children (`title`, `body`) mount inside the contentRef element.
//
// This proves the React extension wires the content type's `containerNode`
// into the React node-view path and that the user's `contentRef` becomes the
// parent record's contentDOM, with slot children mounted as siblings inside.

const alertContentType = combinatorContentType(
  "alertWithSlots",
  c.record({
    title: c.inline(),
    body: c.inline(),
  }),
);

const createAlertWithSlots = createReactBlockSpec(
  {
    type: "alertWithSlots",
    propSchema: {
      variant: { default: "warning", values: ["warning", "info"] as const },
    },
    content: alertContentType,
  },
  {
    render: (props) => (
      <div
        className="alert-with-slots"
        data-variant={props.block.props.variant}>
        <div className="alert-icon" contentEditable={false}>
          ⚠️
        </div>
        <div className="alert-slots" ref={props.contentRef} />
      </div>
    ),
  },
);

describe("combinator content + createReactBlockSpec end-to-end", () => {
  let editor: BlockNoteEditor<any, any, any>;
  let div: HTMLElement;
  let root: Root;

  beforeAll(() => {
    div = document.createElement("div");
    document.body.appendChild(div);

    editor = BlockNoteEditor.create({
      schema: BlockNoteSchema.create({
        blockSpecs: {
          ...defaultBlockSpecs,
          alertWithSlots: createAlertWithSlots(),
        },
      }),
      trailingBlock: false,
    });

    root = createRoot(div);
    flushSync(() => {
      // eslint-disable-next-line testing-library/no-render-in-setup
      root.render(<BlockNoteViewRaw editor={editor} />);
    });
  });

  afterAll(() => {
    root.unmount();
    editor._tiptapEditor.destroy();
    div.remove();
  });

  it("registers the block's container and inner Tiptap nodes", () => {
    const pmSchema = editor.pmSchema;
    expect(pmSchema.nodes.alertWithSlots).toBeDefined();
    expect(pmSchema.nodes.alertWithSlots__title).toBeDefined();
    expect(pmSchema.nodes.alertWithSlots__body).toBeDefined();

    expect(pmSchema.nodes.alertWithSlots.spec.content).toBe(
      "alertWithSlots__title alertWithSlots__body",
    );
    expect(pmSchema.nodes.alertWithSlots__title.spec.content).toBe("inline*");
    expect(pmSchema.nodes.alertWithSlots__body.spec.content).toBe("inline*");
  });

  it("renders the React chrome and mounts slot children inside contentRef", async () => {
    await act(async () => {
      editor.replaceBlocks(editor.document, [
        {
          type: "alertWithSlots" as const,
          props: { variant: "info" },
          content: {
            title: [{ type: "text", text: "Heads up", styles: { bold: true } }],
            body: [{ type: "text", text: "This is the body.", styles: {} }],
          } as any,
        } as any,
      ]);
    });

    // The user's React chrome is in the DOM…
    const chrome = div.querySelector(".alert-with-slots");
    expect(chrome).not.toBeNull();
    expect(chrome!.getAttribute("data-variant")).toBe("info");

    // …with the icon (non-editable)…
    expect(chrome!.querySelector(".alert-icon")).not.toBeNull();

    // …and the contentRef target hosts the parent record's slot children as
    // siblings, each rendered as the combinator factory's default div with a
    // `data-content-name` attribute.
    const slots = chrome!.querySelector(".alert-slots");
    expect(slots).not.toBeNull();
    const titleSlot = slots!.querySelector(
      '[data-content-name="alertWithSlots__title"]',
    );
    const bodySlot = slots!.querySelector(
      '[data-content-name="alertWithSlots__body"]',
    );
    expect(titleSlot).not.toBeNull();
    expect(bodySlot).not.toBeNull();
    expect(titleSlot!.textContent).toBe("Heads up");
    expect(bodySlot!.textContent).toBe("This is the body.");
  });

  it("round-trips JSON content through the editor", () => {
    const block = editor.document[0] as any;
    expect(block.type).toBe("alertWithSlots");
    expect(block.props.variant).toBe("info");
    expect(block.content).toMatchObject({
      title: [{ type: "text", text: "Heads up", styles: { bold: true } }],
      body: [{ type: "text", text: "This is the body.", styles: {} }],
    });
  });
});
