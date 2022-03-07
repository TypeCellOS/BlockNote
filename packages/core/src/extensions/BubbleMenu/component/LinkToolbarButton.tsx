import Tippy from "@tippyjs/react";
import { Editor } from "@tiptap/core";
import React, { useCallback, useState } from "react";
import {
  SimpleToolbarButton,
  SimpleToolbarButtonProps,
} from "../../../shared/components/toolbar/SimpleToolbarButton";
import { HyperlinkEditMenu } from "../../Hyperlinks/menus/HyperlinkEditMenu";

type Props = SimpleToolbarButtonProps & {
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
      <HyperlinkEditMenu
        key={Math.random() + ""} // Math.random to prevent old element from being re-used
        url={activeUrl}
        text={selectedText}
        onSubmit={onSubmit}
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
      <SimpleToolbarButton {...props} />
    </Tippy>
  );
};

export default LinkToolbarButton;
