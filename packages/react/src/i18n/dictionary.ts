import { Dictionary } from "@blocknote/core";
import { createContext, useContext } from "react";

export const DictionaryContext = createContext<Dictionary | undefined>(
  undefined
);

export function useDictionaryContext(): Dictionary {
  return useContext(DictionaryContext)!;
}
