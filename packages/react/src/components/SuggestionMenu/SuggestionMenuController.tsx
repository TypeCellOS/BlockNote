import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
  SuggestionMenu as SuggestionMenuExtension,
  filterSuggestionItems,
} from "@blocknote/core";
import {
  UseFloatingOptions,
  VirtualElement,
  flip,
  offset,
  shift,
  size,
} from "@floating-ui/react";
import { FC, useEffect, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { usePlugin, usePluginState } from "../../hooks/usePlugin.js";
import { GenericPopover } from "../Popovers/GenericPopover.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { SuggestionMenu } from "./SuggestionMenu.js";
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
    minQueryLength?: number;
    floatingUIOptions?: UseFloatingOptions;
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

  const {
    triggerCharacter,
    suggestionMenuComponent,
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
        filterSuggestionItems(
          getDefaultReactSlashMenuItems(editor),
          query,
        )) as any as typeof getItems)
    );
  }, [editor, getItems])!;

  const suggestionMenu = usePlugin(SuggestionMenuExtension);

  useEffect(() => {
    suggestionMenu.addTriggerCharacter(triggerCharacter);
  }, [
    props.triggerCharacter,
    suggestionMenu,
    suggestionMenu.store,
    triggerCharacter,
  ]);

  const state = usePluginState(SuggestionMenuExtension);
  const referencePos = usePluginState(SuggestionMenuExtension, {
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
                minHeight: "300px",
              });
            },
          }),
        ],
      },
      elementProps: {
        // Prevents editor blurring when clicking the scroll bar.
        onMouseDown: (event) => event.preventDefault(),
        style: {
          zIndex: 80,
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
        <SuggestionMenuWrapper
          query={state.query}
          closeMenu={suggestionMenu.closeMenu}
          clearQuery={suggestionMenu.clearQuery}
          getItems={getItemsOrDefault}
          suggestionMenuComponent={
            suggestionMenuComponent || SuggestionMenu<ItemType<GetItemsType>>
          }
          onItemClick={onItemClickOrDefault}
        />
      )}
    </GenericPopover>
  );
}
