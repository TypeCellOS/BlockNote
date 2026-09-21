import type { FrimousseEmojiData } from "./types.js";
import _data from "./ms.json" with { type: "json" };

export const msFrimousseData = _data as unknown as FrimousseEmojiData;
