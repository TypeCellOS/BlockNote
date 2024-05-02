import { Dictionary } from "@blocknote/core";
import { useBlockNoteContext } from "../editor/BlockNoteContext";

export function useDictionary(): Dictionary {
  const ctx = useBlockNoteContext();
  return ctx!.editor!.dictionary;
}
