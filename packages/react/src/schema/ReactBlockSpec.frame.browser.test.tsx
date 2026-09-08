import {
  BlockNoteEditor,
  BlockNoteSchema,
  createBlockSpec,
} from "@blocknote/core";
import { userEvent } from "vite-plus/test/browser";
import { useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vite-plus/test";

import { BlockNoteViewRaw } from "../editor/BlockNoteView.js";
import { createReactBlockSpec } from "./ReactBlockSpec.js";

function createFrameSchema(content: "inline" | "plain") {
  return BlockNoteSchema.create().extend({
    blockSpecs: {
      vanilla: createBlockSpec(
        { type: "vanilla", propSchema: {}, content },
        {
          render() {
            const dom = document.createElement("div");
            return { dom, contentDOM: dom };
          },
          renderFrame(block) {
            const dom = document.createElement("section");
            dom.className = "vanilla-frame";
            dom.dataset.title = JSON.stringify(block.content);
            const slot = document.createElement("div");
            dom.append(slot);
            return { dom, slot };
          },
        },
      )(),
      framed: createReactBlockSpec(
        {
          type: "framed",
          propSchema: { framed: { default: true } },
          content,
          children: { allow: "blocks" },
        },
        {
          render: (props) => (
            <div className="frame-title" ref={props.contentRef} />
          ),
          renderFrame: function Frame(props) {
            const [clicks, setClicks] = useState(0);
            if (!props.block.props.framed) {
              return null;
            }
            return (
              <section className="frame">
                <button
                  contentEditable={false}
                  onClick={() => setClicks(clicks + 1)}
                >
                  {clicks}
                </button>
                <div className="frame-body" ref={props.contentRef} />
              </section>
            );
          },
        },
      )(),
    },
  });
}

it.each(["inline", "plain"] as const)(
  "keeps native %s editing and selection working across frame changes",
  async (content) => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const editor = BlockNoteEditor.create({
      schema: createFrameSchema(content),
      trailingBlock: false,
      initialContent: [
        {
          id: "frame",
          type: "framed",
          content: "Title",
          children: [{ id: "body", type: "paragraph", content: "Body" }],
        },
      ],
    });
    try {
      flushSync(() => root.render(<BlockNoteViewRaw editor={editor} />));
      await vi.waitFor(() =>
        expect(host.querySelector(".frame-body")?.textContent).toBe(
          "TitleBody",
        ),
      );
      const child = host.querySelector('[data-id="body"]');

      editor.focus();
      editor.setTextCursorPosition("frame", "end");
      await userEvent.keyboard("!");
      await vi.waitFor(() =>
        expect(host.querySelector(".frame-title")?.textContent).toBe("Title!"),
      );
      await userEvent.click(host.querySelector("button")!);
      await vi.waitFor(() =>
        expect(host.querySelector("button")?.textContent).toBe("1"),
      );

      editor.focus();
      editor.setTextCursorPosition("body", "end");
      editor.updateBlock("frame", { props: { framed: false } });
      await vi.waitFor(() => expect(host.querySelector(".frame")).toBeNull());
      await userEvent.keyboard("?");
      await vi.waitFor(() => expect(child?.textContent).toBe("Body?"));

      editor.updateBlock("frame", { props: { framed: true } });
      await vi.waitFor(() =>
        expect(host.querySelector(".frame-body")?.textContent).toBe(
          "Title!Body?",
        ),
      );
      await userEvent.keyboard("!");
      await vi.waitFor(() => expect(child?.textContent).toBe("Body?!"));
      expect(host.querySelector('[data-id="body"]')).toBe(child);
      expect(editor.getTextCursorPosition().block.id).toBe("body");
    } finally {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);

it.each(["inline", "plain"] as const)(
  "keeps native %s typing and selection while vanilla frames refresh",
  async (content) => {
    const host = document.createElement("div");
    document.body.append(host);
    const editor = BlockNoteEditor.create({
      schema: createFrameSchema(content),
      trailingBlock: false,
      initialContent: [
        {
          id: "frame",
          type: "vanilla",
          content: "Title",
          children: [{ id: "body", type: "paragraph", content: "Body" }],
        },
      ],
    });
    try {
      editor.mount(host);
      editor.focus();
      editor.setTextCursorPosition("frame", "end");
      await userEvent.keyboard("abc");
      await vi.waitFor(() =>
        expect(
          host.querySelector(".vanilla-frame")?.getAttribute("data-title"),
        ).toContain("Titleabc"),
      );
      expect(editor.getTextCursorPosition().block.id).toBe("frame");
      editor.setTextCursorPosition("body", "end");
      await userEvent.keyboard("xyz");
      await vi.waitFor(() =>
        expect(host.querySelector('[data-id="body"]')?.textContent).toBe(
          "Bodyxyz",
        ),
      );
      expect(editor.getTextCursorPosition().block.id).toBe("body");
    } finally {
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);
