import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createReactBlockSpec } from "./ReactBlockSpec.js";

// Same shape as the example callout block (`examples/06-custom-schema/08-container-block`).
// This test exists to confirm the document-level transformation succeeds — it
// does NOT mount BlockNoteView, so React rendering of the nodeView itself is
// not exercised here.
const Callout = createReactBlockSpec(
  {
    type: "callout" as const,
    propSchema: {},
    content: "none" as const,
    container: { min: 1, defaultBlocks: ["paragraph"] },
  },
  {
    render: ({ contentRef }) => (
      <div className="callout">
        <div className="callout-body" ref={contentRef} />
      </div>
    ),
  },
)();

const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: Callout,
  } as const,
});

describe("React updateBlock → container with defaultBlocks (document-level)", () => {
  let editor: BlockNoteEditor<
    typeof schema.blockSchema,
    typeof schema.inlineContentSchema,
    typeof schema.styleSchema
  >;
  const div = document.createElement("div");

  beforeAll(() => {
    document.body.appendChild(div);
    editor = BlockNoteEditor.create({ schema });
    editor.mount(div);
  });

  afterAll(() => {
    editor._tiptapEditor.destroy();
    div.remove();
    editor = undefined as any;
  });

  beforeEach(() => {
    editor.replaceBlocks(editor.document, [
      { id: "p-0", type: "paragraph", content: "" },
      { id: "trailing", type: "paragraph", content: "" },
    ]);
  });

  it(
    "converts an empty paragraph to a callout via editor.updateBlock",
    () => {
      editor.updateBlock("p-0", { type: "callout" });
      expect(editor.document).toMatchSnapshot();
    },
    5000,
  );
});
