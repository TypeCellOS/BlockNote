import { expect, vi } from "vite-plus/test";
import { userEvent } from "vite-plus/test/browser";

import { BlockNoteSchema } from "../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../blocks/defaultBlocks.js";
import { createFileBlockConfig } from "../blocks/File/block.js";
import { createBlockSpec } from "../schema/index.js";

function parse(html: string) {
  const root = document.createElement("div");
  root.innerHTML = html;
  return root;
}

it.for([
  ["https://example.com/report.pdf?x=1&y=2", "report.pdf", "Attachment"],
  ["../files/report.pdf", "", ""],
])(
  "exports a navigable file without losing its source: %s",
  async ([url, name, caption], { setupEditor }) => {
    const { editor } = await setupEditor({
      mountType: false,
      initialContent: [
        {
          id: "parent",
          type: "paragraph",
          children: [
            {
              id: "attachment",
              type: "file",
              props: { url, name, caption },
            },
          ],
        },
      ],
    });
    const blocks = editor.document;
    const html = editor.blocksToFullHTML();
    const root = parse(html);
    const link = root.querySelector("a.bn-file-link");
    expect(link?.getAttribute("href")).toBe(url);
    expect(
      link?.closest('[data-content-type="file"]')?.getAttribute("data-url"),
    ).toBe(url);
    expect(root.querySelector(".bn-file-name")?.textContent).toBe(name || url);
    expect(editor.tryParseHTMLToBlocks(html)).toEqual(blocks);
    // Applications can replace navigation URLs without changing stored sources.
    link!.setAttribute("href", "https://cdn.example.com/resolved.pdf");
    expect(editor.tryParseHTMLToBlocks(root.innerHTML)).toEqual(blocks);

    const host = document.createElement("div");
    document.body.appendChild(host);
    try {
      editor.mount(host);
      expect(host.querySelector('[data-content-type="file"]')).not.toBeNull();
      expect(
        host
          .querySelector('[data-content-type="file"] a')
          ?.getAttribute("href"),
      ).toBe(url);
      const navigation = vi.fn((event: MouseEvent) => {
        const prevented = event.defaultPrevented;
        // Observe the renderer's policy without actually leaving the test page.
        event.preventDefault();
        return prevented;
      });
      host.addEventListener("click", navigation);
      const liveLink = host.querySelector<HTMLAnchorElement>("a.bn-file-link")!;
      await userEvent.click(liveLink);
      expect(navigation).toHaveLastReturnedWith(true);
      expect(editor.getTextCursorPosition().block.id).toBe("attachment");

      editor.isEditable = false;
      await userEvent.click(liveLink);
      expect(navigation).toHaveLastReturnedWith(false);
      navigation.mockClear();
      liveLink.focus();
      await userEvent.keyboard("{Enter}");
      expect(navigation).toHaveReturnedWith(false);
    } finally {
      editor.unmount();
      host.remove();
    }
  },
);

it.for([
  "",
  "javascript:alert(1)",
  "java\nscript:alert(1)",
  "data:text/html,test",
  "storage://original",
])(
  "preserves the stored source without filtering schemes: %s",
  async (url, { setupEditor }) => {
    const { editor } = await setupEditor({
      mountType: false,
      initialContent: [
        { id: "file", type: "file", props: { url } },
        {
          id: "safe",
          type: "file",
          props: { url: "https://example.com/safe" },
        },
      ],
    });
    const blocks = editor.document;
    const html = editor.blocksToFullHTML();
    const root = parse(html);
    expect(root.querySelector('[data-id="file"] a')?.getAttribute("href")).toBe(
      url || undefined,
    );
    expect(root.querySelector('[data-id="safe"] a')?.getAttribute("href")).toBe(
      "https://example.com/safe",
    );
    expect(editor.tryParseHTMLToBlocks(html)).toEqual(blocks);
  },
);

it("does not invoke the resolver during synchronous export", async ({
  setupEditor,
}) => {
  const resolveFileUrl = vi.fn(async () => "https://cdn.example.com/private");
  const { editor } = await setupEditor({ mountType: false, resolveFileUrl });
  const html = editor.blocksToFullHTML([
    { type: "file", props: { url: "https://example.com/original" } },
  ]);
  expect(parse(html).querySelector("a")?.getAttribute("href")).toBe(
    "https://example.com/original",
  );
  expect(resolveFileUrl).not.toHaveBeenCalled();
});

it("leaves replacement file renderers and media previews alone", async ({
  setupEditor,
}) => {
  const resolveFileUrl = vi.fn(async () => "https://cdn.example.com/resolved");
  const customFile = createBlockSpec(createFileBlockConfig, {
    render() {
      const dom = document.createElement("div");
      dom.className = "bn-file-name-with-icon";
      dom.textContent = "Custom file UI";
      return { dom };
    },
  });
  const { editor } = await setupEditor({
    mountType: false,
    schema: BlockNoteSchema.create({
      blockSpecs: { ...defaultBlockSpecs, file: customFile() },
    }),
    resolveFileUrl,
  });
  const html = editor.blocksToFullHTML([
    { type: "file", props: { url: "https://example.com/custom.pdf" } },
    {
      type: "image",
      props: { url: "https://example.com/image.png" },
    },
  ]);
  const root = parse(html);
  expect(root.querySelector('[data-content-type="file"] a')).toBeNull();
  expect(root.querySelector("a.bn-file-link")).toBeNull();
  expect(root.querySelector('[data-content-type="image"] img')).not.toBeNull();
  expect(html).toContain("Custom file UI");
  // The image renderer still performs its existing asynchronous preview work;
  // the attachment exporter must not resolve the custom file or re-resolve media.
  expect(resolveFileUrl).toHaveBeenCalledExactlyOnceWith(
    "https://example.com/image.png",
  );
});
