import { createContext, useContext } from "react";
import { BlockNoteDefaultUIProps } from "./BlockNoteDefaultUI.js";

export type BlockNoteViewContextValue = {
  editorProps: {
    autoFocus?: boolean;
    contentEditableProps?: Record<string, any>;
    editable?: boolean;
  };
  defaultUIProps: BlockNoteDefaultUIProps;
  /**
   * Makes `element` a themed BlockNote root: the classes and color-scheme
   * attribute the stylesheet keys off, plus whatever the UI library adds (its
   * own color-scheme attribute, theme CSS variables).
   *
   * Applied imperatively because it is used for the portal roots BlockNote
   * mounts outside React's DOM tree, which cannot be themed with props (see
   * `PortalElementOverride`). The editor container is themed by rendering the
   * same values as props instead.
   */
  applyThemedRoot: (element: HTMLElement) => void;
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
