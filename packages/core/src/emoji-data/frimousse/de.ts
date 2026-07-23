import type { FrimousseEmojiData } from "./types.js";
import _data from "./de.json" with { type: "json" };

export const deFrimousseData = _data as unknown as FrimousseEmojiData;
