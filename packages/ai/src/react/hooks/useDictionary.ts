import { useDictionary as useCoreDictionary } from "@blocknote/react";

import { Dictionary } from "../../core/i18n/dictionary";

export function useDictionary(): Dictionary {
  return useCoreDictionary() as Dictionary;
}
