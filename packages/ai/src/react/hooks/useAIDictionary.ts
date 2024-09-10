import { useDictionary } from "@blocknote/react";

import { Dictionary } from "../../core/i18n/dictionary";

export function useAIDictionary(): Dictionary {
  return useDictionary() as unknown as Dictionary;
}
