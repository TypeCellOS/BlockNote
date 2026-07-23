import type { FrimousseEmojiData } from "./types.js";
import _data from "./nb.json" with { type: "json" };

export const nbFrimousseData = _data as unknown as FrimousseEmojiData;
