import { createContext, useContext, useState } from "react";

type BlockNotePropsContextValue = {
  props: ReturnType<typeof useState<Record<string, any>>>[0];
  setProps: ReturnType<typeof useState<Record<string, any>>>[1];
};

export const BlockNotePropsContext = createContext<
  BlockNotePropsContextValue | undefined
>(undefined);

export function useBlockNotePropsContext():
  | BlockNotePropsContextValue
  | undefined {
  const context = useContext(BlockNotePropsContext) as any;

  return context;
}
