import type { PartialBlock } from "@blocknote/core";
import AxeBuilder from "@axe-core/playwright";
import {
  test,
  expect,
  type Page,
  type ScreenReaderPlaywright,
} from "./test.js";

export const selectToLineEndKey =
  process.platform === "darwin" ? "Meta+Shift+ArrowRight" : "Shift+End";

type FocusEvent = { tag: string; label: string | null; text: string | null };
declare global {
  interface Window {
    a11yFocusEvents: FocusEvent[];
    a11yInitialContent?: PartialBlock[];
  }
}

export async function openEditor(
  page: Page,
  initialContent: PartialBlock[],
  screenReader?: ScreenReaderPlaywright,
) {
  await page.addInitScript((content) => {
    window.a11yInitialContent = content;
    window.a11yFocusEvents = [];
    document.addEventListener("focusin", (event) => {
      if (event.target instanceof Element) {
        window.a11yFocusEvents.push({
          tag: event.target.tagName,
          label: event.target.getAttribute("aria-label"),
          text: event.target.textContent?.slice(0, 100) ?? null,
        });
      }
    });
  }, initialContent);
  await page.goto("/");
  await expect(page.locator(".bn-editor")).toBeVisible();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  if (screenReader) {
    await screenReader.navigateToWebContent();
    await screenReader.clearSpokenPhraseLog();
  }
  // Set only the starting point; navigation within the editor uses key presses.
  await page
    .getByRole("button", { name: "Before editor", exact: true })
    .focus();
}

export async function checkAxe(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  await test.info().attach("axe.json", {
    body: JSON.stringify(results, null, 2),
    contentType: "application/json",
  });
  // Continue collecting interaction evidence even if existing violations fail.
  expect.soft(results.violations, "axe violations").toEqual([]);
}

export async function readSelection(page: Page) {
  return page.evaluate(() => {
    const selection = window.getSelection();
    const node = selection?.focusNode;
    const element = node instanceof Element ? node : node?.parentElement;
    const cell = element?.closest("td, th");
    const row = cell?.parentElement;
    return {
      tableCell:
        cell instanceof HTMLTableCellElement &&
        row instanceof HTMLTableRowElement
          ? { row: row.rowIndex, column: cell.cellIndex }
          : null,
      blockId: element?.closest("[data-id]")?.getAttribute("data-id") ?? null,
      offset: selection?.focusOffset ?? 0,
      text: selection?.toString() ?? "",
    };
  });
}

// Each key produces a report step, interaction details, and a screenshot if
// focus changed. With GuidePup, the same step also captures its announcement.
export async function pressKey(
  page: Page,
  key: string,
  screenReader?: ScreenReaderPlaywright,
) {
  await test.step(`Press ${key}`, async () => {
    let speech: string | undefined;
    if (screenReader) {
      speech = (await screenReader.capture(() => page.keyboard.press(key)))
        .spokenPhrase;
    } else {
      await page.keyboard.press(key);
    }
    const focus = await page.evaluate(() => window.a11yFocusEvents.splice(0));
    const info = test.info();
    const name = `${info.attachments.length}-${key.replace(/[^a-z0-9]+/gi, "-")}`;
    await info.attach(`${name}.json`, {
      body: JSON.stringify(
        { key, focus, selection: await readSelection(page), speech },
        null,
        2,
      ),
      contentType: "application/json",
    });
    if (focus.length) {
      // This captures the resulting state; the JSON also records transient focus.
      await info.attach(`${name}-focus.png`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    }
  });
}

// Called explicitly from afterEach, before GuidePup stops its screen reader.
export async function saveTranscript(screenReader?: ScreenReaderPlaywright) {
  if (!screenReader) {
    return;
  }
  const transcript = await screenReader.spokenPhraseLog();
  await test.info().attach("screen-reader-transcript.json", {
    body: JSON.stringify(
      { reader: screenReader.name, version: screenReader.version, transcript },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(
    transcript.length,
    "The screen reader must produce a transcript",
  ).toBeGreaterThan(0);
  // Preserve every phrase and its order: no normalization or partial matching.
  // Each test gets its own snapshot; Playwright separates projects by reader.
  const name = test
    .info()
    .title.replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase();
  expect(JSON.stringify(transcript, null, 2)).toMatchSnapshot(
    `${name}-transcript.json`,
  );
}
