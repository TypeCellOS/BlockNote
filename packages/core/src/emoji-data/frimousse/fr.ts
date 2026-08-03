import type { FrimousseEmojiData } from "./types.js";
import _data from "./fr.json" with { type: "json" };

export const frFrimousseData = _data as unknown as FrimousseEmojiData;
