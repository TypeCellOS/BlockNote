import { BlockNoteSchema, createBlockSpec } from "@blocknote/core";
import { userEvent } from "vite-plus/test/browser";
import { useState } from "react";
import { expect, vi } from "vite-plus/test";

import { createReactBlockSpec } from "./ReactBlockSpec.js";

function createFrameSchema<Content extends "inline" | "plain">(
  content: Content,
) {
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
            // The chrome shows the title, so it refreshes it on updates.
            return {
              dom,
              slot,
              update(updated) {
                dom.dataset.title = JSON.stringify(updated.content);
                return true;
              },
            };
          },
        },
      )(),
      framed: createReactBlockSpec(
        {
          type: "framed",
          propSchema: { framed: { default: true } },
          content,
        },
        {
          render(props) {
            // The renderer supports both editable content modes; require
            // the callback that either concrete schema provides.
            if (
              !("contentRef" in props) ||
              typeof props.contentRef !== "function"
            ) {
              throw new Error("Editable frame has no content ref");
            }
            return <div className="frame-title" ref={props.contentRef} />;
          },
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
                <div className="frame-body" ref={props.slotRef} />
              </section>
            );
          },
        },
      )(),
    },
  });
}

it.for(["inline", "plain"] as const)(
  "keeps native %s editing and selection working across frame changes",
  async (content, { setupEditor }) => {
    const options = {
      skin: "raw" as const,
      trailingBlock: false,
      initialContent: [
        {
          id: "frame",
          type: "framed" as const,
          content: "Title",
          children: [
            { id: "body", type: "paragraph" as const, content: "Body" },
          ],
        },
      ],
    };
    const { editor, rootNode: host } =
      content === "inline"
        ? await setupEditor({ ...options, schema: createFrameSchema("inline") })
        : await setupEditor({ ...options, schema: createFrameSchema("plain") });
    await vi.waitFor(() =>
      expect(host.querySelector(".frame-body")?.textContent).toBe("TitleBody"),
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
  },
);

it.for(["inline", "plain"] as const)(
  "keeps native %s typing and selection while vanilla frames refresh",
  async (content, { setupEditor }) => {
    const options = {
      trailingBlock: false,
      initialContent: [
        {
          id: "frame",
          type: "vanilla" as const,
          content: "Title",
          children: [
            { id: "body", type: "paragraph" as const, content: "Body" },
          ],
        },
      ],
    };
    const { editor } =
      content === "inline"
        ? await setupEditor({
            mountType: "dom",
            ...options,
            schema: createFrameSchema("inline"),
          })
        : await setupEditor({
            mountType: "dom",
            ...options,
            schema: createFrameSchema("plain"),
          });
    const host = editor.domElement!;
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
  },
);
