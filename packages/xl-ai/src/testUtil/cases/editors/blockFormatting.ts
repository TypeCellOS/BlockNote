import type { SetupTestEditor } from "../index.js";
import { AIExtension } from "../../../AIExtension.js";
import { schemaWithMention as schema } from "../schemas/mention.js";

export async function getEditorWithBlockFormatting(
  setupEditor: SetupTestEditor,
) {
  const { editor } = await setupEditor({
    mountType: false,
    initialContent: [
      {
        id: "ref1",
        content: "Colored text",
        props: {
          backgroundColor: "red",
        },
      },
      {
        id: "ref2",
        content: "Aligned text",
        props: {
          textAlignment: "right",
        },
      },
    ],
    trailingBlock: false,
    schema,
    extensions: [AIExtension()],
  });
  return editor;
}
