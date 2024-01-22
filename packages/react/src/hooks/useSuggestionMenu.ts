import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  flip,
  offset,
  size,
  useFloating,
  useTransitionStyles,
} from "@floating-ui/react";
import { useEffect, useRef, useState } from "react";

// TODO: maybe separate the positioning part (floating ui)
export function useSuggestionMenu<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>, triggerCharacter: string) {
  const [show, setShow] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");

  const referencePos = useRef<DOMRect>();

  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
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
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    return editor.suggestionMenus.onUpdate(
      triggerCharacter,
      (suggestionsMenuState) => {
        setShow(suggestionsMenuState.show);
        setQuery(suggestionsMenuState.query);

        referencePos.current = suggestionsMenuState.referencePos;

        update();
      }
    );
  }, [editor.suggestionMenus, triggerCharacter, show, update]);

  useEffect(() => {
    refs.setReference({
      getBoundingClientRect: () => referencePos.current!,
    });
  }, [refs]);

  return {
    isMounted: isMounted,
    suggestionMenuProps: {
      query,
      closeMenu: editor.suggestionMenus.closeMenu,
      clearQuery: editor.suggestionMenus.clearQuery,
    },
    positionerProps: {
      ref: refs.setFloating,
      styles: {
        display: "flex",
        ...styles,
        ...floatingStyles,
        zIndex: 2000,
      },
    },
  };
}
