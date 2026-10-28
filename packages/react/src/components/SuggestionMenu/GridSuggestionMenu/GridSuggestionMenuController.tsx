import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { SuggestionMenuOptions } from "@blocknote/core/extensions";
import { FC, useMemo } from "react";

import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "../../Popovers/FloatingUIOptions.js";
import { SuggestionMenuPopover } from "../SuggestionMenuPopover.js";
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
    shouldOpen?: SuggestionMenuOptions["shouldOpen"];
    minQueryLength?: number;
    floatingUIOptions?: FloatingUIOptions;
    /**
     * Override the DOM node this floating element portals into. Falls back to
     * the ambient portal target (the element wrapping the editor by default)
     * when omitted.
     */
    portalElement?: HTMLElement;
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
    onItemClick,
    getItems,
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

  return (
    <SuggestionMenuPopover {...props} zIndex={70}>
      {(menuProps) =>
        triggerCharacter && (
          <GridSuggestionMenuWrapper
            {...menuProps}
            getItems={getItemsOrDefault}
            columns={columns}
            gridSuggestionMenuComponent={
              gridSuggestionMenuComponent ||
              GridSuggestionMenu<ItemType<GetItemsType>>
            }
            onItemClick={onItemClickOrDefault}
          />
        )
      }
    </SuggestionMenuPopover>
  );
}
