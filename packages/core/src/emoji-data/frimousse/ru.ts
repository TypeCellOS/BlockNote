import type { FrimousseEmojiData } from "./types.js";
import _data from "./ru.json" with { type: "json" };

export const ruFrimousseData = _data as unknown as FrimousseEmojiData;
