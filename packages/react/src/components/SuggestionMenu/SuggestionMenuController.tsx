import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  SuggestionMenuState,
  filterSuggestionItems,
} from "@blocknote/core";
import { flip, offset, size } from "@floating-ui/react";
import { FC, useCallback, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor";
import { useUIElementPositioning } from "../../hooks/useUIElementPositioning";
import { useUIPluginState } from "../../hooks/useUIPluginState";
import { SuggestionMenu } from "./SuggestionMenu";
import { SuggestionMenuWrapper } from "./SuggestionMenuWrapper";
import { getDefaultReactSlashMenuItems } from "./getDefaultReactSlashMenuItems";
import { GridSuggestionMenu } from "./GridSuggestionMenu";
import { getDefaultReactEmojiPickerItems } from "./getDefaultReactEmojiPickerItems";
import {
  DefaultReactGridSuggestionItem,
  DefaultReactSuggestionItem,
  SuggestionMenuProps,
} from "./types";

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

type ItemType<GetItemsType extends (query: string) => Promise<any[]>> =
  ArrayElement<Awaited<ReturnType<GetItemsType>>>;

// There's a lot going on with the typing here but tl;dr:
// - If Columns is undefined and the item type is DefaultReactSuggestionItem,
// `suggestionMenuComponent` and `onItemClick` are optional.
// - If Columns is a number and the item type is DefaultGridReactSuggestionItem,
// `suggestionMenuComponent` and `onItemClick` are also optional.
// - Otherwise, `suggestionMenuComponent` and `onItemClick` are required.
export function SuggestionMenuController<
  Columns extends number | undefined = undefined,
  // This is a bit hacky, but only way I found to make types work so the optionality
  // of suggestionMenuComponent depends on the return type of getItems
  GetItemsType extends (query: string) => Promise<any[]> = (
    query: string
  ) => Promise<
    Columns extends number
      ? DefaultReactGridSuggestionItem[]
      : DefaultReactSuggestionItem[]
  >
>(
  props: {
    triggerCharacter: string;
    getItems?: GetItemsType;
    columns?: Columns;
  } & (ItemType<GetItemsType> extends DefaultReactSuggestionItem
    ? Columns extends undefined
      ? {
          suggestionMenuComponent?: FC<
            SuggestionMenuProps<ItemType<GetItemsType>>
          >;
          onItemClick?: (item: ItemType<GetItemsType>) => void;
        }
      : {
          suggestionMenuComponent: FC<
            SuggestionMenuProps<ItemType<GetItemsType>>
          >;
          onItemClick: (item: ItemType<GetItemsType>) => void;
        }
    : ItemType<GetItemsType> extends DefaultReactGridSuggestionItem
    ? Columns extends number
      ? {
          suggestionMenuComponent?: FC<
            SuggestionMenuProps<ItemType<GetItemsType>>
          >;
          onItemClick?: (item: ItemType<GetItemsType>) => void;
        }
      : {
          suggestionMenuComponent: FC<
            SuggestionMenuProps<ItemType<GetItemsType>>
          >;
          onItemClick: (item: ItemType<GetItemsType>) => void;
        }
    : {
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

  const {
    triggerCharacter,
    suggestionMenuComponent,
    columns,
    onItemClick,
    getItems,
  } = props;

  const isGrid = columns !== undefined && columns > 1;

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
        isGrid
          ? await getDefaultReactEmojiPickerItems(editor, query)
          : filterSuggestionItems(
              getDefaultReactSlashMenuItems(editor),
              query
            )) as any as typeof getItems)
    );
  }, [editor, getItems, isGrid])!;

  const callbacks = {
    closeMenu: editor.suggestionMenus.closeMenu,
    clearQuery: editor.suggestionMenus.clearQuery,
  };

  const cb = useCallback(
    (callback: (state: SuggestionMenuState) => void) => {
      return editor.suggestionMenus.onUpdate(triggerCharacter, callback);
    },
    [editor.suggestionMenus, triggerCharacter]
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
              height: `${availableHeight - 10}px`,
            });
          },
        }),
      ],
      onOpenChange(open) {
        if (!open) {
          editor.suggestionMenus.closeMenu();
        }
      },
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  return (
    <div ref={ref} style={style} {...getFloatingProps()}>
      <SuggestionMenuWrapper
        query={state.query}
        closeMenu={callbacks.closeMenu}
        clearQuery={callbacks.clearQuery}
        getItems={getItemsOrDefault}
        columns={columns}
        suggestionMenuComponent={
          suggestionMenuComponent || (columns !== undefined && columns > 1)
            ? GridSuggestionMenu
            : SuggestionMenu
        }
        onItemClick={onItemClickOrDefault}
      />
    </div>
  );
}
