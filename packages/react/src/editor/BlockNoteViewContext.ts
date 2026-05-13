import { createContext, useContext } from "react";
import { BlockNoteDefaultUIProps } from "./BlockNoteDefaultUI.js";

export type BlockNoteViewContextValue = {
  editorProps: {
    autoFocus?: boolean;
    contentEditableProps?: Record<string, any>;
    editable?: boolean;
    /**
     * Resolved portal target for `editor.portalElement` — passed to
     * `editor.mount()`. Comes from `portalElements.default` on
     * `BlockNoteView`. `undefined` lets `mount()` use its default
     * (`element.parentElement`, i.e. `bn-container`).
     */
    portalTarget?: HTMLElement | null;
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
