import { BlockSchema, InlineContentSchema, StyleSchema } from "@blocknote/core";
import {
  SuggestionMenu as SuggestionMenuExtension,
  filterSuggestionItems,
} from "@blocknote/core/extensions";
import {
  UseFloatingOptions,
  autoPlacement,
  offset,
  shift,
  size,
} from "@floating-ui/react";
import { FC, useEffect, useMemo } from "react";

import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useExtension, useExtensionState } from "../../hooks/useExtension.js";
import { FloatingUIOptions } from "../Popovers/FloatingUIOptions.js";
import { GenericPopover } from "../Popovers/GenericPopover.js";
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

  const suggestionMenu = useExtension(SuggestionMenuExtension);

  useEffect(() => {
    suggestionMenu.addTriggerCharacter(triggerCharacter);
  }, [suggestionMenu, triggerCharacter]);

  const state = useExtensionState(SuggestionMenuExtension);
  const reference = useExtensionState(SuggestionMenuExtension, {
    selector: (state) => ({
      // Use first child as the editor DOM element may itself be scrollable.
      // For FloatingUI to auto-update the position during scrolling, the
      // `contextElement` must be a descendant of the scroll container.
      element: editor.domElement?.firstChild || undefined,
      getBoundingClientRect: () => state?.referencePos || new DOMRect(),
    }),
  });

  const floatingUIOptions = useMemo<FloatingUIOptions>(
    () => ({
      useFloatingOptions: {
        open: state?.show && state?.triggerCharacter === triggerCharacter,
        onOpenChange: (open) => {
          if (!open) {
            suggestionMenu.closeMenu();
          }
        },
        placement: "bottom-start",
        middleware: [
          offset(10),
          // Flips the menu placement to maximize the space available, and prevents
          // the menu from being cut off by the confines of the screen.
          autoPlacement({
            allowedPlacements: ["bottom-start", "top-start"],
            padding: 10,
          }),
          shift(),
          size({
            apply({ elements, availableHeight }) {
              elements.floating.style.maxHeight = `${Math.max(0, availableHeight)}px`;
            },
            padding: 10,
          }),
        ],
      },
      elementProps: {
        // Prevents editor blurring when clicking the scroll bar.
        onMouseDownCapture: (event) => event.preventDefault(),
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
      suggestionMenu,
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
    <GenericPopover reference={reference} {...floatingUIOptions}>
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
