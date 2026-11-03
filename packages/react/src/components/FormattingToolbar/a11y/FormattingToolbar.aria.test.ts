import { toolbarDocument, nestedToolbarDocument } from "./fixtures.js";
import { test } from "vite-plus/test";
import { openEditor, checkAriaSnapshot } from "@root/tests/a11y/helpers.js";
import {
  focusToolbarItem,
  activateToolbarButton,
  openToolbarMenu,
  focusNextMenuItem,
  activateMenuItem,
} from "./helpers.js";

async function setupToolbarAria(toolbarItem: string) {
  const { toolbar } = await focusToolbarItem(toolbarItem);
  await checkAriaSnapshot(toolbar, "before activation");
  return toolbar;
}

async function checkToolbarButtonAria(toolbarButton: string) {
  const toolbar = await setupToolbarAria(toolbarButton);
  await activateToolbarButton();
  await checkAriaSnapshot(toolbar, "after activation");
}

async function checkToolbarMenuAria(toolbarMenu: string) {
  const toolbar = await setupToolbarAria(toolbarMenu);
  await openToolbarMenu();
  await focusNextMenuItem();
  await focusNextMenuItem();
  await activateMenuItem();
  await checkAriaSnapshot(toolbar, "after activation");
}

test("formatting toolbar: Paragraph", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarMenuAria("Paragraph");
});

test("formatting toolbar: Bold", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonAria("Bold");
});

test("formatting toolbar: Italic", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonAria("Italic");
});

test("formatting toolbar: Underline", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonAria("Underline");
});

test("formatting toolbar: Strike", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonAria("Strike");
});

test("formatting toolbar: Align text left", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonAria("Align text left");
});

test("formatting toolbar: Align text center", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonAria("Align text center");
});

test("formatting toolbar: Align text right", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonAria("Align text right");
});

test("formatting toolbar: Colors", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarMenuAria("Colors");
});

test("formatting toolbar: Nest block", async () => {
  await openEditor(toolbarDocument);
  await checkToolbarButtonAria("Nest block");
});

test("formatting toolbar: Unnest block", async () => {
  await openEditor(nestedToolbarDocument);
  await checkToolbarButtonAria("Unnest block");
});
