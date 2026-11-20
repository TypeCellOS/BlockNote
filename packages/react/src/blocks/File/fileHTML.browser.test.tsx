import {
  BlockNoteEditor,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { expect, it, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { BlockNoteViewRaw } from "../../editor/BlockNoteView.js";
import { ReactFileBlock } from "./block.js";

it("renders React file links in the editor and exported HTML", async () => {
  const editor = BlockNoteEditor.create({
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
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(<BlockNoteViewRaw editor={editor} />));
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

    flushSync(() => {
      editor.isEditable = false;
    });
    await userEvent.click(liveLink);
    expect(navigation).toHaveLastReturnedWith(false);
    navigation.mockClear();
    liveLink.focus();
    await userEvent.keyboard("{Enter}");
    expect(navigation).toHaveReturnedWith(false);
  } finally {
    root.unmount();
    editor._tiptapEditor.destroy();
    host.remove();
  }
});
