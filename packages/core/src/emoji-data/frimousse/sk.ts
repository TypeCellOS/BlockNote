import type { FrimousseEmojiData } from "./types.js";
import _data from "./sk.json" with { type: "json" };

export const skFrimousseData = _data as unknown as FrimousseEmojiData;
