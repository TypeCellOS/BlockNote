import {
  BaseUiElementState,
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  HyperlinkToolbarProsemirrorPlugin,
  HyperlinkToolbarState,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import {
  flip,
  offset,
  useFloating,
  useTransitionStyles,
} from "@floating-ui/react";
import { FC, useEffect, useRef, useState } from "react";

import { DefaultHyperlinkToolbar } from "./DefaultHyperlinkToolbar";

export type HyperlinkToolbarProps<
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
> = Pick<
  HyperlinkToolbarProsemirrorPlugin<BSchema, I, S>,
  "editHyperlink" | "deleteHyperlink" | "startHideTimer" | "stopHideTimer"
> &
  Omit<HyperlinkToolbarState, keyof BaseUiElementState>;

export const HyperlinkToolbarPositioner = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  hyperlinkToolbar?: FC<HyperlinkToolbarProps<BSchema, I, S>>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [url, setUrl] = useState<string>();
  const [text, setText] = useState<string>();

  const referencePos = useRef<DOMRect>();

  const { refs, update, context, floatingStyles } = useFloating({
    open: show,
    placement: "top-start",
    middleware: [offset(10), flip()],
  });

  const { isMounted, styles } = useTransitionStyles(context);

  useEffect(() => {
    return props.editor.hyperlinkToolbar.on(
      "update",
      (hyperlinkToolbarState) => {
        setShow(hyperlinkToolbarState.show);
        setUrl(hyperlinkToolbarState.url);
        setText(hyperlinkToolbarState.text);

        referencePos.current = hyperlinkToolbarState.referencePos;

        update();
      }
    );
  }, [props.editor, update]);

  useEffect(() => {
    refs.setReference({
      getBoundingClientRect: () => referencePos.current!,
    });
  }, [refs]);

  if (!url || !text || !isMounted) {
    return null;
  }

  const HyperlinkToolbar = props.hyperlinkToolbar || DefaultHyperlinkToolbar;

  return (
    <div
      ref={refs.setFloating}
      style={{ ...styles, ...floatingStyles, zIndex: 4000 }}>
      <HyperlinkToolbar
        url={url}
        text={text}
        editHyperlink={props.editor.hyperlinkToolbar.editHyperlink}
        deleteHyperlink={props.editor.hyperlinkToolbar.deleteHyperlink}
        startHideTimer={props.editor.hyperlinkToolbar.startHideTimer}
        stopHideTimer={props.editor.hyperlinkToolbar.stopHideTimer}
      />
    </div>
  );
};
