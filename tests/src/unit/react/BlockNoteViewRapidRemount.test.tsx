import { BlockNoteEditor, BlockNoteSchema } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { createReactBlockSpec } from "@blocknote/react";
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, it } from "vitest";

describe("BlockNoteView Rapid Remount", () => {
  let div: HTMLDivElement;

  beforeEach(() => {
    div = document.createElement("div");
    document.body.appendChild(div);
  });

  afterEach(() => {
    document.body.removeChild(div);
  });

  it("should not crash when remounting BlockNoteView with custom blocks rapidly", async () => {
    // Define a custom block that might be sensitive to lifecycle
    const Alert = createReactBlockSpec(
      {
        type: "alert",
        propSchema: {
          type: {
            default: "warning",
          },
        },
        content: "inline",
      },
      {
        render: (props) => {
          return (
            <div className={"alert"}>
              <div className={"inline-content"} ref={props.contentRef} />
            </div>
          );
        },
      },
    );

    const schema = BlockNoteSchema.create().extend({
      blockSpecs: {
        alert: Alert(),
      },
    });

    const editor = BlockNoteEditor.create({
      schema,
      initialContent: [
        {
          type: "paragraph",
          content: "Text before",
        },
        {
          type: "alert",
          content: "Hello World 1",
        },
        {
          type: "alert",
          content: "Hello World 2",
        },
        {
          type: "paragraph",
          content: "Text after",
        },
      ],
    });

    const root = createRoot(div);

    // Simulate rapid key changes (remounts)
    for (let i = 0; i < 20; i++) {
      flushSync(() => {
        root.render(
          <StrictMode>
            <BlockNoteView editor={editor} key={i} />
          </StrictMode>,
        );
      });
      // yield to event loop to allow effects to run, triggering the race condition
      await new Promise((r) => setTimeout(r, 0));
    }
    root.unmount();
  });
});
