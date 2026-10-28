import type { ExtensionFactoryInstance, PartialBlock } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import type { ReactNode } from "react";
import { render } from "vitest-browser-react";
import axe from "axe-core";
import { expect, type TestContext } from "vite-plus/test";
import { commands, page, server } from "vite-plus/test/browser";
import "./style.css";

export const screenReader =
  server.config.name === "voiceover" || server.config.name === "nvda";
export const selectToLineEndKey =
  server.platform === "darwin" ? "Meta+Shift+ArrowRight" : "Shift+End";

// Vite+ does not re-export the augmentable BrowserCommands interface. Keep the
// typed RPC boundary here, as the existing browser test utilities do.
const browserCommands = commands as typeof commands & {
  readAriaSnapshot(selector: string): Promise<string>;
  startReader(): Promise<void>;
  pressKey(key: string): Promise<string | undefined>;
  readTranscript(): Promise<string[]>;
  stopReader(): Promise<void>;
};

function EditorFixture({
  initialContent,
  editable,
  theme,
  extensions,
  children,
}: {
  initialContent: PartialBlock[];
  editable: boolean;
  theme: "light" | "dark";
  extensions?: ExtensionFactoryInstance[];
  children?: ReactNode;
}) {
  const editor = useCreateBlockNote({ initialContent, extensions });
  return (
    <main style={{ maxWidth: 900, margin: "80px auto", padding: 24 }}>
      <h1>BlockNote accessibility fixture</h1>
      <button type="button">Before editor</button>
      <BlockNoteView editor={editor} theme={theme} editable={editable}>
        {children}
      </BlockNoteView>
      <button type="button">After editor</button>
    </main>
  );
}

export async function openEditor(
  initialContent: PartialBlock[],
  {
    editable = true,
    theme = "light",
    extensions,
    children,
  }: {
    editable?: boolean;
    theme?: "light" | "dark";
    extensions?: ExtensionFactoryInstance[];
    children?: ReactNode;
  } = {},
) {
  await page.viewport(1280, 900);
  await render(
    <EditorFixture
      initialContent={initialContent}
      editable={editable}
      theme={theme}
      extensions={extensions}
    >
      {children}
    </EditorFixture>,
  );
  await expect.element(page.getByRole("textbox").first()).toBeVisible();
  await expect
    .element(page.getByRole("textbox").first())
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

export async function checkAxe(
  annotate: TestContext["annotate"],
  scope?: string,
) {
  const results = await axe.run(scope ? { include: [scope] } : document.body, {
    rules: { "target-size": { enabled: true } },
  });
  for (const result of results.incomplete) {
    for (const node of result.nodes) {
      await annotate(
        `axe manual review: ${result.id} — ${result.help}\nTarget: ${JSON.stringify(node.target)}\n${node.failureSummary ?? ""}\n${result.helpUrl}`,
        "warning",
      );
    }
  }
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

// Use Playwright's semantic snapshot through the provider, and Vitest's
// snapshot storage so these baselines follow the same update policy as tests.
export async function checkAriaSnapshot(
  locator: ReturnType<typeof page.getByRole>,
  name: string,
) {
  expect(
    await browserCommands.readAriaSnapshot(locator.selector),
  ).toMatchSnapshot(name);
}
