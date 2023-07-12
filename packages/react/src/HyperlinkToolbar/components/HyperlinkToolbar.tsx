import {
  BlockNoteEditor,
  BlockSchema,
  HyperlinkToolbarState,
  createHyperlinkToolbar,
  HyperlinkToolbarCallbacks,
  BaseUiElementState,
  BaseUiElementCallbacks,
} from "@blocknote/core";
import Tippy from "@tippyjs/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { RiExternalLinkFill, RiLinkUnlink } from "react-icons/ri";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { ToolbarButton } from "../../SharedComponents/Toolbar/components/ToolbarButton";
import { EditHyperlinkMenu } from "../EditHyperlinkMenu/components/EditHyperlinkMenu";
// import rootStyles from "../../../root.module.css";

/**
 * Main menu component for the hyperlink extension.
 * Renders a toolbar that appears on hyperlink hover.
 */
export const HyperlinkToolbarOld = (
  props: Omit<HyperlinkToolbarCallbacks, keyof BaseUiElementCallbacks> &
    Omit<HyperlinkToolbarState, keyof BaseUiElementState> & {
      isEditing: boolean;
      setIsEditing: (isEditing: boolean) => void;
    }
) => {
  if (props.isEditing) {
    return (
      <EditHyperlinkMenu
        url={props.url}
        text={props.text}
        update={(url, text) => props.editHyperlink(url, text)}
      />
    );
  }

  return (
    <Toolbar
      // TODO: This should go back in the plugin.
      onMouseDown={(event) => event.preventDefault()}
      onMouseEnter={props.stopHideTimer}
      onMouseLeave={props.startHideTimer}>
      <ToolbarButton
        mainTooltip="Edit"
        isSelected={false}
        onClick={() => props.setIsEditing(true)}>
        Edit Link
      </ToolbarButton>
      <ToolbarButton
        mainTooltip="Open in new tab"
        isSelected={false}
        onClick={() => {
          window.open(props.url, "_blank");
        }}
        icon={RiExternalLinkFill}
      />
      <ToolbarButton
        mainTooltip="Remove link"
        isSelected={false}
        onClick={props.deleteHyperlink}
        icon={RiLinkUnlink}
      />
    </Toolbar>
  );
};

export const HyperlinkToolbar = <BSchema extends BlockSchema>(props: {
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
      <HyperlinkToolbarOld
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
