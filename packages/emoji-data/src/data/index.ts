export type {
  Emoji,
  EmojiCategory,
  EmojiMartData,
  EmojiSkin,
} from "./types.js";
import _emojiData from "./emojiData.json" with { type: "json" };
import type { EmojiMartData } from "./types.js";

export const emojiData: EmojiMartData = _emojiData as EmojiMartData;
