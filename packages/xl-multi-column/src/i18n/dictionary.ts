// function scramble(dict: any) {
//   const newDict: any = {} as any;

import type { en } from "./locales/index.js";
import { BlockNoteEditor } from "@blocknote/core";

//   for (const key in dict) {
//     if (typeof dict[key] === "object") {
//       newDict[key] = scramble(dict[key]);
//     } else {
//       newDict[key] = dict[key].split("").reverse().join("");
//     }
//   }

//   return newDict;
// }

export function getMultiColumnDictionary(
  editor: BlockNoteEditor<any, any, any>
) {
  if (!(editor.dictionary as any).multi_column) {
    throw new Error("Multi-column dictionary not found");
  }
  return (editor.dictionary as any).multi_column as MultiColumnDictionary;
}

export type MultiColumnDictionary = typeof en;
