import type { FrimousseEmojiData } from "./types.js";
import _data from "./fi.json" with { type: "json" };

export const fiFrimousseData = _data as unknown as FrimousseEmojiData;
