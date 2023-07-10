import { useCallback, useEffect, useRef, useState } from "react";
import { EditHyperlinkMenu } from "../EditHyperlinkMenu/components/EditHyperlinkMenu";
import { Toolbar } from "../../SharedComponents/Toolbar/components/Toolbar";
import { ToolbarButton } from "../../SharedComponents/Toolbar/components/ToolbarButton";
import { RiExternalLinkFill, RiLinkUnlink } from "react-icons/ri";
import {
  BlockNoteEditor,
  BlockSchema,
  createHyperlinkToolbar,
  HyperlinkToolbarState,
} from "@blocknote/core";
import Tippy from "@tippyjs/react";
// import rootStyles from "../../../root.module.css";

export type HyperlinkToolbarProps = {
  url: string;
  text: string;
  editHyperlink: (url: string, text: string) => void;
  deleteHyperlink: () => void;
};

/**
 * Main menu component for the hyperlink extension.
 * Renders a toolbar that appears on hyperlink hover.
 */
export const HyperlinkToolbarOld = (
  props: Omit<HyperlinkToolbarState, "referencePos">
) => {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <EditHyperlinkMenu
        url={props.url}
        text={props.text}
        update={props.editHyperlink}
      />
    );
  }

  return (
    <Toolbar>
      <ToolbarButton
        mainTooltip="Edit"
        isSelected={false}
        onClick={() => setIsEditing(true)}>
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
  const [state, setState] = useState<
    Omit<HyperlinkToolbarState, "referencePos"> | undefined
  >();
  // Since we're using Tippy, we don't want to trigger re-renders when only the
  // reference position changes. So we store it in a ref instead of state.
  const referenceClientRect = useRef<DOMRect | undefined>();

  useEffect(() => {
    createHyperlinkToolbar(props.editor, ({ referencePos, ...state }) => {
      setState(state);
      referenceClientRect.current = referencePos;
    });
  }, [props.editor]);

  const getReferenceClientRect = useCallback(
    () => referenceClientRect.current!,
    [referenceClientRect]
  );

  return (
    <Tippy
      appendTo={props.editor._tiptapEditor.view.dom.parentElement!}
      // TODO: Add onMouseEnter and onMouseLeave handlers from state
      content={<HyperlinkToolbarOld {...state!} />}
      getReferenceClientRect={
        referenceClientRect.current && getReferenceClientRect
      }
      interactive={true}
      visible={state?.show || false}
      animation={"fade"}
      placement={"top-start"}
    />
  );
};
