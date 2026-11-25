import type { SetupTestEditor } from "../index.js";
import { AIExtension } from "../../../AIExtension.js";

export async function getEmptyEditor(setupEditor: SetupTestEditor) {
  const { editor } = await setupEditor({
    mountType: false,
    initialContent: [
      {
        id: "ref1",
        content: "",
      },
    ],
    trailingBlock: false,
    extensions: [AIExtension()],
  });
  return editor;
}
