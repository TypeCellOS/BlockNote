import type { FrimousseEmojiData } from "./types.js";
import _data from "./hi.json" with { type: "json" };

export const hiFrimousseData = _data as unknown as FrimousseEmojiData;
