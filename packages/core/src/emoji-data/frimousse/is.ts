import type { FrimousseEmojiData } from "./types.js";
import _data from "./is.json" with { type: "json" };

export const isFrimousseData = _data as unknown as FrimousseEmojiData;
