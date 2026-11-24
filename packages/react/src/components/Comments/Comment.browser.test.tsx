import { createUserStore, type PartialBlock } from "@blocknote/core";
import {
  CommentsExtension,
  DefaultThreadStoreAuth,
} from "@blocknote/core/comments";
import { YjsThreadStore } from "@blocknote/core/y";
import { ThreadsSidebar } from "@blocknote/react";
import * as Y from "@y/y";

import { describe, expect, type TestContext } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import type { BrowserContext } from "../../../../../tests/src/fixtures/editor.js";

const commentDocument: PartialBlock[] = [
  { type: "paragraph", content: "A comment" },
];

const editorDocument: PartialBlock[] = [
  { type: "paragraph", content: "Commented document" },
];

async function openComments(
  {
    setupEditor,
    onTestFinished,
  }: Pick<BrowserContext, "setupEditor"> & Pick<TestContext, "onTestFinished">,
  { resolved = false } = {},
) {
  const doc = new Y.Doc();
  onTestFinished(() => doc.destroy());
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
  await setupEditor({
    initialContent: editorDocument,
    extensions: [CommentsExtension({ threadStore, resolveUsers: users })],
    children: <ThreadsSidebar filter="all" />,
    outside: ({ children }) => (
      <main>
        <button type="button">Before editor</button>
        {children}
        <button type="button">After editor</button>
      </main>
    ),
  });
  await page
    .getByRole("button", { name: "Before editor", exact: true })
    .click();
  return { threadStore, threadId: thread.id };
}

async function focusCommentActionWithAssertions(
  focusUntil: BrowserContext["focusUntil"],
  toolbarButton: string,
) {
  const toolbar = page.getByRole("toolbar");
  const button = toolbar.getByRole("button", {
    name: toolbarButton,
    exact: true,
  });
  await expect.element(button).toBeEnabled();
  // Start at "Before editor" and reach the action without hovering the comment.
  await focusUntil(button);
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

describe("keyboard", () => {
  it("comment actions toolbar: Add reaction", async ({
    setupEditor,
    onTestFinished,
    focusUntil,
    pressKey,
  }) => {
    await openComments({ setupEditor, onTestFinished });
    await focusCommentActionWithAssertions(focusUntil, "Add reaction");
    await pressKey("Enter");
    await expect.element(page.getByRole("dialog")).toBeVisible();
  });

  it("comment actions toolbar: Resolve", async ({
    setupEditor,
    onTestFinished,
    focusUntil,
    pressKey,
  }) => {
    const { threadStore, threadId } = await openComments({
      setupEditor,
      onTestFinished,
    });
    await focusCommentActionWithAssertions(focusUntil, "Resolve");
    await pressKey("Enter");
    await expect
      .poll(() => threadStore.getThread(threadId).resolved)
      .toBe(true);
  });

  it("comment actions toolbar: Re-open", async ({
    setupEditor,
    onTestFinished,
    focusUntil,
    pressKey,
  }) => {
    const { threadStore, threadId } = await openComments(
      { setupEditor, onTestFinished },
      {
        resolved: true,
      },
    );
    await focusCommentActionWithAssertions(focusUntil, "Re-open");
    await pressKey("Enter");
    await expect
      .poll(() => threadStore.getThread(threadId).resolved)
      .toBe(false);
  });

  it("comment actions toolbar: More actions", async ({
    setupEditor,
    onTestFinished,
    focusUntil,
    pressKey,
  }) => {
    await openComments({ setupEditor, onTestFinished });
    await focusCommentActionWithAssertions(focusUntil, "More actions");
    await pressKey("Enter");
    await expect.element(page.getByRole("menu")).toBeVisible();
  });
});
