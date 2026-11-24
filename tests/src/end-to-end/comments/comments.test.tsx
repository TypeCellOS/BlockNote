import { BlockNoteEditor } from "@blocknote/core";
import {
  CommentsExtension,
  DefaultThreadStoreAuth,
} from "@blocknote/core/comments";
import { blocksToYDoc, YjsThreadStore } from "@blocknote/core/yjs";
import { describe, expect, test as base, vi } from "vite-plus/test";
import { createSetupEditor } from "../../commands/browser/setupEditor.js";
import { selectText } from "../../commands/node/selectText.js";
import {
  browserName,
  commands,
  MOD,
  page,
  userEvent,
} from "../../utils/context.js";
import { EDITOR_SELECTOR, LINK_BUTTON_SELECTOR } from "../../utils/const.js";
import {
  expectElement,
  waitForSelector,
  waitForSelectorDetached,
} from "../../utils/editor.js";
import { clickAt, getRect, moveMouseOverElement } from "../../utils/mouse.js";

const TEXT = "hello";
const URL = "https://example.com";
const THREAD_MARK = ".bn-thread-mark";
const LINK = `${EDITOR_SELECTOR} a[data-inline-content-type="link"]`;
const COMMENT_USER = { id: "1", username: "John Doe", avatarUrl: "" };

// Use the legacy adapter's document factory so this suite exercises the same
// store as the comments example without adding a direct dependency on Yjs 13.
let schemaEditor: BlockNoteEditor | undefined;

const test = base.extend<{
  commentsEditor: {
    editor: BlockNoteEditor;
    seedThread: () => Promise<void>;
  };
}>({
  commentsEditor: async ({ onTestFinished }, use) => {
    const doc = blocksToYDoc((schemaEditor ??= BlockNoteEditor.create()), []);
    onTestFinished(() => {
      doc.destroy();
    });
    const threadStore = new YjsThreadStore(
      COMMENT_USER.id,
      doc.getMap("threads"),
      new DefaultThreadStoreAuth(COMMENT_USER.id, "editor"),
    );
    const setupEditor = createSetupEditor(onTestFinished);
    const { editor } = await setupEditor({
      initialContent: [{ type: "paragraph", content: TEXT }],
      extensions: [
        CommentsExtension({
          threadStore,
          resolveUsers: async (userIds) =>
            userIds.includes(COMMENT_USER.id) ? [COMMENT_USER] : [],
        }),
      ],
    });
    const comments = editor.getExtension(CommentsExtension);
    if (!comments) {
      throw new Error("Missing comments extension");
    }

    // Real thread-store writes and editor marks, without walking through the
    // composer in cases that start with an existing comment.
    await use({
      editor,
      seedThread: async () => {
        selectText(editor, TEXT);
        await comments.createThread({
          initialComment: {
            body: [
              { id: "comment", type: "paragraph", content: "test comment" },
            ],
          },
        });
      },
    });
  },
});

/** Resolves once exactly `count` elements match `selector`. */
function expectSelectorCount(selector: string, count: number) {
  return vi.waitFor(() => {
    const actual = document.querySelectorAll(selector).length;
    if (actual !== count) {
      throw new Error(`Expected ${count} of "${selector}", found ${actual}`);
    }
  });
}

// Frimousse renders regular DOM elements (no shadow DOM), so standard
// selectors work directly.
function emojiButtons(): HTMLButtonElement[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>("[frimousse-emoji]"),
  ).filter((btn) => !btn.closest("[aria-hidden]"));
}

/** Resolves once the emoji picker has rendered at least `min` emoji buttons. */
function waitForEmojiButtons(min = 1): Promise<HTMLButtonElement[]> {
  return vi.waitFor(() => {
    const buttons = emojiButtons();
    if (buttons.length < min) {
      throw new Error(`Emoji picker not ready (found ${buttons.length})`);
    }
    return buttons;
  });
}

describe("Check Comments functionality", () => {
  test("Enter submits comments, replies and edits; Shift+Enter inserts a line break", async ({
    commentsEditor: { editor },
  }) => {
    editor.focus();
    selectText(editor, TEXT);
    await userEvent.click(await waitForSelector('[data-test="addcomment"]'));
    const composer = await waitForSelector(
      '.bn-comment-editor [contenteditable="true"]',
    );

    // Empty comments cannot be submitted, and Enter must not add a block.
    await userEvent.keyboard("{Enter}");
    expect(composer.querySelectorAll(".bn-block-content")).toHaveLength(1);
    await expectSelectorCount(".bn-thread", 1);

    await userEvent.keyboard("first line{Shift>}{Enter}{/Shift}second line");
    expect(composer.querySelectorAll(".bn-block-content")).toHaveLength(1);
    expect(composer.querySelector("br")).not.toBeNull();

    // Enter used to confirm IME composition must not submit the comment.
    composer.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    );
    await expectSelectorCount(".bn-thread", 1);

    await userEvent.keyboard("{Enter}");
    await expectSelectorCount(".bn-thread", 0);
    await userEvent.click(await waitForSelector(THREAD_MARK));
    await expectSelectorCount(".bn-thread-comment", 1);
    expect(document.querySelector(".bn-thread-comment")?.textContent).toContain(
      "second line",
    );

    await userEvent.fill(
      await waitForSelector('.bn-thread-composer [contenteditable="true"]'),
      "reply",
    );
    await commands.pressKey("Enter");
    await expectSelectorCount(".bn-thread-comment", 2);
    await moveMouseOverElement(await waitForSelector(".bn-thread-comment"));
    await userEvent.click(await waitForSelector('[data-test="moreactions"]'));
    await userEvent.click(page.getByRole("menuitem", { name: "Edit comment" }));
    // Choosing Edit already focuses the editor. Wait for that before typing.
    const editComposer = '.bn-thread-comment [contenteditable="true"]';
    await expect
      .poll(() => document.activeElement?.matches(editComposer))
      .toBe(true);
    await window.__blockNoteWaitForEditorFocus();
    await userEvent.keyboard("{End} edited{Enter}");
    await expect
      .poll(() => {
        return {
          editing: document.querySelector(editComposer) !== null,
          text: document.querySelector(".bn-thread-comment")?.textContent,
        };
      })
      .toEqual({ editing: false, text: expect.stringContaining("edited") });
  });

  test("Should be able to add reactions", async ({
    commentsEditor: { editor, seedThread },
  }) => {
    await seedThread();
    // Seeding leaves the comment text selected; collapse it before opening the
    // thread so the formatting toolbar cannot cover its reaction button.
    editor.setTextCursorPosition(editor.document[0]);
    await waitForSelectorDetached('[data-test="addcomment"]');
    await userEvent.click(await waitForSelector(THREAD_MARK));

    // Hover comment to reveal action toolbar.
    await moveMouseOverElement(".bn-thread-comment");

    // Add a reaction via the action toolbar's add-reaction button.
    await userEvent.click(await waitForSelector('[data-test="addreaction"]'));
    await userEvent.click(await waitForSelector("[frimousse-search]"));
    await userEvent.keyboard("{Escape}");
    await expectSelectorCount("[frimousse-root]", 0);

    // Exercise the UI library's outside-click dismissal too: Escape is handled
    // directly by the picker, so it does not cover the popover callback.
    await userEvent.click(await waitForSelector('[data-test="addreaction"]'));
    await waitForEmojiButtons();
    // The picker overlaps the comment's centre. Click its exposed top-left
    // corner instead of asking Playwright to click through the popover.
    const commentRect = getRect(await waitForSelector(".bn-thread-comment"));
    await clickAt(commentRect.x + 2, commentRect.y + 2);
    await expectSelectorCount("[frimousse-root]", 0);

    // Both dismissal paths must leave the owner ready to reopen and select.
    await moveMouseOverElement(".bn-thread-comment");
    await userEvent.click(await waitForSelector('[data-test="addreaction"]'));
    await userEvent.fill(await waitForSelector("[frimousse-search]"), "frog");
    await vi.waitFor(() => {
      expect(emojiButtons().map((button) => button.textContent)).toEqual([
        "🐸",
      ]);
    });
    await userEvent.keyboard("{Enter}");
    await waitForSelectorDetached("[frimousse-root]");
    await expectSelectorCount(".bn-comment-reaction", 1);
    expect(
      document.querySelector(".bn-comment-reaction")?.textContent,
    ).toContain("🐸");

    // Add a second reaction via the add-reaction badge.
    await moveMouseOverElement(".bn-thread-comment");
    await userEvent.click(await waitForSelector(".bn-comment-add-reaction"));

    // Clicking the visible Chip label again must close the picker, not first
    // dismiss it as an outside press and then reopen it from the click handler.
    await waitForEmojiButtons();
    const addReactionLabel = await waitForSelector(
      ".bn-comment-add-reaction label",
    );
    await userEvent.click(addReactionLabel);
    await expectSelectorCount("[frimousse-root]", 0);
    await userEvent.click(addReactionLabel);
    const secondPickerButtons = await waitForEmojiButtons(6);
    const addReactionInput = await waitForSelector(
      ".bn-comment-add-reaction input",
    );
    expect(addReactionInput.getAttribute("aria-haspopup")).toBe("dialog");
    expect(addReactionInput.getAttribute("aria-expanded")).toBe("true");
    expect(addReactionInput.getAttribute("aria-label")).toBe("Add reaction");

    // Pick a different emoji so it's added as a new reaction rather than
    // toggling the first one off.
    await userEvent.click(secondPickerButtons[5]);
    await waitForSelectorDetached("[frimousse-root]");
    await expectSelectorCount(".bn-comment-reaction", 2);
  });

  test("Should preserve existing comments when adding a link", async ({
    commentsEditor: { editor, seedThread },
  }) => {
    editor.focus();
    await seedThread();
    await userEvent.click(await waitForSelector(LINK_BUTTON_SELECTOR));

    await userEvent.fill(
      await waitForSelector(".bn-form-popover input[name=url]"),
      URL,
    );
    await userEvent.keyboard("{Enter}");

    await waitForSelector(`${LINK}[href="${URL}"]`);
    await expectElement(
      await waitForSelector(
        `${LINK} ${THREAD_MARK}, ${THREAD_MARK} a[href="${URL}"]`,
      ),
    ).toBeVisible();
  });

  test("Should preserve existing comments when adding a code mark", async ({
    commentsEditor: { editor, seedThread },
  }) => {
    editor.focus();
    await seedThread();
    await commands.pressKey(`${MOD}+e`);

    // The comment must be preserved, and the text must now also be inline code,
    // i.e. the comment and code marks coexist on the same text.
    await expectElement(
      await waitForSelector("span.bn-thread-mark"),
    ).toBeVisible();
    await expectElement(
      await waitForSelector(
        "span.bn-thread-mark code, code span.bn-thread-mark",
      ),
    ).toBeVisible();
  });

  test.skipIf(browserName === "webkit")(
    "Should select thread on first click and open link on second click",
    async ({ commentsEditor: { editor, seedThread }, onTestFinished }) => {
      await seedThread();
      editor.createLink(URL);
      editor.setTextCursorPosition(editor.document[0], "end");
      const link = await waitForSelector(LINK);
      expect(document.querySelector(".bn-thread-mark-selected")).toBeNull();
      const windowOpen = vi
        .spyOn(window, "open")
        .mockImplementation(() => null);
      onTestFinished(() => {
        windowOpen.mockRestore();
      });

      // First click selects the thread without navigating.
      const { x, y, width, height } = getRect(link);
      await clickAt(x + 2, y + height / 2);
      await expectElement(
        await waitForSelector(".bn-thread-mark-selected"),
      ).toBeVisible();
      expect(windowOpen).not.toHaveBeenCalled();

      // Second click on the now-selected thread navigates to the link target.
      // Use a different point on the same link, outside ProseMirror's 10px
      // multi-click radius, so both clicks go through the single-click handler.
      await clickAt(x + width - 6, y + height / 2);
      expect(windowOpen).toHaveBeenCalledExactlyOnceWith(`${URL}/`, "_blank");
    },
  );
});
