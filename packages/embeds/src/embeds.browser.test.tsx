/// <reference types="vite-plus/client" />
import {
  BlockNoteEditor,
  BlockNoteSchema,
  type BlockNoteEditorOptions,
} from "@blocknote/core";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import {
  embedBlockSpecs,
  EmbedExtension,
  PasteChoice,
  SafeIframe,
  withEmbeds,
  createProvider,
} from "./index.js";
import { blueskyProvider } from "./providers/bluesky.js";
import { createOEmbedProvider } from "./providers/oembed.js";
import type {
  EmbedsOptions,
  ResolveResult,
  BookmarkMetadata,
} from "./types.js";
import type { OEmbedResponse } from "./oembed.js";
import "./style.css";

const schema = BlockNoteSchema.create().extend({ blockSpecs: embedBlockSpecs });
type TestEditor = BlockNoteEditor<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>;
type PasteHandler = BlockNoteEditorOptions<
  typeof schema.blockSchema,
  typeof schema.inlineContentSchema,
  typeof schema.styleSchema
>["pasteHandler"];
const URL = "https://example.org";
const link = [
  {
    type: "link" as const,
    href: URL,
    content: [{ type: "text" as const, text: URL, styles: {} }],
  },
];
const liveProvider = createProvider({
  id: "custom",
  matches: () => true,
  component: () => <div>Live view</div>,
});
let root: Root | undefined;
let host: HTMLElement | undefined;
let editorToDestroy: TestEditor | undefined;

function deferred<T>() {
  let finish!: (value: ResolveResult<T>) => void;
  const promise = new Promise<ResolveResult<T>>((resolve) => {
    finish = resolve;
  });
  const resolve = vi.fn(
    (_url: string, _options: { signal: AbortSignal }) => promise,
  );
  return { finish, resolve };
}
async function mount(
  embeds: EmbedsOptions,
  config: {
    pasteHandler?: PasteHandler;
    chooser?: boolean;
    theme?: "light" | "dark";
  } = {},
) {
  const editor = BlockNoteEditor.create(
    withEmbeds({
      schema,
      embeds,
      pasteHandler: config.pasteHandler,
      initialContent: [{ id: "target", type: "paragraph" }],
    }),
  );
  editorToDestroy = editor;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  function render(theme = config.theme) {
    root?.render(
      <BlockNoteView editor={editor} theme={theme}>
        {config.chooser !== false && <PasteChoice />}
      </BlockNoteView>,
    );
  }
  render();
  await vi.waitFor(() =>
    expect(document.querySelector(".bn-editor")).not.toBeNull(),
  );
  editor.focus();
  editor.setTextCursorPosition("target", "end");
  const extension = editor.getExtension(EmbedExtension);
  if (!extension) {
    throw new Error("Missing configured extension");
  }
  return { editor, extension, render };
}
function paste(
  editor: TestEditor,
  payload: string | Record<string, string | undefined>,
  files: File[] = [],
) {
  const data = new DataTransfer();
  for (const file of files) {
    data.items.add(file);
  }
  for (const [mime, value] of Object.entries(
    typeof payload === "string" ? { "text/plain": payload } : payload,
  )) {
    if (value !== undefined) {
      data.setData(mime, value);
    }
  }
  const event = new ClipboardEvent("paste", {
    clipboardData: data,
    bubbles: true,
    cancelable: true,
  });
  // Gecko ignores ClipboardEventInit.clipboardData; retain the real DataTransfer.
  Object.defineProperty(event, "clipboardData", { value: data });
  editor.prosemirrorView.dom.dispatchEvent(event);
}
function choice(name: string) {
  return page.getByRole("option", { name, exact: true });
}
afterEach(() => {
  root?.unmount();
  editorToDestroy?._tiptapEditor.destroy();
  host?.remove();
  root = undefined;
  host = undefined;
  editorToDestroy = undefined;
  vi.unstubAllGlobals();
});

describe("public embeds integration", () => {
  it("keeps the exact source as a normal link without resources until keyboard choice, then uses the first provider", async () => {
    const metadata = deferred<BookmarkMetadata>();
    const component = vi.fn(() => <div>First provider</div>);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { editor } = await mount({
      providers: [
        { ...liveProvider, component },
        { ...liveProvider, id: "fallback" },
      ],
      resolveMetadata: metadata.resolve,
    });
    paste(editor, " https://EXAMPLE.org/article ");
    await expect.element(choice("URL ✓")).toBeVisible();
    expect(editor.getBlock("target")?.content).toEqual([
      {
        type: "link",
        href: "https://EXAMPLE.org/article",
        content: [
          { type: "text", text: "https://EXAMPLE.org/article", styles: {} },
        ],
      },
    ]);
    expect(component).not.toHaveBeenCalled();
    expect(metadata.resolve).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
    expect(document.querySelector("iframe, img")).toBeNull();
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await vi.waitFor(() =>
      expect(editor.getBlock("target")?.props).toEqual({
        originalUrl: "https://EXAMPLE.org/article",
        providerId: "custom",
      }),
    );
    await expect.element(page.getByText("First provider")).toBeVisible();
  });

  it.each([false, undefined] as const)(
    "preserves a caller paste handler returning %s, without a second default insertion",
    async (result) => {
      const caller = vi.fn<NonNullable<PasteHandler>>(({ editor, event }) => {
        expect(event.clipboardData?.getData("text/plain")).toBe("Mixed text");
        editor.insertInlineContent("Application pasted");
        return result;
      });
      const { editor } = await mount(
        { providers: [] },
        { pasteHandler: caller },
      );
      paste(editor, "Mixed text");
      expect(caller).toHaveBeenCalledTimes(1);
      expect(editor.getBlock("target")?.content).toEqual([
        { type: "text", text: "Application pasted", styles: {} },
      ]);
      await expect
        .element(page.getByRole("combobox", { name: "Paste as" }))
        .not.toBeInTheDocument();
    },
  );
  it("delegates mixed content to core when no caller handler exists", async () => {
    const { editor } = await mount({ providers: [] });
    paste(editor, "Read https://example.org today");
    expect(editor.getBlock("target")?.content).toEqual([
      { type: "text", text: "Read ", styles: {} },
      ...link,
      { type: "text", text: " today", styles: {} },
    ]);
  });
  it.each([
    { "text/plain": ` ${URL} ` },
    { "text/markdown": ` ${URL} ` },
    { "text/plain": URL, "text/markdown": URL },
    { "text/uri-list": `# source\r\n${URL}\r\n` },
    { "text/html": `<a href="${URL}">An article</a>` },
    { "text/html": `<p>${URL}</p>` },
  ])("accepts a single source clipboard payload %j", async (payload) => {
    const caller = vi.fn<NonNullable<PasteHandler>>(() => false);
    const { editor } = await mount({ providers: [] }, { pasteHandler: caller });
    paste(editor, payload);
    await expect.element(choice("Bookmark")).toBeVisible();
    expect(editor.getBlock("target")?.content).toEqual(link);
    expect(caller).not.toHaveBeenCalled();
    await userEvent.keyboard("{Escape}");
    expect(editor.getBlock("target")?.content).toEqual(link);
  });
  it.each([
    { "text/plain": URL, "blocknote/html": "<p>Rich editor content</p>" },
    { "text/plain": URL, "vscode-editor-data": "{}" },
    { "text/markdown": `[Article](${URL})` },
    { "text/plain": URL, "text/markdown": `[Article](${URL})` },
    { "text/plain": URL, "text/markdown": "https://other.example" },
    {
      "text/plain": URL,
      "text/html": `<p>Read <a href="${URL}">article</a> today</p>`,
    },
    {
      "text/plain": URL,
      "text/html": `<a href="${URL}">one</a><a href="https://other.example">two</a>`,
    },
    {
      "text/plain": URL,
      "text/html": `<img src="https://image.example/a"><a href="${URL}">article</a>`,
    },
    {
      "text/plain": URL,
      "text/html": `<script>bad()</script><a href="${URL}">article</a>`,
    },
    { "text/uri-list": `${URL}\nhttps://other.example` },
  ])(
    "delegates proprietary, active and multi-content payloads intact %j",
    async (payload) => {
      const caller = vi.fn<NonNullable<PasteHandler>>(({ editor }) => {
        editor.insertInlineContent("Preserved by caller");
        return true;
      });
      const { editor } = await mount(
        { providers: [] },
        { pasteHandler: caller },
      );
      paste(editor, payload);
      expect(caller).toHaveBeenCalledTimes(1);
      expect(editor.getBlock("target")?.content).toEqual([
        { type: "text", text: "Preserved by caller", styles: {} },
      ]);
      expect(host?.querySelector("iframe,img,script")).toBeNull();
    },
  );
  it("delegates a noncollapsed selection even with an empty anchor paragraph", async () => {
    const caller = vi.fn<NonNullable<PasteHandler>>(() => false);
    const { editor } = await mount({ providers: [] }, { pasteHandler: caller });
    editor.insertBlocks(
      [{ id: "end", type: "paragraph", content: "Existing text" }],
      "target",
      "after",
    );
    editor.setSelection("target", "end");
    paste(editor, URL);
    expect(caller).toHaveBeenCalledTimes(1);
    expect(editor.getBlock("end")?.content).toEqual([
      { type: "text", text: "Existing text", styles: {} },
    ]);
  });
  it("preserves file payloads and existing paragraph content for the caller", async () => {
    const caller = vi.fn<NonNullable<PasteHandler>>(({ event }) => {
      expect(event.clipboardData?.files[0]?.name).toBe("attachment.txt");
      return true;
    });
    const { editor } = await mount({ providers: [] }, { pasteHandler: caller });
    paste(editor, URL, [
      new File(["attachment"], "attachment.txt", { type: "text/plain" }),
    ]);
    expect(caller).toHaveBeenCalledTimes(1);
    expect(editor.getBlock("target")?.content).toEqual([]);
    editor.updateBlock("target", { content: "Existing content" });
    caller.mockImplementation(() => true);
    paste(editor, URL);
    expect(caller).toHaveBeenCalledTimes(2);
    expect(editor.getBlock("target")?.content).toEqual([
      { type: "text", text: "Existing content", styles: {} },
    ]);
    await expect
      .element(page.getByRole("combobox", { name: "Paste as" }))
      .not.toBeInTheDocument();
  });

  it("supports programmatic actions without mounting PasteChoice, preserving target children", async () => {
    const metadata = deferred<BookmarkMetadata>();
    const { editor, extension } = await mount(
      { providers: [liveProvider], resolveMetadata: metadata.resolve },
      { chooser: false },
    );
    editor.updateBlock("target", {
      children: [{ id: "child", type: "paragraph", content: "Child text" }],
    });
    expect(extension.insertEmbed(URL).status).toBe("converted");
    await expect.element(page.getByText("Live view")).toBeVisible();
    const request = extension.insertBookmark(URL, "target");
    metadata.finish({
      status: "success",
      value: { title: "Saved", description: "Description" },
    });
    expect((await request).status).toBe("converted");
    expect(editor.getBlock("target")?.props).toEqual({
      originalUrl: URL,
      title: "Saved",
      description: "Description",
      imageUrl: "",
    });
    expect(editor.getBlock("target")?.children[0].id).toBe("child");
    expect(extension.insertUrl(URL, "target").status).toBe("converted");
    expect(editor.getBlock("target")?.content).toEqual(link);
    expect(editor.getBlock("target")?.children[0].id).toBe("child");
  });
  it("restores the source label when a paragraph link has the same href but different visible text", async () => {
    const { editor, extension } = await mount(
      { providers: [] },
      { chooser: false },
    );
    editor.updateBlock("target", {
      content: [
        {
          type: "link",
          href: URL,
          content: [{ type: "text", text: "Read this article", styles: {} }],
        },
      ],
    });
    expect(extension.insertUrl(URL, "target").status).toBe("converted");
    expect(editor.getBlock("target")?.content).toEqual(link);
    expect(extension.insertUrl(URL, "target").status).toBe("unchanged");
  });
  it("returns expected unavailable/url-only outcomes and propagates unexpected callback errors", async () => {
    const error = new Error("Application bug");
    const { editor, extension } = await mount({
      providers: [],
      resolveMetadata: async () => {
        throw error;
      },
    });
    expect(extension.insertEmbed(URL).status).toBe("unavailable");
    expect(extension.insertUrl("javascript:bad()").status).toBe("unavailable");
    expect((await extension.insertBookmark(URL, "missing")).status).toBe(
      "unavailable",
    );
    editor.isEditable = false;
    expect((await extension.insertBookmark(URL)).status).toBe("unavailable");
    editor.isEditable = true;
    await expect(extension.insertBookmark(URL)).rejects.toBe(error);
    expect(editor.getBlock("target")?.type).toBe("paragraph");
  });
  it("saves a URL-only bookmark without a resolver", async () => {
    const { editor, extension } = await mount({ providers: [] });
    expect((await extension.insertBookmark(URL)).status).toBe("url-only");
    expect(editor.getBlock("target")?.props).toEqual({
      originalUrl: URL,
      title: "",
      description: "",
      imageUrl: "",
    });
  });
  it("keeps bookmark work after chooser dismissal and never fetches saved metadata on remount/export", async () => {
    const metadata = deferred<BookmarkMetadata>();
    const { editor, extension, render } = await mount({
      providers: [],
      resolveMetadata: metadata.resolve,
    });
    paste(editor, URL);
    await choice("Bookmark").click();
    extension.dismissPaste();
    metadata.finish({ status: "success", value: { title: "Saved title" } });
    await expect
      .element(page.getByRole("link", { name: "Saved title" }))
      .toBeVisible();
    const exported = document.createElement("template");
    exported.innerHTML = editor.blocksToHTMLLossy(editor.document);
    expect(exported.content.querySelector("a")?.getAttribute("href")).toBe(URL);
    expect(exported.content.textContent).toBe(URL);
    expect(exported.content.querySelector("iframe,img,script")).toBeNull();
    root?.unmount();
    if (!host) {
      throw new Error("Missing host");
    }
    root = createRoot(host);
    render();
    await expect
      .element(page.getByRole("link", { name: "Saved title" }))
      .toBeVisible();
    expect(metadata.resolve).toHaveBeenCalledTimes(1);
  });
  it.each(["edit then restore", "delete", "read-only roundtrip"] as const)(
    "dismisses a stale chooser after %s",
    async (reason) => {
      const metadata = deferred<BookmarkMetadata>();
      const { editor } = await mount({
        providers: [],
        resolveMetadata: metadata.resolve,
      });
      paste(editor, URL);
      if (reason === "edit then restore") {
        editor.updateBlock("target", { content: "Edit" });
        editor.updateBlock("target", { content: link });
      }
      if (reason === "delete") {
        editor.removeBlocks(["target"]);
      }
      if (reason === "read-only roundtrip") {
        editor.isEditable = false;
        editor.isEditable = true;
      }
      await expect
        .element(page.getByRole("combobox", { name: "Paste as" }))
        .not.toBeInTheDocument();
      expect(metadata.resolve).not.toHaveBeenCalled();
      expect(editor.getBlock("target")?.type).not.toBe("bookmark");
    },
  );
  it.each([
    "edit then restore",
    "child edit",
    "delete",
    "read-only roundtrip",
    "undo/redo",
    "unmount",
  ] as const)(
    "cancels pending programmatic bookmark work after %s",
    async (reason) => {
      const metadata = deferred<BookmarkMetadata>();
      const { editor, extension } = await mount({
        providers: [],
        resolveMetadata: metadata.resolve,
      });
      paste(editor, URL);
      if (reason === "child edit") {
        editor.updateBlock("target", {
          children: [{ id: "child", type: "paragraph" }],
        });
      }
      const request = extension.insertBookmark(URL, "target");
      switch (reason) {
        case "edit then restore":
          editor.updateBlock("target", { content: "Edit" });
          editor.updateBlock("target", { content: link });
          break;
        case "child edit":
          editor.updateBlock("child", { content: "Changed child" });
          break;
        case "delete":
          editor.removeBlocks(["target"]);
          break;
        case "read-only roundtrip":
          editor.isEditable = false;
          editor.isEditable = true;
          break;
        case "undo/redo":
          expect(editor.undo()).toBe(true);
          expect(editor.redo()).toBe(true);
          break;
        case "unmount":
          root?.unmount();
          root = undefined;
          break;
      }
      expect(metadata.resolve.mock.calls[0][1].signal.aborted).toBe(true);
      metadata.finish({
        status: "success",
        value: { title: "Must not insert" },
      });
      expect((await request).status).toBe("cancelled");
      expect(editor.getBlock("target")?.type).not.toBe("bookmark");
    },
  );
  it("uses one request owner across targets and cancels before same-representation no-op", async () => {
    const metadata = deferred<BookmarkMetadata>();
    const { editor, extension } = await mount({
      providers: [liveProvider],
      resolveMetadata: metadata.resolve,
    });
    extension.insertEmbed(URL, "target");
    editor.insertBlocks(
      [{ id: "other", type: "paragraph" }],
      "target",
      "after",
    );
    const old = extension.insertBookmark(URL, "other");
    editor.setTextCursorPosition("target", "end");
    await page
      .getByRole("button", { name: "Change representation", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Embed", exact: true }).click();
    expect(metadata.resolve.mock.calls[0][1].signal.aborted).toBe(true);
    expect(extension.insertEmbed(URL, "target").status).toBe("unchanged");
    metadata.finish({ status: "success", value: { title: "Stale" } });
    expect((await old).status).toBe("cancelled");
    expect(editor.getBlock("other")?.type).toBe("paragraph");
    expect(editor.getBlock("target")?.type).toBe("embed");
  });
  it("keeps target work alive when only the caret moves, and uses native representation controls", async () => {
    const metadata = deferred<BookmarkMetadata>();
    const { editor, extension } = await mount({
      providers: [liveProvider],
      resolveMetadata: metadata.resolve,
    });
    editor.insertBlocks(
      [{ id: "other", type: "paragraph" }],
      "target",
      "after",
    );
    const request = extension.insertBookmark(URL, "target");
    editor.setTextCursorPosition("other", "end");
    metadata.finish({ status: "success", value: { title: "Saved" } });
    expect((await request).status).toBe("converted");
    editor.setTextCursorPosition("target", "end");
    await expect
      .element(page.getByRole("button", { name: "Open original", exact: true }))
      .toBeVisible();
    await page
      .getByRole("button", { name: "Change representation", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Embed", exact: true }).click();
    await expect.element(page.getByText("Live view")).toBeVisible();
    expect(editor.getBlock("target")?.type).toBe("embed");
  });
  it("offers keyboard choices in a short narrow viewport without bespoke collision rules", async () => {
    await page.viewport(390, 300);
    try {
      const { editor } = await mount({ providers: [] });
      paste(editor, URL);
      await expect
        .element(page.getByRole("combobox", { name: "Paste as" }))
        .toBeVisible();
      await userEvent.keyboard("{ArrowDown}{Enter}");
      await vi.waitFor(() =>
        expect(editor.getBlock("target")?.type).toBe("bookmark"),
      );
    } finally {
      await page.viewport(1280, 720);
    }
  });
});

describe("live rendering boundaries", () => {
  it.each([
    "approved",
    "denied",
    "suffix spoof",
    "srcdoc",
    "application origin",
  ] as const)("sanitizes actual oEmbed output: %s", async (kind) => {
    const src =
      kind === "suffix spoof"
        ? "https://player.example.evil/video"
        : kind === "application origin"
          ? `${window.location.origin}/video`
          : "https://player.example/video";
    const provider = createOEmbedProvider({
      approvedIframeOrigins:
        kind === "denied"
          ? []
          : ["https://player.example", window.location.origin],
      resolve: async () => ({
        status: "success",
        value: {
          type: "rich",
          version: "1.0",
          width: 640,
          height: 480,
          title: "Safe title",
          html: `<script>window.__untrusted = true</script><iframe src="${src}" ${kind === "srcdoc" ? 'srcdoc="bad"' : ""} onload="alert(1)"></iframe>`,
        },
      }),
    });
    const { extension } = await mount({ providers: [provider] });
    extension.insertEmbed(URL);
    if (kind === "approved") {
      await expect.element(page.getByTitle("Safe title")).toBeInTheDocument();
      const frame = document.querySelector("iframe");
      expect(frame?.getAttribute("src")).toBe(src);
      expect(frame?.getAttribute("sandbox")).toBe(
        "allow-scripts allow-same-origin allow-presentation allow-popups",
      );
      expect(frame?.hasAttribute("onload")).toBe(false);
      expect(frame?.hasAttribute("srcdoc")).toBe(false);
    } else {
      await expect
        .element(page.getByRole("link", { name: "Safe title" }))
        .toBeVisible();
      expect(document.querySelector("iframe")).toBeNull();
    }
    expect("__untrusted" in window).toBe(false);
  });
  it("aborts stale live-provider loads and never renders their late result", async () => {
    const first = deferred<OEmbedResponse>();
    const second = deferred<OEmbedResponse>();
    const resolve = vi.fn((url: string, options: { signal: AbortSignal }) =>
      url === URL ? first.resolve(url, options) : second.resolve(url, options),
    );
    const { extension } = await mount({
      providers: [createOEmbedProvider({ resolve })],
    });
    extension.insertEmbed(URL);
    await vi.waitFor(() => expect(first.resolve).toHaveBeenCalledTimes(1));
    extension.insertEmbed("https://other.example");
    await vi.waitFor(() => expect(second.resolve).toHaveBeenCalledTimes(1));
    expect(first.resolve.mock.calls[0][1].signal.aborted).toBe(true);
    second.finish({
      status: "success",
      value: { version: "1.0", type: "link", title: "Newest" },
    });
    await expect
      .element(page.getByRole("link", { name: "Newest" }))
      .toBeVisible();
    first.finish({
      status: "success",
      value: { version: "1.0", type: "link", title: "Stale" },
    });
    await expect
      .element(page.getByRole("link", { name: "Stale" }))
      .not.toBeInTheDocument();
    extension.insertEmbed(URL);
    await vi.waitFor(() => expect(first.resolve).toHaveBeenCalledTimes(2));
    root?.unmount();
    root = undefined;
    expect(first.resolve.mock.calls[1][1].signal.aborted).toBe(true);
  });
  it("authenticates real iframe messages before decoding, clamps heights and detaches replaced nodes", async () => {
    host = document.createElement("div");
    document.body.append(host);
    root = createRoot(host);
    const decodeHeight = vi.fn((data: unknown) =>
      typeof data === "number" ? data : undefined,
    );
    function render(key: string) {
      root?.render(
        <SafeIframe
          key={key}
          src="https://player.example/video"
          title="Resize fixture"
          decodeHeight={decodeHeight}
        />,
      );
    }
    function send(source: Window | null, origin: string, data: number) {
      const event = new MessageEvent("message", { origin, data });
      // Some engines reject detached/navigated WindowProxy values in the
      // constructor. Keep the actual DOM window identity, not a fake window.
      Object.defineProperty(event, "source", { value: source });
      window.dispatchEvent(event);
    }
    render("first");
    await expect.element(page.getByTitle("Resize fixture")).toBeInTheDocument();
    const frame = document.querySelector("iframe");
    if (!frame?.contentWindow) {
      throw new Error("No frame window");
    }
    const source = frame.contentWindow;
    send(frame.contentWindow, "https://evil.example", 999);
    send(window, "https://player.example", 999);
    expect(decodeHeight).not.toHaveBeenCalled();
    send(frame.contentWindow, "https://player.example", 9000);
    await vi.waitFor(() => expect(frame.style.height).toBe("2000px"));
    send(frame.contentWindow, "https://player.example", NaN);
    expect(frame.style.height).toBe("2000px");
    render("replacement");
    await vi.waitFor(() =>
      expect(document.querySelector("iframe")).not.toBe(frame),
    );
    const replacement = document.querySelector("iframe");
    if (!replacement?.contentWindow) {
      throw new Error("No replacement window");
    }
    decodeHeight.mockClear();
    send(source, "https://player.example", 400);
    expect(decodeHeight).not.toHaveBeenCalled();
    send(replacement.contentWindow, "https://player.example", 1);
    await vi.waitFor(() => expect(replacement.style.height).toBe("100px"));
    root?.unmount();
    root = undefined;
    decodeHeight.mockClear();
    send(source, "https://player.example", 500);
    expect(decodeHeight).not.toHaveBeenCalled();
  });
  it("keeps Bluesky aligned with runtime editor theme and transparent light canvas without reloading data", async () => {
    const fetch = vi.fn(async () => Response.json({ did: "did:plc:abc123" }));
    vi.stubGlobal("fetch", fetch);
    const { editor, extension, render } = await mount(
      { providers: [blueskyProvider] },
      { theme: "dark" },
    );
    extension.insertEmbed(
      "https://bsky.app/profile/bsky.app/post/3kktuiwidw22d",
    );
    for (const theme of ["dark", "light", "dark"] as const) {
      render(theme);
      await vi.waitFor(() => {
        const frame = document.querySelector<HTMLIFrameElement>(
          'iframe[title="Bluesky post"]',
        );
        if (!frame) {
          throw new Error("Missing Bluesky frame");
        }
        expect(
          new globalThis.URL(frame.src).searchParams.get("colorMode"),
        ).toBe(theme);
        expect(getComputedStyle(frame).colorScheme).toBe("light");
        expect(getComputedStyle(frame).backgroundColor).toBe(
          "rgba(0, 0, 0, 0)",
        );
      });
    }
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(editor.getBlock("target")?.props).toEqual({
      originalUrl: "https://bsky.app/profile/bsky.app/post/3kktuiwidw22d",
      providerId: "bluesky",
    });
  });
});
