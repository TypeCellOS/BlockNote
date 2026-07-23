import type { FrimousseEmojiData } from "./types.js";
import _data from "./et.json" with { type: "json" };

export const etFrimousseData = _data as unknown as FrimousseEmojiData;
