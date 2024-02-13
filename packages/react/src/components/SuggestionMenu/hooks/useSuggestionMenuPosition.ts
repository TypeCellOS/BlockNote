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

export function useSuggestionMenuPosition<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(editor: BlockNoteEditor<BSchema, I, S>, triggerCharacter: string) {
  const [show, setShow] = useState<boolean>(false);

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
    return editor.suggestionMenus.onPositionUpdate(
      triggerCharacter,
      (position) => {
        setShow(position.show);
        referencePos.current = position.referencePos;
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
    ref: refs.setFloating,
    style: {
      display: "flex",
      ...styles,
      ...floatingStyles,
      zIndex: 2000,
    },
  };
}
