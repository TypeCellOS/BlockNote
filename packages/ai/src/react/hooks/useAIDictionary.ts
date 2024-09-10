import { useBlockNoteContext } from "@blocknote/react";

import { getAIDictionary } from "../../core/i18n/dictionary";

export function useAIDictionary() {
  const ctx = useBlockNoteContext();
  return getAIDictionary(ctx!.editor!);
}
