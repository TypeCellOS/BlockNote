import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { EmojiPickerController, useCreateBlockNote } from "@blocknote/react";
import type { ComponentProps } from "react";
import { expect, test, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import { userEvent } from "../../utils/context.js";
import { EDITOR_SELECTOR, EMOJI_PICKER_SELECTOR } from "../../utils/const.js";
import {
  focusOnEditor,
  waitForSelector,
  waitForTextInEditor,
} from "../../utils/editor.js";
import { waitForSelectedEmoji } from "../../utils/emojipicker.js";

function ConfiguredEditor(props: ComponentProps<typeof EmojiPickerController>) {
  const editor = useCreateBlockNote();
  return (
    <BlockNoteView editor={editor} emojiPicker={false}>
      <EmojiPickerController {...props} />
    </BlockNoteView>
  );
}

test("forwards floating configuration and nested overrides", async () => {
  const placement = vi.fn();
  await render(
    <ConfiguredEditor
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
        focusManagerProps: { disabled: false, initialFocus: -1, modal: false },
        elementProps: {
          className: "configured-emoji-popover",
          style: { zIndex: 123 },
        },
      }}
    />,
  );
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

test("supports a custom minimum query length", async () => {
  await render(<ConfiguredEditor triggerCharacter=":" minQueryLength={3} />);
  await focusOnEditor();
  await userEvent.keyboard(":sm");
  expect(document.querySelector(EMOJI_PICKER_SELECTOR)).toBeNull();
  await userEvent.keyboard("i");
  await waitForSelector(EMOJI_PICKER_SELECTOR);
});

test("allows explicitly disabling the minimum query length", async () => {
  await render(<ConfiguredEditor triggerCharacter=":" minQueryLength={0} />);
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

test("respects shouldOpen", async () => {
  const shouldOpen = vi.fn(() => false);
  await render(
    <ConfiguredEditor triggerCharacter=":" shouldOpen={shouldOpen} />,
  );
  await focusOnEditor();
  await userEvent.keyboard(":sm");
  expect(shouldOpen).toHaveBeenCalled();
  expect(document.querySelector(EMOJI_PICKER_SELECTOR)).toBeNull();
});
