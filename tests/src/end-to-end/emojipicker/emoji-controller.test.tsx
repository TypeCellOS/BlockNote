import { EmojiPickerController } from "@blocknote/react";
import { expect, vi } from "vite-plus/test";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, EMOJI_PICKER_SELECTOR } from "../../utils/const.js";
import {
  focusOnEditor,
  waitForSelector,
  waitForTextInEditor,
} from "../../utils/editor.js";
import { waitForSelectedEmoji } from "../../utils/emojipicker.js";

it("forwards floating configuration and nested overrides", async ({
  setupEditor,
}) => {
  const placement = vi.fn();
  await setupEditor({
    props: { emojiPicker: false },
    children: (
      <EmojiPickerController
        triggerCharacter=":"
        floatingUIOptions={{
          useDismissProps: { escapeKey: false },
          useFloatingOptions: {
            placement: "top-end",
            middleware: [
              {
                name: "configuration",
                fn(state) {
                  placement(state.placement);
                  return {};
                },
              },
            ],
          },
          focusManagerProps: {
            disabled: false,
            initialFocus: -1,
            modal: false,
          },
          elementProps: {
            className: "configured-emoji-popover",
            style: { zIndex: 123 },
          },
        }}
      />
    ),
  });
  await focusOnEditor();
  await userEvent.keyboard(":sm");
  await waitForSelector(EMOJI_PICKER_SELECTOR);
  const popover = await waitForSelector(".configured-emoji-popover");
  await vi.waitFor(() => {
    expect(placement).toHaveBeenCalledWith("top-end");
    expect(getComputedStyle(popover).zIndex).toBe("123");
    expect(
      document.querySelector("[data-floating-ui-focus-guard]"),
    ).not.toBeNull();
  });
  await userEvent.keyboard("{Escape}");
  expect(document.querySelector(EMOJI_PICKER_SELECTOR)).not.toBeNull();
});

it("supports a custom minimum query length", async ({ setupEditor }) => {
  await setupEditor({
    props: { emojiPicker: false },
    children: <EmojiPickerController triggerCharacter=":" minQueryLength={3} />,
  });
  await focusOnEditor();
  await userEvent.keyboard(":sm");
  expect(document.querySelector(EMOJI_PICKER_SELECTOR)).toBeNull();
  await userEvent.keyboard("i");
  await waitForSelector(EMOJI_PICKER_SELECTOR);
});

it("allows explicitly disabling the minimum query length", async ({
  setupEditor,
}) => {
  await setupEditor({
    props: { emojiPicker: false },
    children: <EmojiPickerController triggerCharacter=":" minQueryLength={0} />,
  });
  await focusOnEditor();
  await userEvent.keyboard(":");
  const selected = await waitForSelectedEmoji();
  const emoji = selected.textContent;
  expect(emoji).toBeTruthy();
  await userEvent.keyboard("{Enter}");
  await waitForTextInEditor(`${emoji} `);
  expect(document.querySelector(EDITOR_SELECTOR)?.textContent).not.toContain(
    ":",
  );
  await vi.waitFor(() =>
    expect(document.querySelector(EMOJI_PICKER_SELECTOR)).toBeNull(),
  );
});

it("respects shouldOpen", async ({ setupEditor }) => {
  const shouldOpen = vi.fn(() => false);
  await setupEditor({
    props: { emojiPicker: false },
    children: (
      <EmojiPickerController triggerCharacter=":" shouldOpen={shouldOpen} />
    ),
  });
  await focusOnEditor();
  await userEvent.keyboard(":sm");
  expect(shouldOpen).toHaveBeenCalled();
  expect(document.querySelector(EMOJI_PICKER_SELECTOR)).toBeNull();
});
