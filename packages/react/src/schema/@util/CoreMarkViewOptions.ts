import { BlockNoteEditor } from "@blocknote/core";
import type { Mark } from "prosemirror-model";
import type { EditorView, ViewMutationRecord } from "prosemirror-view";

export type MarkViewDOMSpec =
  | string
  | HTMLElement
  | ((mark: Mark) => HTMLElement);

export interface CoreMarkViewUserOptions<Component> {
  // DOM
  as?: MarkViewDOMSpec;
  contentAs?: MarkViewDOMSpec;

  // Component
  component: Component;

  // Overrides
  ignoreMutation?: (mutation: ViewMutationRecord) => boolean | void;
  destroy?: () => void;
}

export interface CoreMarkViewSpec<Component> {
  mark: Mark;
  view: EditorView;
  inline: boolean;

  options: CoreMarkViewUserOptions<Component>;

  // BlockNote specific
  editor: BlockNoteEditor<any, any, any>;
}
