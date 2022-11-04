import Tippy from "@tippyjs/react";
import { Editor } from "@tiptap/core";
import { useCallback, useState } from "react";
import {
  ToolbarButton,
  ToolbarButtonProps,
} from "../../../shared/components/toolbar/ToolbarButton";
import { EditHyperlinkMenu } from "../../Hyperlinks/menus/EditHyperlinkMenu";

type Props = ToolbarButtonProps & {
  editor: Editor;
};

/**
 * The link menu button opens a tooltip on click
 */
export const LinkToolbarButton = (props: Props) => {
  const [creationMenu, setCreationMenu] = useState<any>();

  // TODO: review code; does this pattern still make sense?
  const updateCreationMenu = useCallback(() => {
    const onSubmit = (url: string, text: string) => {
      if (url === "") {
        return;
      }
      const mark = props.editor.schema.mark("link", { href: url });
      let { from, to } = props.editor.state.selection;
      props.editor.view.dispatch(
        props.editor.view.state.tr
          .insertText(text, from, to)
          .addMark(from, from + text.length, mark)
      );
    };

    // get the currently selected text and url from the document, and use it to
    // create a new creation menu
    const { from, to } = props.editor.state.selection;
    const selectedText = props.editor.state.doc.textBetween(from, to);
    const activeUrl = props.editor.isActive("link")
      ? props.editor.getAttributes("link").href || ""
      : "";

    setCreationMenu(
      <EditHyperlinkMenu
        key={Math.random() + ""} // Math.random to prevent old element from being re-used
        url={activeUrl}
        text={selectedText}
        update={onSubmit}
      />
    );
  }, [props.editor]);

  return (
    <Tippy
      content={creationMenu}
      trigger={"click"}
      onShow={(_) => {
        updateCreationMenu();
      }}
      interactive={true}
      maxWidth={500}>
      <ToolbarButton {...props} />
    </Tippy>
  );
};

export default LinkToolbarButton;
