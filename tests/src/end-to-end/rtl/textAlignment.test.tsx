import "@blocknote/core/fonts/inter.css";
import { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { TableHandlesExtension } from "@blocknote/core/extensions";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbar,
  TextAlignButton,
  useCreateBlockNote,
} from "@blocknote/react";
import { afterEach, expect, test } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";
import { useEffect } from "react";
import { page, userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";

let editor: BlockNoteEditor;
function Editor({
  content,
  dir = "rtl",
}: {
  content: PartialBlock[];
  dir?: "ltr" | "rtl";
}) {
  const instance = useCreateBlockNote({ initialContent: content });
  useEffect(() => {
    editor = instance;
  }, [instance]);
  return (
    <BlockNoteView editor={instance} dir={dir} formattingToolbar={false}>
      <FormattingToolbar>
        {(["left", "center", "right"] as const).map((alignment) => (
          <TextAlignButton key={alignment} textAlignment={alignment} />
        ))}
      </FormattingToolbar>
    </BlockNoteView>
  );
}
function button(alignment: "left" | "right", dir: "ltr" | "rtl" = "rtl") {
  const side =
    dir === "rtl" ? (alignment === "left" ? "right" : "left") : alignment;
  return page.getByRole("button", {
    name: `Align text ${side}`,
    exact: true,
  });
}
afterEach(cleanup);

test.each(["ltr", "rtl"] as const)(
  "%s left/right align to logical start/end",
  async (dir) => {
    await render(
      <Editor
        dir={dir}
        content={[
          { id: "text", type: "paragraph", content: "שלום — مرحباً (123)" },
        ]}
      />,
    );
    const inline = await waitForSelector(".bn-inline-content");
    await userEvent.click(inline);
    await expect
      .element(button("left", dir))
      .toHaveAttribute("aria-pressed", "true");
    const range = document.createRange();
    range.selectNodeContents(inline);
    const naturalX = range.getBoundingClientRect().left;
    await button("right", dir).click();
    await expect
      .poll(() => editor.getTextCursorPosition().block.props)
      .toMatchObject({ textAlignment: "right" });
    range.selectNodeContents(await waitForSelector(".bn-inline-content"));
    const delta = range.getBoundingClientRect().left - naturalX;
    expect(dir === "rtl" ? -delta : delta).toBeGreaterThan(100);
    await button("left", dir).click();
    range.selectNodeContents(await waitForSelector(".bn-inline-content"));
    expect(
      Math.abs(range.getBoundingClientRect().left - naturalX),
    ).toBeLessThan(1);
  },
);

test("alignment follows the selected table cell and keeps the caret there", async () => {
  await render(
    <Editor
      content={[
        {
          id: "table",
          type: "table",
          content: {
            type: "tableContent",
            rows: [
              {
                cells: [
                  { type: "tableCell", content: "First" },
                  {
                    type: "tableCell",
                    content: "שלום",
                    props: { textAlignment: "right" },
                  },
                ],
              },
            ],
          },
        },
      ]}
    />,
  );
  await waitForSelector("td p");
  const cells = document.querySelectorAll("td p");
  await userEvent.click(cells[1]);
  await expect.element(button("right")).toHaveAttribute("aria-pressed", "true");
  await button("left").click();
  await expect.element(button("left")).toHaveAttribute("aria-pressed", "true");
  await userEvent.keyboard("X");
  expect(cells[0].textContent).toBe("First");
  expect(document.querySelectorAll("td p")[1].textContent).toContain("X");

  const tables = editor.getExtension(TableHandlesExtension)!;
  await button("right").click();
  editor.exec((state, dispatch) => {
    const selected = tables.setCellSelection(
      state,
      { row: 0, col: 0 },
      { row: 0, col: 1 },
    );
    dispatch?.(selected.tr);
    return true;
  });
  await expect.element(button("left")).toHaveAttribute("aria-pressed", "false");
  await expect
    .element(button("right"))
    .toHaveAttribute("aria-pressed", "false");
  await button("left").click();
  await expect.element(button("left")).toHaveAttribute("aria-pressed", "true");
  expect(tables.getCellSelection()?.cells).toHaveLength(2);
});
