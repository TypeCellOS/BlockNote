import { FC } from "react";
import {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";

import { useSuggestionMenuPosition } from "./hooks/useSuggestionMenuPosition";
import { DefaultSuggestionMenu } from "./DefaultSuggestionMenu";
import { SuggestionMenuComponentProps } from "./MantineDefaults/MantineSuggestionMenu";
import { SuggestionMenuItemProps } from "./MantineDefaults/MantineSuggestionMenuItem";

export function DefaultPositionedSuggestionMenu<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  Item extends {
    name: string;
    execute: () => void;
  } = SuggestionMenuItemProps
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  triggerCharacter?: string;
  getItems?: (
    query: string,
    closeMenu: () => void,
    clearQuery: () => void
  ) => Promise<Item[]>;
  suggestionMenuComponent?: FC<SuggestionMenuComponentProps<Item>>;
}) {
  const { editor, triggerCharacter, getItems, suggestionMenuComponent } = props;

  const { isMounted, ref, style } = useSuggestionMenuPosition(
    editor,
    triggerCharacter || "/"
  );

  if (!isMounted) {
    return null;
  }

  return (
    <div ref={ref} style={style}>
      <DefaultSuggestionMenu
        editor={editor}
        getItems={getItems}
        suggestionMenuComponent={suggestionMenuComponent}
      />
    </div>
  );
}
