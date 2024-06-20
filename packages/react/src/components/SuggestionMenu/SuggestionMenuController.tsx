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
import { DefaultReactSuggestionItem, SuggestionMenuProps } from "./types";
import { MdEmojiEmotions } from "react-icons/md";

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
    isEmoji?: boolean;
    getItems?: GetItemsType;
  } & (ItemType<GetItemsType> extends DefaultReactSuggestionItem
    ? {
        // can be undefined
        suggestionMenuComponent?: FC<
          SuggestionMenuProps<ItemType<GetItemsType>>
        > | FC<any>;
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

  const { onItemClick, isEmoji, getItems } = props;

  const onItemClickOrDefault = useMemo(() => {
    return (
      onItemClick ||
      ((item: ItemType<GetItemsType>) => {
        item.onItemClick(editor);
      })
    );
  }, [editor, onItemClick]);

  const insertSlashMenuOption = (editor: any) => ({
    title: "Emoji",
    //we are simulating a : keydown event to trigger the emoji menu
    onItemClick: () => {
      const keyboardEvent = new KeyboardEvent('keydown', {
        key: ':',          // key identifier (DOMString), optional
        code: 'Colon',     // key code identifier (DOMString), optional
        keyCode: 186,      // key code value (unsigned long), optional
        which: 186,        // legacy keyCode, optional
        charCode: 0,       // character code value (unsigned long), optional
        bubbles: false,    // bubbles flag (boolean), optional
        cancelable: false, // cancelable flag (boolean), optional
        composed: false,   // composed flag (boolean), optional
        ctrlKey: false,    // control key flag (boolean), optional
        altKey: false,     // alt key flag (boolean), optional
        shiftKey: false,   // shift key flag (boolean), optional
        metaKey: false     // meta key flag (boolean), optional
      });
      editor.domElement.dispatchEvent(keyboardEvent);
    },
    aliases: [
      "emoji",
      "emote",
      "face",
    ],
    group: "Other",
    icon: <MdEmojiEmotions />,
  });

  const getItemsOrDefault = useMemo(() => {
    return (
      getItems ||
      ((async (query: string) =>
        filterSuggestionItems(
          //STEP 6: SHOW THE EMOJI OPTION IN THE SLASH MENU
          [...getDefaultReactSlashMenuItems(editor), insertSlashMenuOption(editor)],
          query
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
        isEmoji={isEmoji || false}
        getItems={getItemsOrDefault}
        suggestionMenuComponent={suggestionMenuComponent || SuggestionMenu}
        onItemClick={onItemClickOrDefault}
      />
    </div>
  );
}
