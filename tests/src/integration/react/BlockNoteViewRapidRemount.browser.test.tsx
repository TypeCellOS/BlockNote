import { BlockNoteSchema } from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { createReactBlockSpec } from "@blocknote/react";
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { describe, expect } from "vite-plus/test";

import { createRemountRoot } from "./createRemountRoot.js";

describe("BlockNoteView Rapid Remount", () => {
  it("should not crash when remounting BlockNoteView with custom blocks rapidly", async ({
    setupEditor,
    onTestFinished,
  }) => {
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

    const { editor } = await setupEditor({
      mountType: false,
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

    const root = createRemountRoot(onTestFinished);

    // Simulate rapid key changes (remounts)
    let previousAlert: Element | undefined;
    for (let i = 0; i < 5; i++) {
      flushSync(() => {
        root.render(
          <StrictMode>
            <BlockNoteView
              editor={editor}
              key={i}
              formattingToolbar={false}
              linkToolbar={false}
              slashMenu={false}
              sideMenu={false}
              filePanel={false}
              tableHandles={false}
              emojiPicker={false}
            />
          </StrictMode>,
        );
      });
      await expect
        .poll(() => {
          const alert = editor.domElement?.querySelector(".alert");
          return !!alert && alert !== previousAlert;
        })
        .toBe(true);
      previousAlert = editor.domElement!.querySelector(".alert")!;
    }
    root.unmount();
  });
});
