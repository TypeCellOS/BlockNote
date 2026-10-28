// @vitest-environment node
import { expect, it, vi } from "vite-plus/test";

import type { FrimousseEmojiData } from "../../emoji-data/frimousse/types.js";
import { BlockNoteEditor } from "../../editor/BlockNoteEditor.js";
import { loadFrimousseData } from "../../emoji-data/index.js";
import { getDefaultEmojiPickerItems } from "./getDefaultEmojiPickerItems.js";

vi.mock("../../emoji-data/index.js", async () => ({
  loadFrimousseData: vi.fn(),
  ...(await import("../../emoji-data/searchEmojis.js")),
}));

it("retries emoji data after a failed load for the same editor locale", async () => {
  const data: FrimousseEmojiData = {
    locale: "en",
    emojis: [
      {
        emoji: "😀",
        category: 0,
        version: 1,
        label: "Grinning face",
        tags: [],
      },
    ],
    categories: [],
    skinTones: {
      light: "Light",
      "medium-light": "Medium light",
      medium: "Medium",
      "medium-dark": "Medium dark",
      dark: "Dark",
    },
  };
  const failure = new Error("Chunk load failed");
  vi.mocked(loadFrimousseData)
    .mockRejectedValueOnce(failure)
    .mockResolvedValueOnce(data);
  const editor = BlockNoteEditor.create();
  try {
    await expect(getDefaultEmojiPickerItems(editor, "")).rejects.toBe(failure);
    await expect(getDefaultEmojiPickerItems(editor, "")).resolves.toEqual([
      { id: "😀", onItemClick: expect.any(Function) },
    ]);
    expect(loadFrimousseData).toHaveBeenCalledTimes(2);
  } finally {
    editor._tiptapEditor.destroy();
  }
});
