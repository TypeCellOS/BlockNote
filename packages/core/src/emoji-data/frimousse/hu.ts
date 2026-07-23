import type { FrimousseEmojiData } from "./types.js";
import _data from "./hu.json" with { type: "json" };

export const huFrimousseData = _data as unknown as FrimousseEmojiData;
