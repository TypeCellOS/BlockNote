import type { FrimousseEmojiData } from "./types.js";
import _data from "./es.json" with { type: "json" };

export const esFrimousseData = _data as unknown as FrimousseEmojiData;
