import { describe, expect } from "vite-plus/test";

import { AttributionExtension } from "./AttributionExtension.js";
import { DiffVersioningExtension } from "./DiffVersioningExtension.js";

describe("DiffVersioningExtension", () => {
  it("reports no authors when hovering a change", async ({ setupEditor }) => {
    const { editor } = await setupEditor({
      mountType: "dom",
      extensions: [DiffVersioningExtension()],
    });
    const { editor: baseline } = await setupEditor({
      mountType: false,
      initialContent: [{ type: "paragraph", content: "hello world" }],
    });
    const { editor: target } = await setupEditor({
      mountType: false,
      initialContent: [{ type: "paragraph", content: "hello new world" }],
    });

    editor
      .getExtension(DiffVersioningExtension)!
      .renderDiff(target.document, baseline.document);

    editor
      .domElement!.querySelector("ins[data-user-ids]")!
      .dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
    expect(
      editor.getExtension(AttributionExtension)!.store.state,
    ).toMatchObject({
      modificationType: "insert",
      users: [],
    });
  });
});
