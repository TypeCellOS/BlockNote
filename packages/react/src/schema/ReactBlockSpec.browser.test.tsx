import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { expect, it } from "vite-plus/test";

import { BlockNoteViewRaw } from "../editor/BlockNoteView.js";
import { createReactBlockSpec } from "./ReactBlockSpec.js";

it("keeps inline block state when React adds or removes contentDOM siblings", async () => {
  let mounts = 0;
  const stateful = createReactBlockSpec(
    { type: "stateful", propSchema: {}, content: "inline" },
    {
      render: function StatefulBlock({ contentRef }) {
        const [count, setCount] = useState(0);
        const [showDetails, setShowDetails] = useState(false);
        useEffect(() => {
          mounts++;
        }, []);
        return (
          <div>
            <button contentEditable={false} onClick={() => setCount(count + 1)}>
              Count: {count}
            </button>
            <button
              contentEditable={false}
              onClick={() => setShowDetails(!showDetails)}
            >
              Toggle details
            </button>
            <div ref={contentRef}>
              {showDetails && <aside contentEditable={false}>Details</aside>}
            </div>
          </div>
        );
      },
    },
  )();
  const editor = BlockNoteEditor.create({
    schema: BlockNoteSchema.create().extend({ blockSpecs: { stateful } }),
    initialContent: [{ type: "stateful", content: "Editable text" }],
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() => {
      root.render(
        <BlockNoteViewRaw
          editor={editor}
          formattingToolbar={false}
          linkToolbar={false}
          sideMenu={false}
          slashMenu={false}
        />,
      );
    });
    await expect.poll(() => host.querySelectorAll("button").length).toBe(2);
    const button = host.querySelector("button")!;
    const toggle = host.querySelectorAll("button")[1];
    const content = host.querySelector("[data-node-view-content-react]");
    flushSync(() => button.click());
    const initialMounts = mounts;
    const documentBefore = editor.document;
    for (const visible of [true, false]) {
      flushSync(() => toggle.click());
      // Deliver mutations and allow ProseMirror's deferred DOM read to run.
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
      expect(host.querySelector("button")).toBe(button);
      expect(button.textContent).toBe("Count: 1");
      expect(host.querySelector("aside") !== null).toBe(visible);
      expect(host.querySelector("[data-node-view-content-react]")).toBe(
        content,
      );
      expect(mounts).toBe(initialMounts);
      expect(editor.document).toEqual(documentBefore);
    }
    content!.textContent = "Native edit";
    await expect
      .poll(() => editor.document[0])
      .toMatchObject({
        content: [{ type: "text", text: "Native edit" }],
      });
  } finally {
    root.unmount();
    editor._tiptapEditor.destroy();
    host.remove();
  }
});

it.each([false, true])(
  "keeps custom block state across wrapper attribute changes, framed=%s",
  async (framed) => {
    let mounts = 0;
    const stateful = createReactBlockSpec(
      { type: "stateful", propSchema: {}, content: "none" },
      {
        renderFrame: framed
          ? function Frame({ slotRef }) {
              return (
                <section className="stateful-frame">
                  <div ref={slotRef} />
                </section>
              );
            }
          : undefined,
        render: function StatefulBlock() {
          const [count, setCount] = useState(0);
          useEffect(() => {
            mounts++;
          }, []);
          return (
            <button onClick={() => setCount((value) => value + 1)}>
              Count: {count}
            </button>
          );
        },
      },
    )();
    const schema = BlockNoteSchema.create().extend({
      blockSpecs: { stateful },
    });
    const editor = BlockNoteEditor.create({
      schema,
      initialContent: [
        { type: "paragraph", content: "Before" },
        { type: "stateful", children: [{ type: "stateful" }] },
        { type: "paragraph", content: "After" },
      ],
    });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    try {
      flushSync(() => {
        root.render(
          <BlockNoteViewRaw
            editor={editor}
            formattingToolbar={false}
            linkToolbar={false}
            sideMenu={false}
            slashMenu={false}
          />,
        );
      });
      await expect.poll(() => host.querySelectorAll("button").length).toBe(2);
      expect(host.querySelectorAll(".stateful-frame").length).toBe(
        framed ? 2 : 0,
      );
      const button = host.querySelector("button")!;
      flushSync(() => button.click());
      expect(button.textContent).toBe("Count: 1");
      const initialMounts = mounts;
      const documentBefore = editor.document;

      // UI libraries and application chrome can change any wrapper attribute.
      // The boundary is the wrapper element, not a list of known attributes.
      for (const [attribute, value] of [
        ["aria-hidden", "true"],
        ["aria-label", "Editor block"],
        ["inert", ""],
        ["data-ui-state", "active"],
        ["class", "ui-active"],
        ["style", "font-weight: bold"],
      ]) {
        for (const selector of [
          ".bn-block",
          ".bn-block-outer",
          ".bn-block-group",
        ]) {
          const containers = Array.from(host.querySelectorAll(selector));
          const originals = containers.map((element) =>
            element.getAttribute(attribute),
          );
          for (const changed of [true, false]) {
            for (const [index, container] of containers.entries()) {
              const original = originals[index];
              if (changed) {
                container.setAttribute(
                  attribute,
                  attribute === "class" ? `${original ?? ""} ${value}` : value,
                );
              } else if (original === null) {
                container.removeAttribute(attribute);
              } else {
                container.setAttribute(attribute, original);
              }
            }
            // Allow MutationObserver delivery and ProseMirror's deferred DOM read.
            await new Promise<void>((resolve) => setTimeout(resolve, 100));
            expect(host.querySelector("button")).toBe(button);
            expect(button.textContent).toBe("Count: 1");
            expect(mounts).toBe(initialMounts);
            expect(editor.document).toEqual(documentBefore);
          }
        }
      }

      editor.insertBlocks(
        [{ type: "paragraph", content: "Inserted" }],
        editor.document[0],
        "after",
      );
      await expect.poll(() => host.textContent).toContain("Inserted");
      expect(host.querySelector("button")).toBe(button);
      expect(button.textContent).toBe("Count: 1");

      // Native content edits must still reach the document through DOM parsing.
      host.querySelector(".bn-inline-content")!.textContent = "Native edit";
      await expect
        .poll(() => editor.document[0])
        .toMatchObject({
          content: [{ type: "text", text: "Native edit" }],
        });
      host.querySelector(".bn-inline-content")!.firstChild!.nodeValue =
        "Typed edit";
      await expect
        .poll(() => editor.document[0])
        .toMatchObject({
          content: [{ type: "text", text: "Typed edit" }],
        });
    } finally {
      root.unmount();
      editor._tiptapEditor.destroy();
      host.remove();
    }
  },
);
