import type { SetupTestEditor } from "../index.js";
import { AIExtension } from "../../../AIExtension.js";
import { schemaWithMention as schema } from "../schemas/mention.js";

export async function getSimpleEditor(setupEditor: SetupTestEditor) {
  const { editor } = await setupEditor({
    mountType: false,
    initialContent: [
      {
        id: "ref1",
        content: "Hello, world!",
      },
      {
        id: "ref2",
        content: "How are you?",
      },
    ],
    trailingBlock: false,
    schema,
    extensions: [AIExtension()],
  });
  return editor;
}

export async function getSimpleEditorWithCursorBetweenBlocks(
  setupEditor: SetupTestEditor,
) {
  const { editor } = await setupEditor({
    mountType: false,
    initialContent: [
      {
        id: "ref1",
        content: "Hello, world!",
      },
      {
        id: "ref2",
        content: "",
      },
      {
        id: "ref3",
        content: "How are you?",
      },
    ],
    trailingBlock: false,
    schema,
    extensions: [AIExtension()],
  });
  editor.setTextCursorPosition("ref2");
  return editor;
}

export async function getSimpleEditorSpellingError(
  setupEditor: SetupTestEditor,
) {
  const { editor } = await setupEditor({
    mountType: false,
    initialContent: [
      {
        id: "ref1",
        content: "Hello, world! Dow are you?",
      },
    ],
    trailingBlock: false,
    schema,
    extensions: [AIExtension()],
  });
  return editor;
}
