import { FormattingToolbarExtension } from "@blocknote/core/extensions";
// Specifically using type here to avoid pulling in the comments extensions into the main bundle
import type { CommentsExtension } from "@blocknote/core/comments";
import { useCallback } from "react";
import { RiChat3Line } from "react-icons/ri";

import { useComponentsContext } from "../../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../../hooks/useBlockNoteEditor.js";
import { useExtension } from "../../../hooks/useExtension.js";
import { useDictionary } from "../../../i18n/dictionary.js";

export const AddCommentButtonInner = () => {
  const dict = useDictionary();
  const Components = useComponentsContext()!;

  const comments = useExtension("comments") as unknown as ReturnType<
    ReturnType<typeof CommentsExtension>
  >;
  const { store } = useExtension(FormattingToolbarExtension);

  const onClick = useCallback(() => {
    comments.startPendingComment();
    store.setState(false);
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

  if (!editor.getExtension("comments")) {
    return null;
  }

  return <AddCommentButtonInner />;
};
