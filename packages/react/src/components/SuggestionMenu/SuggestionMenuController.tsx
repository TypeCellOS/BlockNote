import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  SuggestionMenuState,
  filterSuggestionItems,
} from "@blocknote/core";
import { flip, offset, size } from "@floating-ui/react";
import { FC } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import { useUIPluginState } from "../../hooks/useUIPluginState";
import { SuggestionMenuWrapper } from "./SuggestionMenuWrapper";
import { getDefaultReactSlashMenuItems } from "./getDefaultReactSlashMenuItems";
import { SuggestionMenu } from "./mantine/SuggestionMenu";
import { DefaultReactSuggestionItem, SuggestionMenuProps } from "./types";

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

type ItemType<GetItemsType extends (query: string) => Promise<any[]>> =
  ArrayElement<Awaited<ReturnType<GetItemsType>>>;

export function SuggestionMenuController<
  // This is a bit hacky, but only way I found to make types work so the optionality
  // of suggestionMenuComponent depends on the return type of getItems
  GetItemsType extends (query: string) => Promise<any[]> = (
    query: string
  ) => Promise<DefaultReactSuggestionItem[]>
>(
  props: {
    triggerCharacter: string;
    getItems?: GetItemsType;
  } & (ItemType<GetItemsType> extends DefaultReactSuggestionItem
    ? {
        // can be undefined
        suggestionMenuComponent?: FC<
          SuggestionMenuProps<ItemType<GetItemsType>>
        >;
        onItemClick?: (item: ItemType<GetItemsType>) => void;
      }
    : {
        // getItems doesn't return DefaultSuggestionItem, so suggestionMenuComponent is required
        suggestionMenuComponent: FC<
          SuggestionMenuProps<ItemType<GetItemsType>>
        >;
        onItemClick: (item: ItemType<GetItemsType>) => void;
      })
) {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const { triggerCharacter, suggestionMenuComponent } = props;

  let { onItemClick, getItems } = props;

  if (!onItemClick) {
    onItemClick = (item: ItemType<GetItemsType>) => {
      item.onItemClick(editor);
    };
  }

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

  if (!getItems) {
    getItems = (async (query: string) =>
      filterSuggestionItems(
        getDefaultReactSlashMenuItems(editor),
        query
      )) as any;
  }

  return (
    <div ref={ref} style={style}>
      <SuggestionMenuWrapper
        query={state.query}
        closeMenu={callbacks.closeMenu}
        clearQuery={callbacks.clearQuery}
        getItems={getItems!}
        suggestionMenuComponent={suggestionMenuComponent || SuggestionMenu}
        onItemClick={onItemClick}
      />
    </div>
  );
}
