import { useEffect, useMemo, useRef, useState } from "react";
import Tippy from "@tippyjs/react";
import {
  BlockNoteEditor,
  BlockSchema,
  createHyperlinkToolbar,
  HyperlinkToolbarCallbacks,
} from "@blocknote/core";

import { DefaultHyperlinkToolbar } from "./DefaultHyperlinkToolbar";

export const HyperlinkToolbarWrapper = <BSchema extends BlockSchema>(props: {
  editor: BlockNoteEditor<BSchema>;
}) => {
  const [show, setShow] = useState<boolean>(false);
  const [url, setUrl] = useState<string>();
  const [text, setText] = useState<string>();

  const [isEditing, setIsEditing] = useState<boolean>(false);

  const referencePos = useRef<DOMRect>();
  const callbacks = useRef<HyperlinkToolbarCallbacks>();

  useEffect(() => {
    callbacks.current = createHyperlinkToolbar(
      props.editor,
      (hyperlinkToolbarState) => {
        setShow(hyperlinkToolbarState.show);
        setUrl(hyperlinkToolbarState.url);
        setText(hyperlinkToolbarState.text);

        referencePos.current = hyperlinkToolbarState.referencePos;
      }
    );

    return callbacks.current.destroy;
  }, [props.editor]);

  const getReferenceClientRect = useMemo(() => {
    if (!referencePos.current) {
      return undefined;
    }

    return () => referencePos.current!;
  }, [referencePos.current]);

  const hyperlinkToolbar = useMemo(() => {
    if (!url || !text || !callbacks.current) {
      return null;
    }

    return (
      <DefaultHyperlinkToolbar
        url={url}
        text={text}
        editHyperlink={callbacks.current.editHyperlink}
        deleteHyperlink={callbacks.current.deleteHyperlink}
        startHideTimer={callbacks.current.startHideTimer}
        stopHideTimer={callbacks.current.stopHideTimer}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
      />
    );
  }, [isEditing, text, url]);

  return (
    <Tippy
      onHidden={() => setIsEditing(false)}
      content={hyperlinkToolbar}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={show}
      animation={"fade"}
      placement={"top-start"}>
      <div />
    </Tippy>
  );
};
