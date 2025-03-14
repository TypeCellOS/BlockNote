import { BlockNoteEditor } from "@blocknote/core";
import { expect, it } from "vitest";
import { updateToReplaceSteps } from "./changeset.js";

function getExampleEditorWithSuggestions() {
  const editor = BlockNoteEditor.create({
    initialContent: [
      {
        id: "1",
        type: "paragraph",
        content: "Hello, world!",
      },
      {
        id: "2",
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Hello, world! ",
            styles: {},
          },
          {
            type: "text",
            text: "Bold text. ",
            styles: {},
          },
          {
            type: "link",
            href: "https://www.google.com",
            content: "Link.",
          },
        ],
      },
    ],
  });

  return editor;
}

it("update simple paragraph", async () => {
  const editor = getExampleEditorWithSuggestions();

  const steps = updateToReplaceSteps(editor, {
    id: "1",
    type: "update",
    block: {
      type: "paragraph",
      content: "What's up, world!",
    },
  });

  expect(steps).toMatchSnapshot();
});

// TODO
it("update complex paragraph ", async () => {
  const editor = getExampleEditorWithSuggestions();

  const steps = updateToReplaceSteps(editor, {
    id: "2",
    type: "update",
    block: {
      type: "paragraph",
      content: "Hello, world! Bold text. Link.",
    },
  });

  expect(steps).toMatchSnapshot();
});
