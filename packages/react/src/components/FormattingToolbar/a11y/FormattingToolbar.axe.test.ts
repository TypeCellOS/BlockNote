import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { toolbarDocument, focusToolbarControl } from "./helpers.js";
import { openEditor, checkAxe, pressKey } from "@root/tests/a11y/helpers.js";

test("formatting toolbar: axe", async ({ annotate }) => {
  await openEditor(toolbarDocument);
  await focusToolbarControl("Paragraph");
  await checkAxe(annotate, '[role="toolbar"]');
});

test("formatting toolbar: block type menu axe", async ({ annotate }) => {
  await openEditor(toolbarDocument);
  await focusToolbarControl("Paragraph");
  await pressKey("Enter");
  await expect.element(page.getByRole("menu")).toBeVisible();
  await checkAxe(annotate, '[role="menu"]');
});

test("formatting toolbar: colors menu axe", async ({ annotate }) => {
  await openEditor(toolbarDocument);
  await focusToolbarControl("Colors");
  await pressKey("Enter");
  await expect.element(page.getByRole("menu")).toBeVisible();
  await checkAxe(annotate, '[role="menu"]');
});

test("formatting toolbar: link popover axe", async ({ annotate }) => {
  await openEditor(toolbarDocument);
  await focusToolbarControl("Create link");
  await pressKey("Enter");
  await expect
    .element(document.querySelector<HTMLElement>(".bn-form-popover"))
    .toBeVisible();
  await checkAxe(annotate, ".bn-form-popover");
});
