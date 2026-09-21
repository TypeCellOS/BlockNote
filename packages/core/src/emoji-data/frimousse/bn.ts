import type { FrimousseEmojiData } from "./types.js";
import _data from "./bn.json" with { type: "json" };

export const bnFrimousseData = _data as unknown as FrimousseEmojiData;
