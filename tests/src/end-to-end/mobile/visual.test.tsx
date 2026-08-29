import {
  CommentsExtension,
  DefaultThreadStoreAuth,
} from "@blocknote/core/comments";
import { YjsThreadStore } from "@blocknote/core/yjs";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import App from "@examples/01-basic/testing/src/App";
import { useMemo } from "react";
import { afterEach, beforeEach, describe, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import * as Y from "yjs";

import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import {
  expectElement,
  focusOnEditor,
  sleep,
  waitForSelector,
} from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";

// Visual baselines for the mobile chrome: the pinned toolbar, the link
// popover above it, and the comment composer card. Layout drift here (a
// mispositioned toolbar, a popover under the keyboard line, a collapsed
// card) is exactly the class of regression the behavioral tests can miss
// while everything still "works".
//
// Baselines are per engine (`-chromium-linux` = android instance,
// `-webkit-linux` = ios instance; the desktop projects exclude mobile/, so
// the names can't collide with desktop chromium). Full-body shots at the
// keyboard-open viewport follow the theming suite's pattern; the global 2%
// pixelmatch tolerance absorbs caret blink.

const USER = {
  id: "1",
  username: "John Doe",
  avatarUrl: "https://placehold.co/100x100?text=John",
  role: "editor" as const,
};

async function resolveUsers(userIds: string[]) {
  return [USER].filter((user) => userIds.includes(user.id));
}

function CommentsApp() {
  const doc = useMemo(() => new Y.Doc(), []);
  const threadStore = useMemo(
    () =>
      new YjsThreadStore(
        USER.id,
        doc.getMap("threads"),
        new DefaultThreadStoreAuth(USER.id, USER.role),
      ),
    [doc],
  );
  const editor = useCreateBlockNote(
    { extensions: [CommentsExtension({ threadStore, resolveUsers })] },
    [threadStore],
  );
  return <BlockNoteView editor={editor} />;
}

beforeEach(async () => {
  ensureTouchEmulation();
  await page.viewport(393, 727);
});

afterEach(async () => {
  await page.viewport(393, 727);
});

describe("Mobile chrome visual baselines", () => {
  test("toolbar pinned above the keyboard", async () => {
    await render(<App />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await userEvent.keyboard("Mobile toolbar");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    await sleep(500);

    await expectElement(document.body).toMatchScreenshot("mobile-toolbar");
  });

  test("link popover open above the toolbar", async () => {
    await render(<App />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await userEvent.keyboard("Link target");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    await userEvent.click(
      await waitForSelector(
        `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
      ),
    );
    await vi.waitFor(() => {
      if (!(document.activeElement instanceof HTMLInputElement)) {
        throw new Error("URL input did not receive focus");
      }
    });
    await sleep(500);

    await expectElement(document.body).toMatchScreenshot("mobile-link-popover");
  });

  test("comment composer card", async () => {
    await render(<CommentsApp />);
    await waitForSelector(EDITOR_SELECTOR);
    await focusOnEditor();
    await userEvent.keyboard("Comment target here");
    await userEvent.keyboard("{Shift>}{Home}{/Shift}");

    await page.viewport(393, 427);
    await waitForSelector(MOBILE_TOOLBAR_SELECTOR);
    const commentButton = Array.from(
      document.querySelectorAll<HTMLElement>(
        `${MOBILE_TOOLBAR_SELECTOR} button`,
      ),
    ).find((button) =>
      /comment/i.test(button.getAttribute("aria-label") ?? ""),
    );
    await userEvent.click(commentButton!);
    await vi.waitFor(() => {
      if (!document.activeElement?.closest(".bn-comment-editor")) {
        throw new Error("comment composer did not receive focus");
      }
    });
    await userEvent.keyboard("A mobile comment");
    await sleep(500);

    // The pre-save composer card carries no timestamps, so the shot is
    // stable; the saved thread card (relative times) is deliberately not
    // snapshotted.
    await expectElement(document.body).toMatchScreenshot(
      "mobile-comment-composer",
    );
  });
});
