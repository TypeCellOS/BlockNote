import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  SuggestionMenuState,
} from "@blocknote/core";
import { flip, offset, size } from "@floating-ui/react";
import { FC } from "react";

import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import { useUIPluginState } from "../../hooks/useUIPluginState";
import { DefaultSuggestionMenu } from "./DefaultSuggestionMenu";
import { MantineSuggestionMenu } from "./mantine/MantineSuggestionMenu";
import { DefaultSuggestionItem, SuggestionMenuProps } from "./types";
import { useBlockNoteEditor } from "../../editor/BlockNoteContext";

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

type ItemType<GetItemsType extends (query: string) => Promise<any[]>> =
  ArrayElement<Awaited<ReturnType<GetItemsType>>>;

export function DefaultPositionedSuggestionMenu<
  // This is a bit hacky, but only way I found to make types work so the optionality
  // of suggestionMenuComponent depends on the return type of getItems
  GetItemsType extends (query: string) => Promise<any[]>
>(
  props: {
    triggerCharacter: string;
    getItems: GetItemsType;
    onItemClick?: (item: ItemType<GetItemsType>) => void;
  } & (ItemType<GetItemsType> extends DefaultSuggestionItem
    ? {
        // can be undefined
        suggestionMenuComponent?: FC<
          SuggestionMenuProps<ItemType<GetItemsType>>
        >;
      }
    : {
        // getItems doesn't return DefaultSuggestionItem, so suggestionMenuComponent is required
        suggestionMenuComponent: FC<
          SuggestionMenuProps<ItemType<GetItemsType>>
        >;
      })
) {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const { triggerCharacter, onItemClick, getItems, suggestionMenuComponent } =
    props;

  const callbacks = {
    closeMenu: editor.suggestionMenus.closeMenu,
    clearQuery: editor.suggestionMenus.clearQuery,
  };

  const state = useUIPluginState(
    (callback: (state: SuggestionMenuState) => void) =>
      editor.suggestionMenus.onUpdate.bind(editor.suggestionMenus)(
        triggerCharacter,
        callback
      )
  );
  const { isMounted, ref, style } = useUIElementPositioning(
    state?.show || false,
    state?.referencePos || null,
    2000,
    {
      placement: "bottom-start",
      middleware: [
        offset(10),
        // Flips the menu placement to maximize the space available, and prevents
        // the menu from being cut off by the confines of the screen.
        flip(),
        size({
          apply({ availableHeight, elements }) {
            Object.assign(elements.floating.style, {
              maxHeight: `${availableHeight - 10}px`,
            });
          },
        }),
      ],
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  const { show, referencePos, ...data } = state;

  return (
    <div ref={ref} style={style}>
      <DefaultSuggestionMenu
        getItems={getItems}
        suggestionMenuComponent={
          suggestionMenuComponent || MantineSuggestionMenu
        }
        onItemClick={onItemClick}
        {...data}
        {...callbacks}
      />
    </div>
  );
}
