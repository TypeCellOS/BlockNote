import { FC, useEffect, useMemo, useRef, useState } from "react";
import Tippy from "@tippyjs/react";
import {
  BaseUiElementCallbacks,
  BaseUiElementState,
  BlockNoteEditor,
  BlockSchema,
  HyperlinkToolbarCallbacks,
  HyperlinkToolbarState,
} from "@blocknote/core";

import { DefaultHyperlinkToolbar } from "./DefaultHyperlinkToolbar";

export type HyperlinkToolbarProps = Omit<
  HyperlinkToolbarCallbacks,
  keyof BaseUiElementCallbacks
> &
  Omit<HyperlinkToolbarState, keyof BaseUiElementState>;

export const HyperlinkToolbarPositioner = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
  hyperlinkToolbar?: FC<HyperlinkToolbarProps>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [url, setUrl] = useState<string>();
  const [text, setText] = useState<string>();

  const referencePos = useRef<DOMRect>();
  const callbacks = useRef<HyperlinkToolbarCallbacks>();

  useEffect(() => {
    callbacks.current = props.editor.createHyperlinkToolbar(
      (hyperlinkToolbarState) => {
        setShow(hyperlinkToolbarState.show);
        setUrl(hyperlinkToolbarState.url);
        setText(hyperlinkToolbarState.text);

        referencePos.current = hyperlinkToolbarState.referencePos;
      }
    );

    return callbacks.current.destroy;
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
    if (!url || !text || !callbacks.current) {
      return null;
    }

    const HyperlinkToolbar = props.hyperlinkToolbar || DefaultHyperlinkToolbar;

    return (
      <HyperlinkToolbar
        url={url}
        text={text}
        editHyperlink={callbacks.current.editHyperlink}
        deleteHyperlink={callbacks.current.deleteHyperlink}
        startHideTimer={callbacks.current.startHideTimer}
        stopHideTimer={callbacks.current.stopHideTimer}
      />
    );
  }, [props.hyperlinkToolbar, text, url]);

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
    />
  );
};
