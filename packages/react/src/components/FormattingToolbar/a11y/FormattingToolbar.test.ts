import {
  toolbarDocument,
  nestedToolbarDocument,
  centeredToolbarDocument,
} from "./fixtures.js";
import { expect, test, vi } from "vite-plus/test";
import { openEditor } from "@root/tests/a11y/helpers.js";
import {
  focusToolbarItem,
  activateToolbarButton,
  openToolbarMenu,
  focusNextMenuItem,
  activateMenuItem,
} from "./helpers.js";

test("formatting toolbar: Bold", async ({ onTestFinished }) => {
  const editor = await openEditor(toolbarDocument);
  await focusToolbarItem("Bold");
  const onChange = vi.fn();
  onTestFinished(editor.onChange(onChange));
  await activateToolbarButton();
  expect(onChange).toHaveBeenCalled();
});

test("formatting toolbar: Italic", async ({ onTestFinished }) => {
  const editor = await openEditor(toolbarDocument);
  await focusToolbarItem("Italic");
  const onChange = vi.fn();
  onTestFinished(editor.onChange(onChange));
  await activateToolbarButton();
  expect(onChange).toHaveBeenCalled();
});

test("formatting toolbar: Underline", async ({ onTestFinished }) => {
  const editor = await openEditor(toolbarDocument);
  await focusToolbarItem("Underline");
  const onChange = vi.fn();
  onTestFinished(editor.onChange(onChange));
  await activateToolbarButton();
  expect(onChange).toHaveBeenCalled();
});

test("formatting toolbar: Strike", async ({ onTestFinished }) => {
  const editor = await openEditor(toolbarDocument);
  await focusToolbarItem("Strike");
  const onChange = vi.fn();
  onTestFinished(editor.onChange(onChange));
  await activateToolbarButton();
  expect(onChange).toHaveBeenCalled();
});

test("formatting toolbar: Align text left", async ({ onTestFinished }) => {
  const editor = await openEditor(centeredToolbarDocument);
  await focusToolbarItem("Align text left");
  const onChange = vi.fn();
  onTestFinished(editor.onChange(onChange));
  await activateToolbarButton();
  expect(onChange).toHaveBeenCalled();
});

test("formatting toolbar: Align text center", async ({ onTestFinished }) => {
  const editor = await openEditor(toolbarDocument);
  await focusToolbarItem("Align text center");
  const onChange = vi.fn();
  onTestFinished(editor.onChange(onChange));
  await activateToolbarButton();
  expect(onChange).toHaveBeenCalled();
});

test("formatting toolbar: Align text right", async ({ onTestFinished }) => {
  const editor = await openEditor(toolbarDocument);
  await focusToolbarItem("Align text right");
  const onChange = vi.fn();
  onTestFinished(editor.onChange(onChange));
  await activateToolbarButton();
  expect(onChange).toHaveBeenCalled();
});

test("formatting toolbar: Colors", async ({ onTestFinished }) => {
  const editor = await openEditor(toolbarDocument);
  await focusToolbarItem("Colors");
  await openToolbarMenu();
  await focusNextMenuItem();
  await focusNextMenuItem();
  const onChange = vi.fn();
  onTestFinished(editor.onChange(onChange));
  await activateMenuItem();
  expect(onChange).toHaveBeenCalled();
});

test("formatting toolbar: Nest block", async ({ onTestFinished }) => {
  const editor = await openEditor(toolbarDocument);
  await focusToolbarItem("Nest block");
  const onChange = vi.fn();
  onTestFinished(editor.onChange(onChange));
  await activateToolbarButton();
  expect(onChange).toHaveBeenCalled();
});

test("formatting toolbar: Unnest block", async ({ onTestFinished }) => {
  const editor = await openEditor(nestedToolbarDocument);
  await focusToolbarItem("Unnest block");
  const onChange = vi.fn();
  onTestFinished(editor.onChange(onChange));
  await activateToolbarButton();
  expect(onChange).toHaveBeenCalled();
});

test("formatting toolbar: Paragraph", async ({ onTestFinished }) => {
  const editor = await openEditor(toolbarDocument);
  await focusToolbarItem("Paragraph");
  await openToolbarMenu();
  await focusNextMenuItem();
  await focusNextMenuItem();
  const onChange = vi.fn();
  onTestFinished(editor.onChange(onChange));
  await activateMenuItem();
  expect(onChange).toHaveBeenCalled();
});
