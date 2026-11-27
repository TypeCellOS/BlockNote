import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { expect, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { ReactFileBlock } from "./block.js";

it("renders React file links in the editor and exported HTML", async ({
  setupEditor,
}) => {
  const {
    editor,
    rootNode: host,
    rerender,
  } = await setupEditor({
    skin: "raw",
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, file: ReactFileBlock() },
    }),
    initialContent: [
      {
        id: "file",
        type: "file",
        props: { url: "https://example.com/report.pdf", caption: "Caption" },
      },
    ],
  });
  const blocks = editor.document;
  const html = editor.blocksToFullHTML();
  const exported = document.createElement("div");
  exported.innerHTML = html;
  expect(exported.querySelector("a.bn-file-link")?.getAttribute("href")).toBe(
    "https://example.com/report.pdf",
  );
  expect(exported.querySelector("figcaption")?.textContent).toBe("Caption");
  expect(editor.tryParseHTMLToBlocks(html)).toEqual(blocks);
  expect(
    host.querySelector('[data-content-type="file"] a')?.getAttribute("href"),
  ).toBe("https://example.com/report.pdf");
  const navigation = vi.fn((event: MouseEvent) => {
    const prevented = event.defaultPrevented;
    event.preventDefault();
    return prevented;
  });
  host.addEventListener("click", navigation);
  const liveLink = host.querySelector<HTMLAnchorElement>("a.bn-file-link")!;
  await userEvent.click(liveLink);
  expect(navigation).toHaveLastReturnedWith(true);
  expect(editor.getTextCursorPosition().block.id).toBe("file");

  rerender({ editable: false });
  const readOnlyLink = host.querySelector<HTMLAnchorElement>("a.bn-file-link")!;
  await userEvent.click(readOnlyLink);
  expect(navigation).toHaveLastReturnedWith(false);
  navigation.mockClear();
  readOnlyLink.focus();
  await userEvent.keyboard("{Enter}");
  expect(navigation).toHaveReturnedWith(false);
});
