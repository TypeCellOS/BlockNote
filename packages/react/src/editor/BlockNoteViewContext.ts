import { createContext, CSSProperties, useContext } from "react";
import { BlockNoteDefaultUIProps } from "./BlockNoteDefaultUI.js";

/**
 * Attributes a UI-library wrapper needs on every themed BlockNote root
 * element, beyond what the base layer applies: its color-scheme data
 * attributes and any theme CSS variables. Passed to `BlockNoteViewRaw` via the
 * `themedRootProps` prop; the base layer merges them into
 * {@link BlockNoteViewContextValue.portalRootProps} without knowing which
 * attributes each library uses.
 */
export type ThemedRootProps = {
  /** Intended for theme CSS variables (custom properties). */
  style?: CSSProperties;
} & {
  [attribute: `data-${string}`]: string | undefined;
};

export type BlockNoteViewContextValue = {
  editorProps: {
    autoFocus?: boolean;
    contentEditableProps?: Record<string, any>;
    editable?: boolean;
  };
  defaultUIProps: BlockNoteDefaultUIProps;
  /**
   * Props that turn an element into a themed `.bn-root`: the classes and
   * color-scheme attribute existing CSS keys off, plus the UI-library extras
   * from {@link ThemedRootProps}. Rendered on the editor container and used
   * by `EditorPortalProvider` to theme the portal roots it creates — all from the
   * same data.
   */
  portalRootProps: ThemedRootProps & {
    className: string;
    "data-color-scheme": "light" | "dark";
  };
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
