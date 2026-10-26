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
