import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  SuggestionItem,
  SuggestionMenuProseMirrorPlugin,
  SuggestionsMenuState,
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
  Item extends SuggestionItem<BSchema, I, S>,
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
> = Pick<
  SuggestionMenuProseMirrorPlugin<Item, BSchema, I, S>,
  "getItems" | "executeItem" | "closeMenu" | "clearQuery"
> &
  Pick<SuggestionsMenuState, "query"> & {
    editor: BlockNoteEditor<BSchema, any, any>;
  };

export const SuggestionMenuPositioner = <
  Item extends SuggestionItem<BSchema, I, S>,
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  suggestionsMenuName: string;
  suggestionsMenuComponent: FC<SuggestionMenuProps<Item, BSchema, I, S>>;
}) => {
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
    return props.editor.suggestionMenus[props.suggestionsMenuName].onUpdate(
      (suggestionsMenuState) => {
        setShow(suggestionsMenuState.show);
        setQuery(suggestionsMenuState.query);

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

  if (!isMounted || !query === undefined) {
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
        getItems={
          // TODO: Annoying type cast - don't think we can nicely pass the item
          //  types of all suggestion menus to BlockNoteEditor.
          props.editor.suggestionMenus[props.suggestionsMenuName]
            .getItems as any
        }
        executeItem={
          props.editor.suggestionMenus[props.suggestionsMenuName].executeItem
        }
        closeMenu={
          props.editor.suggestionMenus[props.suggestionsMenuName].closeMenu
        }
        clearQuery={
          props.editor.suggestionMenus[props.suggestionsMenuName].clearQuery
        }
      />
    </div>
  );
};
