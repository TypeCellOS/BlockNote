import { createContext, useContext } from "react";
import { BlockNoteDefaultUIProps } from "./BlockNoteDefaultUI.js";

export type BlockNoteViewContextValue = {
  editorProps: {
    autoFocus?: boolean;
    contentEditableProps?: Record<string, any>;
  };
  defaultUIProps: BlockNoteDefaultUIProps;
};

export const BlockNoteViewContext = createContext<
  BlockNoteViewContextValue | undefined
>(undefined);

export function useBlockNoteViewContext():
  | BlockNoteViewContextValue
  | undefined {
  const context = useContext(BlockNoteViewContext) as any;

  return context;
}
