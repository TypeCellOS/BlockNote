import type { BlockNoteEditor } from "@blocknote/core";
import type { en } from "./locales";

export function getAIDictionary(editor: BlockNoteEditor<any, any, any>) {
  if (!(editor.dictionary as any).ai) {
    throw new Error("AI dictionary not found");
  }
  return (editor.dictionary as any).ai as AIDictionary;
}

export type AIDictionary = typeof en;
