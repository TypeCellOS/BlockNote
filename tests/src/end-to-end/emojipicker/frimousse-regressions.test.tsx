import type { FormEvent } from "react";
import { expect, it, vi } from "vite-plus/test";
import { render } from "vitest-browser-react";
import FrimoussePicker from "../../../../packages/react/src/components/Comments/FrimoussePicker.js";
import { userEvent } from "../../utils/context.js";

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

it("honors a custom column count without fetching bundled data", async () => {
  const fetchSpy = vi.spyOn(globalThis, "fetch");
  try {
    await render(
      <FrimoussePicker locale="en" columns={4} onEmojiSelect={() => {}} />,
    );
    await vi.waitFor(() => {
      expect(
        document
          .querySelector("[frimousse-list]")
          ?.getAttribute("aria-colcount"),
      ).toBe("4");
      expect(
        document.querySelector('[aria-rowindex="0"]')?.children,
      ).toHaveLength(4);
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
});

it("loads a custom Emojibase URL with platform filtering", async () => {
  const baseUrl = `https://emoji.test/${crypto.randomUUID()}`;
  const onEmojiSelect = vi.fn();
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async (input) => {
      const url = new Request(input).url;
      expect(url.startsWith(`${baseUrl}/es/`)).toBe(true);
      return Response.json(
        url.endsWith("data.json")
          ? [
              {
                emoji: "💛",
                group: 0,
                version: 1,
                label: "corazón personalizado",
                tags: [],
              },
              {
                emoji: "not-a-supported-glyph",
                group: 0,
                version: 999,
                label: "unsupported",
                tags: [],
              },
            ]
          : {
              groups: [
                { order: 0, key: "smileys-emotion", message: "personalizados" },
              ],
              subgroups: [],
              skinTones: [],
            },
      );
    });
  try {
    await render(
      <FrimoussePicker
        locale="es"
        emojibaseUrl={baseUrl}
        onEmojiSelect={onEmojiSelect}
      />,
    );
    await vi.waitFor(() => {
      expect(
        fetchSpy.mock.calls.map(([input]) => new Request(input).url),
      ).toEqual([`${baseUrl}/es/data.json`, `${baseUrl}/es/messages.json`]);
      expect(visibleEmojiButtons().map((button) => button.textContent)).toEqual(
        ["💛"],
      );
    });
    await userEvent.fill(
      document.querySelector<HTMLInputElement>("[frimousse-search]")!,
      "corazón personalizado",
    );
    const button = await vi.waitFor(() => {
      const match = visibleEmojiButtons().find(
        (button) => button.textContent === "💛",
      );
      expect(match?.getAttribute("aria-label")).toBe("Corazón personalizado");
      return match!;
    });
    button.click();
    expect(onEmojiSelect).toHaveBeenCalledWith({ native: "💛" });
  } finally {
    fetchSpy.mockRestore();
  }
});
