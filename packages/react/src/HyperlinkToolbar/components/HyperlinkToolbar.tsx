import {
  BlockNoteEditor,
  BlockSchema,
  HyperlinkToolbarState,
  createHyperlinkToolbar,
} from "@blocknote/core";
import Tippy from "@tippyjs/react";
import { useEffect, useMemo, useState } from "react";
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
  const [state, setState] = useState<HyperlinkToolbarState>();

  useEffect(() => {
    return createHyperlinkToolbar(props.editor, ({ ...state }) => {
      setState(state);
    });
  }, [props.editor]);

  const getReferenceClientRect = useMemo(() => {
    // TODO: test and remove
    console.log("new reference pos for HYPERLINKTOOLBAR");
    if (!state?.referencePos) {
      return undefined;
    }
    return () => state.referencePos;
  }, [state?.referencePos]);

  return (
    <Tippy
      // TODO: Add onMouseEnter and onMouseLeave handlers from state
      content={<HyperlinkToolbarOld {...state!} />}
      getReferenceClientRect={getReferenceClientRect}
      interactive={true}
      visible={state?.show || false}
      animation={"fade"}
      placement={"top-start"}>
      <div />
    </Tippy>
  );
};
