// function scramble(dict: any) {
//   const newDict: any = {} as any;

import type { en } from "./locales/index.js";

//   for (const key in dict) {
//     if (typeof dict[key] === "object") {
//       newDict[key] = scramble(dict[key]);
//     } else {
//       newDict[key] = dict[key].split("").reverse().join("");
//     }
//   }

//   return newDict;
// }

export type Dictionary = typeof en;
