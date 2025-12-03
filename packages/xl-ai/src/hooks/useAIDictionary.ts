import { useBlockNoteContext } from "@blocknote/react";

import { getAIDictionary } from "../i18n/dictionary.js";

export function useAIDictionary() {
  const ctx = useBlockNoteContext();
  return getAIDictionary(ctx!.editor!);
}
