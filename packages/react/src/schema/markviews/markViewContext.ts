import type { Mark } from "prosemirror-model";
import type { EditorView, MarkViewConstructor } from "prosemirror-view";
import { createContext, useContext } from "react";
import type { ReactMarkViewUserOptions } from "./ReactMarkViewOptions.js";

export type MarkViewContentRef = (node: HTMLElement | null) => void;

export interface MarkViewContext {
  // won't change
  contentRef: MarkViewContentRef;
  view: EditorView;
  mark: Mark;
}

export const markViewContext = createContext<MarkViewContext>({
  contentRef: () => {
    // nothing to do
  },
  view: null as never,
  mark: null as never,
});

export const useMarkViewContext = () => useContext(markViewContext);

export const createMarkViewContext = createContext<
  (options: ReactMarkViewUserOptions) => MarkViewConstructor
>((_options) => {
  throw new Error(
    "No ProsemirrorAdapterProvider detected, maybe you need to wrap the component with the Editor with ProsemirrorAdapterProvider?",
  );
});

export const useMarkViewFactory = () => useContext(createMarkViewContext);
