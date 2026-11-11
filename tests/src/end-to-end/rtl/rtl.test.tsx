import { type PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { afterEach, expect, test } from "vite-plus/test";
import { cleanup, render } from "vitest-browser-react";

import { page, userEvent } from "../../utils/context.js";
import { waitForSelector } from "../../utils/editor.js";
import {
  waitForEmojiPickerLayout,
  waitForSelectedEmoji,
} from "../../utils/emojipicker.js";
import { mouseSequence, moveMouseOverElement } from "../../utils/mouse.js";

const content: PartialBlock[] = [
  {
    id: "intro",
    type: "paragraph",
    content: "עברית, العربية ו-English (123).",
  },
  {
    id: "right",
    type: "image",
    props: {
      textAlignment: "right",
      previewWidth: 80,
      url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='40'%3E%3Crect width='80' height='40' fill='%2386b4ef'/%3E%3C/svg%3E",
    },
  },
  { id: "empty", type: "paragraph" },
];

function Editor({
  dir,
  initialContent = content,
}: {
  dir: "rtl" | "ltr";
  initialContent?: PartialBlock[];
}) {
  const editor = useCreateBlockNote({ initialContent });
  return (
    <div data-testid="sample" style={{ width: 760, margin: "40px auto" }}>
      <BlockNoteView editor={editor} dir={dir} />
    </div>
  );
}

function block(id: string) {
  const element = document.querySelector<HTMLElement>(
    `.bn-block[data-id="${id}"] > .bn-block-content`,
  );
  if (!element) {
    throw new Error(`Missing block ${id}`);
  }
  return element;
}

afterEach(async () => {
  await mouseSequence([{ type: "move", x: 1, y: 1 }]);
  await cleanup();
});

test.each(["rtl", "ltr"] as const)(
  "%s editor layout and side menu",
  async (dir) => {
    await render(<Editor dir={dir} />);
    await waitForSelector(".bn-editor");
    const rightBlock = block("right");
    const image = rightBlock.querySelector("img")!;
    expect
      .soft(
        Math.abs(
          rightBlock.getBoundingClientRect().right -
            image.getBoundingClientRect().right,
        ),
      )
      .toBeLessThan(1);

    const intro = block("intro").getBoundingClientRect();
    await mouseSequence([
      {
        type: "move",
        x: intro.x + intro.width / 2,
        y: intro.y + intro.height / 2,
      },
    ]);
    await expect
      .poll(() => {
        const menu = document
          .querySelector(".bn-side-menu")
          ?.getBoundingClientRect();
        return menu
          ? dir === "rtl"
            ? menu.left >= intro.right - 1
            : menu.right <= intro.left + 1
          : false;
      })
      .toBe(true);
  },
);

test("RTL emoji navigation follows the visible grid without moving the caret", async () => {
  await render(<Editor dir="rtl" />);
  await userEvent.click(block("empty"));
  await userEvent.keyboard(":sm");
  await waitForEmojiPickerLayout();
  const first = await waitForSelectedEmoji();
  const firstX = first.getBoundingClientRect().x;
  const selection = window.getSelection()!;
  const anchorNode = selection.anchorNode;
  const anchorOffset = selection.anchorOffset;
  await userEvent.keyboard("{ArrowLeft}");
  await expect
    .poll(
      () =>
        document
          .querySelector("[aria-rowindex] .bn-frimousse-emoji[data-selected]")
          ?.getBoundingClientRect().x,
    )
    .toBeLessThan(firstX);
  expect(selection.anchorNode).toBe(anchorNode);
  expect(selection.anchorOffset).toBe(anchorOffset);
  const selected = await waitForSelectedEmoji();
  const emoji = selected.textContent!;
  await userEvent.keyboard("{Enter}");
  await expect.poll(() => block("empty").textContent).toBe(`${emoji} `);
});

test("RTL link editor saves mixed-language URLs and labels", async () => {
  await render(
    <Editor
      dir="rtl"
      initialContent={[
        {
          id: "intro",
          type: "paragraph",
          content: [
            { type: "link", href: "https://example.com", content: "קישור" },
          ],
        },
      ]}
    />,
  );
  const link = block("intro").querySelector("a")!.getBoundingClientRect();
  await mouseSequence([
    { type: "move", x: link.x + link.width / 2, y: link.y + link.height / 2 },
  ]);
  await userEvent.click(
    page.getByRole("button", { name: "Edit link", exact: true }),
  );
  const url = await waitForSelector('input[name="url"]');
  const title = await waitForSelector('input[name="title"]');
  await userEvent.fill(url, "https://example.com/שלום?q=123#section");
  await userEvent.fill(title, "קישור — رابط (123)");
  await userEvent.keyboard("{Enter}");
  await expect
    .poll(() => block("intro").querySelector("a")?.getAttribute("href"))
    .toBe("https://example.com/שלום?q=123#section");
  expect(block("intro").querySelector("a")?.textContent).toBe(
    "קישור — رابط (123)",
  );
});

test("RTL image embedding accepts a mixed-language URL", async () => {
  await render(
    <Editor dir="rtl" initialContent={[{ id: "media", type: "image" }]} />,
  );
  await userEvent.click(
    block("media").querySelector<HTMLElement>(".bn-add-file-button")!,
  );
  const input = await waitForSelector('input[data-test="embed-input"]');
  await userEvent.fill(input, "https://example.com/שלום?q=123#section");
  await userEvent.keyboard("{Enter}");
  await expect
    .poll(() => document.querySelector('input[data-test="embed-input"]'))
    .toBeNull();
  await expect
    .poll(() => block("media").querySelector("img")?.getAttribute("src"))
    .toBe("https://example.com/שלום?q=123#section");
});

test.each(["rtl", "ltr"] as const)(
  "%s table extension adds columns by click and outward drag",
  async (dir) => {
    await render(
      <Editor
        dir={dir}
        initialContent={[
          {
            id: "table",
            type: "table",
            content: {
              type: "tableContent",
              rows: [
                { cells: ["ראשון", "English (123)", "آخر"] },
                { cells: ["א", "ב", "ג"] },
              ],
            },
          },
        ]}
      />,
    );
    const table = block("table").querySelector("table")!;
    await moveMouseOverElement(table.querySelectorAll("td")[2]);
    const columns = await waitForSelector(
      ".bn-extend-button-add-remove-columns",
    );
    await userEvent.click(columns);
    await expect
      .poll(() => table.querySelectorAll("tr")[0].children.length)
      .toBe(4);
    await moveMouseOverElement(
      table.querySelectorAll("tr")[0].lastElementChild!,
    );
    const extender = await waitForSelector(
      ".bn-extend-button-add-remove-columns",
    );
    const rect = extender.getBoundingClientRect();
    await mouseSequence([
      { type: "move", x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 },
      { type: "down" },
    ]);
    await mouseSequence([
      {
        type: "move",
        x: rect.x + rect.width / 2 + (dir === "rtl" ? -120 : 120),
        y: rect.y + rect.height / 2,
        steps: 10,
      },
    ]);
    await mouseSequence([{ type: "up" }]);
    await expect
      .poll(() => table.querySelectorAll("tr")[0].children.length)
      .toBe(5);
  },
);
