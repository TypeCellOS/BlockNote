import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import {
  SuggestionMenuOptions,
  filterSuggestionItems,
} from "@blocknote/core/extensions";
import { FC, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { SuggestionMenu } from "./SuggestionMenu.js";
import { SuggestionMenuPopover } from "./SuggestionMenuPopover.js";
import { SuggestionMenuWrapper } from "./SuggestionMenuWrapper.js";
import { getDefaultReactSlashMenuItems } from "./getDefaultReactSlashMenuItems.js";
import { DefaultReactSuggestionItem, SuggestionMenuProps } from "./types.js";

type ArrayElement<A> = A extends readonly (infer T)[] ? T : never;

type ItemType<GetItemsType extends (query: string) => Promise<any[]>> =
  ArrayElement<Awaited<ReturnType<GetItemsType>>>;

export function SuggestionMenuController<
  // This is a bit hacky, but only way I found to make types work so the optionality
  // of suggestionMenuComponent depends on the return type of getItems
  GetItemsType extends (query: string) => Promise<any[]> = (
    query: string,
  ) => Promise<DefaultReactSuggestionItem[]>,
>(
  props: {
    triggerCharacter: string;
    getItems?: GetItemsType;
    shouldOpen?: SuggestionMenuOptions["shouldOpen"];
    minQueryLength?: number;
    floatingUIOptions?: FloatingUIOptions;
    /**
     * Override the DOM node this floating element portals into. Falls back to
     * the ambient portal target (the element wrapping the editor by default)
     * when omitted.
     */
    portalElement?: HTMLElement;
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
      }),
) {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >();

  const { triggerCharacter, suggestionMenuComponent, onItemClick, getItems } =
    props;

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
        filterSuggestionItems(
          getDefaultReactSlashMenuItems(editor),
          query,
        )) as any as typeof getItems)
    );
  }, [editor, getItems])!;

  return (
    <SuggestionMenuPopover {...props}>
      {(menuProps) =>
        triggerCharacter && (
          <SuggestionMenuWrapper
            {...menuProps}
            getItems={getItemsOrDefault}
            suggestionMenuComponent={
              suggestionMenuComponent || SuggestionMenu<ItemType<GetItemsType>>
            }
            onItemClick={onItemClickOrDefault}
          />
        )
      }
    </SuggestionMenuPopover>
  );
}
