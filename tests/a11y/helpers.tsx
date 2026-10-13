import type { PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { render } from "vitest-browser-react";
import axe from "axe-core";
import { expect } from "vite-plus/test";
import { commands, page, server } from "vite-plus/test/browser";
import "./style.css";

export const screenReader =
  server.config.name === "voiceover" || server.config.name === "nvda";
export const selectToLineEndKey =
  server.platform === "darwin" ? "Meta+Shift+ArrowRight" : "Shift+End";

// Vite+ does not re-export the augmentable BrowserCommands interface. Keep the
// typed RPC boundary here, as the existing browser test utilities do.
const browserCommands = commands as typeof commands & {
  startReader(): Promise<void>;
  pressKey(key: string): Promise<string | undefined>;
  readTranscript(): Promise<string[]>;
  stopReader(): Promise<void>;
};

function EditorFixture({
  initialContent,
  editable,
}: {
  initialContent: PartialBlock[];
  editable: boolean;
}) {
  const editor = useCreateBlockNote({ initialContent });
  return (
    <main style={{ maxWidth: 900, margin: "80px auto", padding: 24 }}>
      <h1>BlockNote accessibility fixture</h1>
      <button type="button">Before editor</button>
      <BlockNoteView editor={editor} theme="light" editable={editable} />
      <button type="button">After editor</button>
    </main>
  );
}

export async function openEditor(
  initialContent: PartialBlock[],
  { editable = true }: { editable?: boolean } = {},
) {
  await page.viewport(1280, 900);
  await render(
    <EditorFixture initialContent={initialContent} editable={editable} />,
  );
  await expect.element(page.getByRole("textbox")).toBeVisible();
  await expect
    .element(page.getByRole("textbox"))
    .toHaveAttribute("contenteditable", String(editable));
  await document.fonts.ready;
  if (screenReader) {
    await browserCommands.startReader();
  } else {
    page
      .getByRole("button", { name: "Before editor", exact: true })
      .element()
      .focus();
  }
}

export async function checkAxe(scope?: string) {
  const results = await axe.run(scope ? { include: [scope] } : document.body);
  expect(results.violations, "axe violations").toEqual([]);
}

export function readSelection() {
  const selection = document.getSelection();
  const node = selection?.focusNode;
  const element = node instanceof Element ? node : node?.parentElement;
  const cell = element?.closest("td, th");
  const row = cell?.parentElement;
  return {
    tableCell:
      cell instanceof HTMLTableCellElement && row instanceof HTMLTableRowElement
        ? { row: row.rowIndex, column: cell.cellIndex }
        : null,
    blockId: element?.closest("[data-id]")?.getAttribute("data-id") ?? null,
    offset: selection?.focusOffset ?? 0,
    text: selection?.toString() ?? "",
  };
}

export async function pressKey(key: string) {
  return browserCommands.pressKey(key);
}

// Register with afterEach in screen-reader tests. Stop the reader even when
// reading or comparing the transcript fails.
export async function saveTranscript() {
  if (!screenReader) {
    throw new Error("saveTranscript requires a screen-reader test run.");
  }
  try {
    const transcript = await browserCommands.readTranscript();
    expect(transcript.length).toBeGreaterThan(0);
    expect(transcript).toMatchSnapshot();
  } finally {
    await browserCommands.stopReader();
  }
}
