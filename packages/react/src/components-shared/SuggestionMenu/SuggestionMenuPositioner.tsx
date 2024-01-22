import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  SuggestionMenuProseMirrorPlugin,
} from "@blocknote/core";
import {
  flip,
  offset,
  size,
  useFloating,
  useTransitionStyles,
} from "@floating-ui/react";
import { FC, useEffect, useRef, useState } from "react";

export type SuggestionMenuProps<
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = Pick<
  SuggestionMenuProseMirrorPlugin<BSchema, I, S>,
  "closeMenu" | "clearQuery"
> & {
  query: string;
  getItems: (query: string) => Promise<any[]>;
  editor: BlockNoteEditor<BSchema, any, any>;
};

export const SuggestionMenuPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  suggestionsMenuName: string;
  suggestionsMenuComponent: FC<SuggestionMenuProps<BSchema, I, S>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");

  const getItems = useRef<(query: string) => Promise<any[]>>();

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
    return props.editor.suggestionMenus.onUpdate(
      props.suggestionsMenuName,
      (suggestionsMenuState) => {
        setShow(suggestionsMenuState.show);
        setQuery(suggestionsMenuState.query);

        if (getItems.current === undefined) {
          getItems.current = suggestionsMenuState.getItems;
        }

        referencePos.current = suggestionsMenuState.referencePos;

        update();
      }
    );
  }, [props.editor, props.suggestionsMenuName, show, update]);

  useEffect(() => {
    refs.setReference({
      getBoundingClientRect: () => referencePos.current!,
    });
  }, [refs]);

  if (!isMounted) {
    return null;
  }

  const SuggestionsMenu = props.suggestionsMenuComponent;

  return (
    <div
      ref={refs.setFloating}
      style={{
        display: "flex",
        ...styles,
        ...floatingStyles,
        zIndex: 2000,
      }}>
      <SuggestionsMenu
        editor={props.editor}
        query={query}
        getItems={getItems.current!}
        closeMenu={props.editor.suggestionMenus.closeMenu}
        clearQuery={props.editor.suggestionMenus.clearQuery}
      />
    </div>
  );
};
