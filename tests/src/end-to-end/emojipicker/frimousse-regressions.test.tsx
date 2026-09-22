import { EmojiPicker, type EmojiData } from "frimousse";
import type { FormEvent } from "react";
import { expect, it, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import FrimoussePicker from "../../../../packages/react/src/components/Comments/FrimoussePicker.js";

function visibleEmojiButtons(): HTMLButtonElement[] {
  return Array.from(
    document.querySelectorAll<HTMLButtonElement>("[frimousse-emoji]"),
  ).filter((button) => !button.closest("[aria-hidden]"));
}

it("does not submit a form when selecting a comment reaction", async () => {
  const onSubmit = vi.fn((event: FormEvent) => event.preventDefault());

  await render(
    <form onSubmit={onSubmit}>
      <FrimoussePicker locale="en" onEmojiSelect={() => {}} />
    </form>,
  );

  const button = await vi.waitFor(() => {
    const firstButton = visibleEmojiButtons()[0];
    expect(firstButton).toBeDefined();
    return firstButton!;
  });
  button.click();

  expect(onSubmit).not.toHaveBeenCalled();
});

it("renders duplicate localized labels without a key warning", async () => {
  const duplicateLabels: EmojiData = {
    locale: "ar",
    emojis: [
      {
        emoji: "🧑‍⚕️",
        category: 0,
        version: 12.1,
        label: "عامل صحي",
        tags: [],
      },
      {
        emoji: "👨‍⚕️",
        category: 0,
        version: 4,
        label: "عامل صحي",
        tags: [],
      },
    ],
    categories: [{ index: 0, label: "أشخاص" }],
    skinTones: {
      light: "فاتح",
      "medium-light": "متوسط فاتح",
      medium: "متوسط",
      "medium-dark": "متوسط داكن",
      dark: "داكن",
    },
  };
  // eslint-disable-next-line no-console
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

  try {
    await render(
      <EmojiPicker.Root resolveEmojiData={() => duplicateLabels}>
        <EmojiPicker.Viewport>
          <EmojiPicker.List />
        </EmojiPicker.Viewport>
      </EmojiPicker.Root>,
    );

    await vi.waitFor(() => expect(visibleEmojiButtons()).toHaveLength(2));
    expect(
      consoleError.mock.calls.some((call) =>
        call.some(
          (value) => typeof value === "string" && value.includes("same key"),
        ),
      ),
    ).toBe(false);
  } finally {
    consoleError.mockRestore();
  }
});
