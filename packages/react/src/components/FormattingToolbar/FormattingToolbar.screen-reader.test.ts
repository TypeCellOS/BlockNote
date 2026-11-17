import { selectToLineEndKey } from "@root/tests/src/utils/context.js";
import { expect } from "vite-plus/test";

// Record selection → toolbar → Escape → editor.
// Individual toolbar item actions and focus rings are covered by the browser tests.
// Screen reader announcements do not clearly communicate entering the toolbar.
it.skip("announces entering and leaving the formatting toolbar", async ({
  setupEditor,
  setupScreenReader,
  page,
}) => {
  const { editor } = await setupEditor({
    initialContent: [
      { id: "text", type: "paragraph", content: "Selected text" },
    ],
  });
  editor.setTextCursorPosition("text", "start");
  const { getTranscript, pressKey } = await setupScreenReader(
    page.getByRole("textbox"),
  );
  await pressKey(selectToLineEndKey);
  await pressKey("Tab");
  const toolbar = page.getByRole("toolbar");
  await expect
    .element(
      toolbar.getByRole("button", {
        name: editor.dictionary.slash_menu.paragraph.title,
        exact: true,
      }),
    )
    .toHaveFocus();
  await pressKey("Escape");
  await expect.element(toolbar).not.toBeInTheDocument();
  await expect.element(page.getByRole("textbox")).toHaveFocus();
  const transcript = await getTranscript();
  expect(transcript.length).toBeGreaterThan(0);
  expect(transcript).toMatchSnapshot();
});
