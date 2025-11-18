import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  SuggestionMenuPlugin,
} from "@blocknote/core";
import {
  flip,
  offset,
  shift,
  size,
  UseFloatingOptions,
  VirtualElement,
} from "@floating-ui/react";
import { FC, useEffect, useMemo } from "react";

import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { usePlugin, usePluginState } from "../../../hooks/usePlugin.js";
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

  const suggestionMenu = usePlugin(SuggestionMenuPlugin);

  useEffect(() => {
    suggestionMenu.addTriggerCharacter(triggerCharacter);
  }, [
    props.triggerCharacter,
    suggestionMenu,
    suggestionMenu.store,
    triggerCharacter,
  ]);

  const state = usePluginState(SuggestionMenuPlugin);
  const referencePos = usePluginState(SuggestionMenuPlugin, {
    selector: (state) =>
      (state?.referencePos || new DOMRect()).toJSON() as {
        x: number;
        y: number;
        width: number;
        height: number;
        top: number;
        right: number;
        bottom: number;
        left: number;
      },
  });

  const virtualElement = useMemo<VirtualElement>(
    () => ({
      getBoundingClientRect: () => referencePos,
    }),
    [referencePos],
  );

  const floatingUIOptions = useMemo<UseFloatingOptions>(
    () => ({
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
      ...props.floatingUIOptions,
    }),
    [props.floatingUIOptions, state?.show],
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
    <GenericPopover
      reference={virtualElement}
      useFloatingOptions={floatingUIOptions}
    >
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
