import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import { SuggestionMenu } from "@blocknote/core/extensions";
import { flip, offset, shift, size, VirtualElement } from "@floating-ui/react";
import { FC, useEffect, useMemo } from "react";

import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import {
  useExtension,
  useExtensionState,
} from "../../../hooks/useExtension.js";
import { FloatingUIOptions } from "../../Popovers/FloatingUIOptions.js";
import { GenericPopover } from "../../Popovers/GenericPopover.js";
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
    floatingUIOptions?: FloatingUIOptions;
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

  const suggestionMenu = useExtension(SuggestionMenu);

  useEffect(() => {
    suggestionMenu.addTriggerCharacter(triggerCharacter);
  }, [
    props.triggerCharacter,
    suggestionMenu,
    suggestionMenu.store,
    triggerCharacter,
  ]);

  const state = useExtensionState(SuggestionMenu);
  const referencePos = useExtensionState(SuggestionMenu, {
    selector: (state) => state?.referencePos || new DOMRect(),
  });

  const virtualElement = useMemo<VirtualElement>(
    () => ({
      getBoundingClientRect: () => referencePos,
    }),
    [referencePos],
  );

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open: state?.show && state?.triggerCharacter === triggerCharacter,
        placement: "bottom-start",
        middleware: [
          offset(10),
          // Flips the menu placement to maximize the space available, and prevents
          // the menu from being cut off by the confines of the screen.
          flip({
            mainAxis: true,
            crossAxis: false,
          }),
          shift(),
          size({
            apply({ availableHeight, elements }) {
              Object.assign(elements.floating.style, {
                maxHeight: `${availableHeight - 10}px`,
              });
            },
          }),
        ],
      },
      elementProps: {
        // Prevents editor blurring when clicking the scroll bar.
        onMouseDown: (event) => event.preventDefault(),
        style: {
          zIndex: 70,
        },
      },
      ...props.floatingUIOptions,
    }),
    [
      props.floatingUIOptions,
      state?.show,
      state?.triggerCharacter,
      triggerCharacter,
    ],
  );

  if (
    !state ||
    (!state.ignoreQueryLength &&
      minQueryLength &&
      (state.query.startsWith(" ") || state.query.length < minQueryLength))
  ) {
    return null;
  }

  return (
    <GenericPopover reference={virtualElement} {...floatingUIOptions}>
      {triggerCharacter && (
        <GridSuggestionMenuWrapper
          query={state.query}
          closeMenu={suggestionMenu.closeMenu}
          clearQuery={suggestionMenu.clearQuery}
          getItems={getItemsOrDefault}
          columns={columns}
          gridSuggestionMenuComponent={
            gridSuggestionMenuComponent ||
            GridSuggestionMenu<ItemType<GetItemsType>>
          }
          onItemClick={onItemClickOrDefault}
        />
      )}
    </GenericPopover>
  );
}
