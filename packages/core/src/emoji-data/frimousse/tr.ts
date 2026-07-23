import type { FrimousseEmojiData } from "./types.js";
import _data from "./tr.json" with { type: "json" };

export const trFrimousseData = _data as unknown as FrimousseEmojiData;
