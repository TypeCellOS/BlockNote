import type { FrimousseEmojiData } from "./types.js";
import _data from "./en.json" with { type: "json" };

export const enFrimousseData = _data as unknown as FrimousseEmojiData;
