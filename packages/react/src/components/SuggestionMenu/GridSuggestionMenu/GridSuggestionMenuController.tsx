import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  SuggestionMenuState,
} from "@blocknote/core";
import { flip, offset, size, UseFloatingOptions } from "@floating-ui/react";
import { FC, useCallback, useMemo } from "react";

import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useUIElementPositioning } from "../../../hooks/useUIElementPositioning.js";
import { useUIPluginState } from "../../../hooks/useUIPluginState.js";
import { getDefaultReactEmojiPickerItems } from "./getDefaultReactEmojiPickerItems.js";
import { GridSuggestionMenu } from "./GridSuggestionMenu.js";
import { GridSuggestionMenuWrapper } from "./GridSuggestionMenuWrapper.js";
import {
  DefaultReactGridSuggestionItem,
  GridSuggestionMenuProps,
} from "./types.js";

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

type ItemType<GetItemsType extends (query: string) => Promise<any[]>> =
  ArrayElement<Awaited<ReturnType<GetItemsType>>>;

export function GridSuggestionMenuController<
  // This is a bit hacky, but only way I found to make types work so the optionality
  // of suggestionMenuComponent depends on the return type of getItems
  GetItemsType extends (query: string) => Promise<any[]> = (
    query: string,
  ) => Promise<DefaultReactGridSuggestionItem[]>,
>(
  props: {
    triggerCharacter: string;
    getItems?: GetItemsType;
    columns: number;
    minQueryLength?: number;
    floatingOptions?: Partial<UseFloatingOptions>;
  } & (ItemType<GetItemsType> extends DefaultReactGridSuggestionItem
    ? {
        // can be undefined
        gridSuggestionMenuComponent?: FC<
          GridSuggestionMenuProps<ItemType<GetItemsType>>
        >;
        onItemClick?: (item: ItemType<GetItemsType>) => void;
      }
    : {
        // getItems doesn't return DefaultSuggestionItem, so suggestionMenuComponent is required
        gridSuggestionMenuComponent: FC<
          GridSuggestionMenuProps<ItemType<GetItemsType>>
        >;
        onItemClick: (item: ItemType<GetItemsType>) => void;
      }),
) {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const {
    triggerCharacter,
    gridSuggestionMenuComponent,
    columns,
    minQueryLength,
    onItemClick,
    getItems,
    floatingOptions,
  } = props;

  const onItemClickOrDefault = useMemo(() => {
    return (
      onItemClick ||
      ((item: ItemType<GetItemsType>) => {
        item.onItemClick(editor);
      })
    );
  }, [editor, onItemClick]);

  const getItemsOrDefault = useMemo(() => {
    return (
      getItems ||
      ((async (query: string) =>
        await getDefaultReactEmojiPickerItems(
          editor,
          query,
        )) as any as typeof getItems)
    );
  }, [editor, getItems])!;

  const callbacks = {
    closeMenu: editor.suggestionMenus.closeMenu,
    clearQuery: editor.suggestionMenus.clearQuery,
  };

  const cb = useCallback(
    (callback: (state: SuggestionMenuState) => void) => {
      return editor.suggestionMenus.onUpdate(triggerCharacter, callback);
    },
    [editor.suggestionMenus, triggerCharacter],
  );

  const state = useUIPluginState(cb);

  const { isMounted, ref, style, getFloatingProps } = useUIElementPositioning(
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
      onOpenChange(open) {
        if (!open) {
          editor.suggestionMenus.closeMenu();
        }
      },
      ...floatingOptions,
    },
  );

  if (
    !isMounted ||
    !state ||
    (!state?.ignoreQueryLength &&
      minQueryLength &&
      (state.query.startsWith(" ") || state.query.length < minQueryLength))
  ) {
    return null;
  }

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <GridSuggestionMenuWrapper
        query={state.query}
        closeMenu={callbacks.closeMenu}
        clearQuery={callbacks.clearQuery}
        getItems={getItemsOrDefault}
        columns={columns}
        gridSuggestionMenuComponent={
          gridSuggestionMenuComponent ||
          GridSuggestionMenu<ItemType<GetItemsType>>
        }
        onItemClick={onItemClickOrDefault}
      />
    </div>
  );
}
