import type { FrimousseEmojiData } from "./types.js";
import _data from "./pl.json" with { type: "json" };

export const plFrimousseData = _data as unknown as FrimousseEmojiData;
