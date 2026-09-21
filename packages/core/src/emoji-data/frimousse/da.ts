import type { FrimousseEmojiData } from "./types.js";
import _data from "./da.json" with { type: "json" };

export const daFrimousseData = _data as unknown as FrimousseEmojiData;
