import { Comments, FormattingToolbar } from "@blocknote/core/extensions";
import { useCallback } from "react";
import { RiChat3Line } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useDictionary } from "../../../i18n/dictionary.js";
import { useExtension } from "../../../hooks/useExtension.js";

export const AddCommentButtonInner = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const comments = useExtension(Comments);
  const { store } = useExtension(FormattingToolbar);

  const onClick = useCallback(() => {
    comments.startPendingComment();
    store.setState({ show: false });
  }, [comments, store]);

  return (
    <Components.FormattingToolbar.Button
      className={"bn-button"}
      label={dict.formatting_toolbar.comment.tooltip}
      mainTooltip={dict.formatting_toolbar.comment.tooltip}
      icon={<RiChat3Line />}
      onClick={onClick}
    />
  );
};

export const AddCommentButton = () => {
  const editor = useBlockNoteEditor<any, any, any>();

  if (!editor.getExtension(Comments)) {
    return null;
  }

  return <AddCommentButtonInner />;
};
