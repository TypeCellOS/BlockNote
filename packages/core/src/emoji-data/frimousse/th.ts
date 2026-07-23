import type { FrimousseEmojiData } from "./types.js";
import _data from "./th.json" with { type: "json" };

export const thFrimousseData = _data as unknown as FrimousseEmojiData;
