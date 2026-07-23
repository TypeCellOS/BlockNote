import type { FrimousseEmojiData } from "./types.js";
import _data from "./nl.json" with { type: "json" };

export const nlFrimousseData = _data as unknown as FrimousseEmojiData;
