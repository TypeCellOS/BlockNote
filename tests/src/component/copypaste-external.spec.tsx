import { expect, test } from "../setup/setupScriptComponent";
import EditorWithTextArea from "../utils/components/EditorWithTextArea";
import {
  copyPasteAllExternal,
  removeClassesFromHTML,
  removeMetaFromHTML,
} from "../utils/copypaste";
import { focusOnEditor } from "../utils/editor";
import { executeSlashCommand } from "../utils/slashmenu";

test.describe.configure({ mode: "serial" });

// eslint-disable-next-line no-empty-pattern
test.beforeEach(async ({}, testInfo) => {
  testInfo.snapshotSuffix = "";
});

// TODO: These tests should not be used for now. While they do pass, the
//  snapshots don't contain the output we actually want as the custom
//  serializer hasn't been implemented yet.
test("Alert Copy/Paste External", async ({ browserName, mount, page }) => {
  test.skip(
    browserName === "firefox",
    "Firefox doesn't yet support the async clipboard API."
  );

  await mount(<EditorWithTextArea />);

  await focusOnEditor(page);
  await page.keyboard.type("Paragraph 1");
  await executeSlashCommand(page, "alert");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("Alert");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("Paragraph 2");

  const button = await page.locator(
    `[data-content-type="alert"] > div > div:first-child`
  );
  await button.first().click();

  const value = await copyPasteAllExternal(page, "mac");
  await expect(
    removeClassesFromHTML(removeMetaFromHTML(value))
  ).toMatchSnapshot("alert-external.html");
});

test("Button Copy/Paste External", async ({ browserName, mount, page }) => {
  test.skip(
    browserName === "firefox",
    "Firefox doesn't yet support the async clipboard API."
  );

  await mount(<EditorWithTextArea />);

  await focusOnEditor(page);
  await page.keyboard.type("Paragraph 1");
  await executeSlashCommand(page, "button");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("Paragraph 2");

  const value = await copyPasteAllExternal(page, "mac");
  await expect(
    removeClassesFromHTML(removeMetaFromHTML(value))
  ).toMatchSnapshot("button-external.html");
});

test("Embed Copy/Paste Internal", async ({ browserName, mount, page }) => {
  test.skip(
    browserName === "firefox",
    "Firefox doesn't yet support the async clipboard API."
  );

  await mount(<EditorWithTextArea />);

  await focusOnEditor(page);
  await page.keyboard.type("Paragraph 1");
  await executeSlashCommand(page, "embed");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("Paragraph 2");

  const value = await copyPasteAllExternal(page, "mac");
  await expect(
    removeClassesFromHTML(removeMetaFromHTML(value))
  ).toMatchSnapshot("embed-external.html");
});

test("Image Copy/Paste Internal", async ({ browserName, mount, page }) => {
  test.skip(
    browserName === "firefox",
    "Firefox doesn't yet support the async clipboard API."
  );

  await mount(<EditorWithTextArea />);

  await focusOnEditor(page);
  await page.keyboard.type("Paragraph 1");
  await executeSlashCommand(page, "image");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("Caption");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("Paragraph 2");

  const value = await copyPasteAllExternal(page, "mac");
  await expect(
    removeClassesFromHTML(removeMetaFromHTML(value))
  ).toMatchSnapshot("image-external.html");
});

test("Separator Copy/Paste Internal", async ({ browserName, mount, page }) => {
  test.skip(
    browserName === "firefox",
    "Firefox doesn't yet support the async clipboard API."
  );

  await mount(<EditorWithTextArea />);

  await focusOnEditor(page);
  await page.keyboard.type("Paragraph 1");
  await executeSlashCommand(page, "separator");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("Paragraph 2");

  const value = await copyPasteAllExternal(page, "mac");
  await expect(
    removeClassesFromHTML(removeMetaFromHTML(value))
  ).toMatchSnapshot("separator-external.html");
});

test("Table of Contents Copy/Paste Internal", async ({
  browserName,
  mount,
  page,
}) => {
  test.skip(
    browserName === "firefox",
    "Firefox doesn't yet support the async clipboard API."
  );

  await mount(<EditorWithTextArea />);

  await focusOnEditor(page);
  await executeSlashCommand(page, "h1");
  await page.keyboard.type("Heading 1");
  await executeSlashCommand(page, "toc");
  await page.keyboard.press("ArrowDown");
  await executeSlashCommand(page, "h2");
  await page.keyboard.type("Heading 2");

  const value = await copyPasteAllExternal(page, "mac");
  await expect(
    removeClassesFromHTML(removeMetaFromHTML(value))
  ).toMatchSnapshot("toc-external.html");
});
