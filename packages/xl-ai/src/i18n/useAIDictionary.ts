import { useBlockNoteContext } from "@blocknote/react";

import { getAIDictionary } from "./dictionary.js";

export function useAIDictionary() {
  const ctx = useBlockNoteContext();
  return getAIDictionary(ctx!.editor!);
}
