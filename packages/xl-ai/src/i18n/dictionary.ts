// function scramble(dict: any) {
//   const newDict: any = {} as any;

import type { BlockNoteEditor } from "@blocknote/core";
import type { en } from "./locales";

//   for (const key in dict) {
//     if (typeof dict[key] === "object") {
//       newDict[key] = scramble(dict[key]);
//     } else {
//       newDict[key] = dict[key].split("").reverse().join("");
//     }
//   }

//   return newDict;
// }

export function getAIDictionary(editor: BlockNoteEditor<any, any, any>) {
  if (!(editor.dictionary as any).ai) {
    throw new Error("AI dictionary not found");
  }
  return (editor.dictionary as any).ai as AIDictionary;
}

export type AIDictionary = typeof en;

// TODO: make placeholder work
