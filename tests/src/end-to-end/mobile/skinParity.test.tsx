import {
  CommentsExtension,
  DefaultThreadStoreAuth,
} from "@blocknote/core/comments";
import { YjsThreadStore } from "@blocknote/core/yjs";
import { BlockNoteView as AriakitView } from "@blocknote/ariakit";
import "@blocknote/ariakit/style.css";
import { BlockNoteView as ShadcnView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import AriakitApp from "@examples/01-basic/08-ariakit/src/App";
import ShadcnApp from "@examples/01-basic/09-shadcn/src/App";
import { ComponentType, useMemo } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  test,
  vi,
} from "vite-plus/test";
import { render } from "vitest-browser-react";
import * as Y from "yjs";

import { page, userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import { focusOnEditor, waitForSelector } from "../../utils/editor.js";
import { ensureTouchEmulation } from "../../utils/ensureTouchEmulation.js";

const MOBILE_TOOLBAR_SELECTOR = ".bn-mobile-formatting-toolbar";

// The mobile controllers live in the shared react layer, but each UI package
// supplies its own popovers, inputs, and comment card — the parts that have
// broken before (the link-popover collapse was a Mantine-popover bug). This
// suite runs the two load-bearing mobile flows against the ariakit and shadcn
// skins; the Mantine equivalents are covered by mobileToolbar.test.tsx and
// comments.test.tsx.

const USER = {
  id: "1",
  username: "John Doe",
  avatarUrl: "https://placehold.co/100x100?text=John",
  role: "editor" as const,
};

async function resolveUsers(userIds: string[]) {
  return [USER].filter((user) => userIds.includes(user.id));
}

/** The comments-testing example's setup, parameterized over the skin. */
function makeCommentsApp(View: ComponentType<{ editor: any }>): ComponentType {
  return function CommentsApp() {
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
      {
        extensions: [CommentsExtension({ threadStore, resolveUsers })],
      },
      [threadStore],
    );
    return <View editor={editor} />;
  };
}

const SKINS = [
  {
    name: "ariakit",
    BasicApp: AriakitApp,
    CommentsApp: makeCommentsApp(AriakitView),
  },
  {
    name: "shadcn",
    BasicApp: ShadcnApp,
    CommentsApp: makeCommentsApp(ShadcnView),
  },
] as const;

function expectSingleToolbarAtViewportBottom() {
  return vi.waitFor(() => {
    const toolbars = Array.from(
      document.querySelectorAll(MOBILE_TOOLBAR_SELECTOR),
    );
    if (toolbars.length !== 1) {
      throw new Error(
        `Expected exactly 1 mobile toolbar, found ${toolbars.length}`,
      );
    }
    const rect = toolbars[0].getBoundingClientRect();
    if (rect.height === 0) {
      throw new Error("Mobile toolbar has no size");
    }
    if (Math.abs(rect.bottom - window.innerHeight) > 1 || rect.top < 0) {
      throw new Error(
        `Mobile toolbar not pinned to viewport bottom: top=${rect.top}, ` +
          `bottom=${rect.bottom}, viewport height=${window.innerHeight}`,
      );
    }
    return toolbars[0];
  });
}

function findToolbarButton(pattern: RegExp): HTMLElement | undefined {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`${MOBILE_TOOLBAR_SELECTOR} button`),
  ).find((button) =>
    pattern.test(
      (button.getAttribute("aria-label") ?? "") +
        (button.getAttribute("data-test") ?? "") +
        button.textContent,
    ),
  );
}

beforeEach(async () => {
  ensureTouchEmulation();
  await page.viewport(393, 727);
});

afterEach(async () => {
  await page.viewport(393, 727);
});

for (const skin of SKINS) {
  describe(`Mobile flows with the ${skin.name} skin`, () => {
    test("link popover keeps the toolbar and creates a link", async () => {
      await render(<skin.BasicApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await userEvent.keyboard("Link target");
      await userEvent.keyboard("{Shift>}{Home}{/Shift}");

      // "Keyboard opens": the mobile toolbar appears, pinned.
      await page.viewport(393, 427);
      await expectSingleToolbarAtViewportBottom();

      await userEvent.click(
        await waitForSelector(
          `${MOBILE_TOOLBAR_SELECTOR} ${LINK_BUTTON_SELECTOR}`,
        ),
      );

      // The URL input must take focus without collapsing the toolbar (the
      // popover and the toolbar both live through the focus handoff).
      await vi.waitFor(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLInputElement)) {
          throw new Error("URL input did not receive focus");
        }
        if (!document.querySelector(MOBILE_TOOLBAR_SELECTOR)) {
          throw new Error("mobile toolbar disappeared while popover open");
        }
      });

      await userEvent.keyboard("example.com{Enter}");
      await waitForSelector(`${EDITOR_SELECTOR} a[href="https://example.com"]`);

      // Submitting closes the popover; the toolbar stays for further edits.
      await vi.waitFor(() => {
        if (document.activeElement instanceof HTMLInputElement) {
          throw new Error("URL input still focused after submit");
        }
        if (!document.querySelector(MOBILE_TOOLBAR_SELECTOR)) {
          throw new Error("mobile toolbar gone after creating the link");
        }
      });
    });

    test("comment composer takes the toolbar and hands it back", async () => {
      await render(<skin.CommentsApp />);
      await waitForSelector(EDITOR_SELECTOR);
      await focusOnEditor();
      await userEvent.keyboard("Comment target here");
      await userEvent.keyboard("{Shift>}{Home}{/Shift}");

      await page.viewport(393, 427);
      await expectSingleToolbarAtViewportBottom();

      const commentButton = findToolbarButton(/comment/i);
      expect(commentButton).toBeDefined();
      await userEvent.click(commentButton!);

      // The floating composer opens with its nested editor focused.
      await vi.waitFor(() => {
        if (!document.activeElement?.closest(".bn-comment-editor")) {
          throw new Error("comment composer did not receive focus");
        }
      });
      await userEvent.keyboard("A mobile comment");
      await vi.waitFor(() => {
        const composer = document.querySelector(".bn-comment-editor");
        if (!composer?.textContent?.includes("A mobile comment")) {
          throw new Error("typing did not land in the comment composer");
        }
      });

      // Exactly one toolbar — the composer's — correctly pinned.
      const composerToolbar = await expectSingleToolbarAtViewportBottom();
      expect(composerToolbar.closest(".bn-comment-editor")).not.toBeNull();

      const saveButton = Array.from(
        document.querySelectorAll<HTMLButtonElement>("button"),
      ).find((button) =>
        /save|send|submit/i.test(
          (button.getAttribute("aria-label") ?? "") + button.textContent,
        ),
      );
      expect(saveButton).toBeDefined();
      await userEvent.click(saveButton!);

      // Saving creates the thread and restores the main editor's toolbar.
      await waitForSelector(`${EDITOR_SELECTOR} .bn-thread-mark`);
      await vi.waitFor(() => {
        if (document.querySelector(".bn-comment-editor")) {
          throw new Error("composer still open after saving");
        }
      });
      const restoredToolbar = await expectSingleToolbarAtViewportBottom();
      expect(restoredToolbar.closest(".bn-comment-editor")).toBeNull();
    });
  });
}
