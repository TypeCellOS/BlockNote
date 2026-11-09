import { createUserStore, type PartialBlock } from "@blocknote/core";
import {
  CommentsExtension,
  DefaultThreadStoreAuth,
} from "@blocknote/core/comments";
import { YjsThreadStore } from "@blocknote/core/y";
import { ThreadsSidebar } from "@blocknote/react";
import { createElement } from "react";
import * as Y from "@y/y";

import { expect, test } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { openEditor, pressKey } from "@root/tests/a11y/helpers.js";

const commentDocument: PartialBlock[] = [
  { type: "paragraph", content: "A comment" },
];

const editorDocument: PartialBlock[] = [
  { type: "paragraph", content: "Commented document" },
];

async function openComments({ resolved = false } = {}) {
  const doc = new Y.Doc();
  const threadStore = new YjsThreadStore(
    "user",
    doc.get("threads"),
    new DefaultThreadStoreAuth("user", "editor"),
  );
  const thread = await threadStore.createThread({
    initialComment: { body: commentDocument },
  });
  if (resolved) {
    await threadStore.resolveThread({ threadId: thread.id });
  }
  const users = createUserStore(async () => [
    {
      id: "user",
      username: "Test user",
      avatarUrl: "/image.svg",
    },
  ]);
  await users.loadUsers(["user"]);
  await openEditor(editorDocument, {
    extensions: [CommentsExtension({ threadStore, resolveUsers: users })],
    children: createElement(ThreadsSidebar, { filter: "all" }),
  });
  return { threadStore, threadId: thread.id };
}

async function focusCommentActionWithAssertions(toolbarButton: string) {
  const toolbar = page.getByRole("toolbar");
  const button = toolbar.getByRole("button", {
    name: toolbarButton,
    exact: true,
  });
  await expect.element(button).toBeEnabled();
  // Start at "Before editor" and reach the action without hovering the comment.
  while (document.activeElement !== button.element()) {
    await pressKey("Tab");
  }
  await expect
    .element(button, { message: `${toolbarButton} is reachable with Tab` })
    .toHaveFocus();
  await expect
    .poll(
      () =>
        getComputedStyle(button.element().closest(".bn-comment-toolbar")!)
          .opacity,
    )
    .toBe("1");
  return { toolbar, button };
}

test.describe("keyboard", () => {
  test("comment actions toolbar: Add reaction", async () => {
    await openComments();
    await focusCommentActionWithAssertions("Add reaction");
    await pressKey("Enter");
    await expect
      .element(page.getByRole("dialog", { name: "Add reaction" }))
      .toBeVisible();
  });

  test("comment actions toolbar: Resolve", async () => {
    const { threadStore, threadId } = await openComments();
    await focusCommentActionWithAssertions("Resolve");
    await pressKey("Enter");
    await expect
      .poll(() => threadStore.getThread(threadId).resolved)
      .toBe(true);
  });

  test("comment actions toolbar: Re-open", async () => {
    const { threadStore, threadId } = await openComments({ resolved: true });
    await focusCommentActionWithAssertions("Re-open");
    await pressKey("Enter");
    await expect
      .poll(() => threadStore.getThread(threadId).resolved)
      .toBe(false);
  });

  test("comment actions toolbar: More actions", async () => {
    await openComments();
    await focusCommentActionWithAssertions("More actions");
    await pressKey("Enter");
    await expect.element(page.getByRole("menu")).toBeVisible();
  });
});
