import { focusCommentAction, openComments } from "./helpers.js";
import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { pressKey } from "@root/tests/a11y/helpers.js";

test("comment actions toolbar: Add reaction", async () => {
  await openComments();
  await focusCommentAction("Add reaction");
  await pressKey("Enter");
  await expect
    .element(page.getByRole("dialog", { name: "Add reaction" }))
    .toBeVisible();
});

test("comment actions toolbar: Resolve", async () => {
  const { threadStore, threadId } = await openComments();
  await focusCommentAction("Resolve");
  await pressKey("Enter");
  await expect.poll(() => threadStore.getThread(threadId).resolved).toBe(true);
});

test("comment actions toolbar: Re-open", async () => {
  const { threadStore, threadId } = await openComments({ resolved: true });
  await focusCommentAction("Re-open");
  await pressKey("Enter");
  await expect.poll(() => threadStore.getThread(threadId).resolved).toBe(false);
});

test("comment actions toolbar: More actions", async () => {
  await openComments();
  await focusCommentAction("More actions");
  await pressKey("Enter");
  await expect.element(page.getByRole("menu")).toBeVisible();
});
