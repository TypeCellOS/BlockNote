import { createUserStore } from "@blocknote/core";
import {
  CommentsExtension,
  DefaultThreadStoreAuth,
} from "@blocknote/core/comments";
import { YjsThreadStore } from "@blocknote/core/y";
import { ThreadsSidebar } from "@blocknote/react";
import { createElement } from "react";
import * as Y from "@y/y";

import { expect } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { openEditor, pressKey } from "@root/tests/a11y/helpers.js";

export async function openComments({ resolved = false } = {}) {
  const doc = new Y.Doc();
  const threadStore = new YjsThreadStore(
    "user",
    doc.get("threads"),
    new DefaultThreadStoreAuth("user", "editor"),
  );
  const thread = await threadStore.createThread({
    initialComment: { body: [{ type: "paragraph", content: "A comment" }] },
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
  await openEditor([{ type: "paragraph", content: "Commented document" }], {
    extensions: [CommentsExtension({ threadStore, resolveUsers: users })],
    children: createElement(ThreadsSidebar, { filter: "all" }),
  });
  return { threadStore, threadId: thread.id };
}

export async function focusCommentAction(control: string) {
  const toolbar = page.getByRole("toolbar");
  const button = toolbar.getByRole("button", { name: control, exact: true });
  await expect.element(button).toBeEnabled();
  // Start at "Before editor" and reach the action without hovering the comment.
  for (let step = 0; step < 10; step++) {
    if (button.element() === document.activeElement) {
      break;
    }
    await pressKey("Tab");
  }
  await expect
    .element(button, { message: `${control} is reachable with Tab` })
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
