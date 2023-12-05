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
} from "@blocknote/core";
import Tippy from "@tippyjs/react";
import { FC, useEffect, useMemo, useRef, useState } from "react";

import { StyleSchema } from "@blocknote/core";
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

  useEffect(() => {
    return props.editor.hyperlinkToolbar.on(
      "update",
      (hyperlinkToolbarState) => {
        setShow(hyperlinkToolbarState.show);
        setUrl(hyperlinkToolbarState.url);
        setText(hyperlinkToolbarState.text);

        referencePos.current = hyperlinkToolbarState.referencePos;
      }
    );
  }, [props.editor]);

  const getReferenceClientRect = useMemo(
    () => {
      if (!referencePos.current) {
        return undefined;
      }

      return () => referencePos.current!;
    },
    [referencePos.current] // eslint-disable-line
  );

  const hyperlinkToolbarElement = useMemo(() => {
    if (!url || !text) {
      return null;
    }

    const HyperlinkToolbar = props.hyperlinkToolbar || DefaultHyperlinkToolbar;

    return (
      <HyperlinkToolbar
        url={url}
        text={text}
        editHyperlink={props.editor.hyperlinkToolbar.editHyperlink}
        deleteHyperlink={props.editor.hyperlinkToolbar.deleteHyperlink}
        startHideTimer={props.editor.hyperlinkToolbar.startHideTimer}
        stopHideTimer={props.editor.hyperlinkToolbar.stopHideTimer}
      />
    );
  }, [props.hyperlinkToolbar, props.editor, text, url]);

  return (
    <Tippy
      appendTo={props.editor.domElement.parentElement!}
      // onHidden={() => setIsEditing(false)}
      content={hyperlinkToolbarElement}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={"fade"}
      placement={"top-start"}
      zIndex={4000}
    />
  );
};
