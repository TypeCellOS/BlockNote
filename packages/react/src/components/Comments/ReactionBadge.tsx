import { mergeCSSClasses } from "@blocknote/core";
import { CommentData } from "@blocknote/core/comments";
import { useState } from "react";

import { useDictionary } from "../../i18n/dictionary.js";
import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useBlockNoteEditor } from "../../hooks/useBlockNoteEditor.js";
import { useUsers } from "./useUsers.js";

export const ReactionBadge = (props: {
  comment: CommentData;
  emoji: string;
  onReactionSelect: (emoji: string) => void;
}) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  const editor = useBlockNoteEditor();
  if (!editor.comments) {
    throw new Error(
      "ReactionBadge must be used inside a BlockNote editor with comments enabled",
    );
  }

  const reaction = props.comment.reactions.find(
    (reaction) => reaction.emoji === props.emoji,
  );
  if (!reaction) {
    throw new Error(
      "Trying to render reaction badge for non-existing reaction",
    );
  }

  const [userIds, setUserIds] = useState<string[]>([]);
  const users = useUsers(editor, userIds);

  return (
    <Components.Generic.Badge.Root
      key={reaction.emoji}
      className={mergeCSSClasses("bn-badge", "bn-comment-reaction")}
      text={reaction.userIds.length.toString()}
      icon={reaction.emoji}
      isSelected={editor.comments.threadStore.auth.canDeleteReaction(
        props.comment,
        reaction.emoji,
      )}
      onClick={() => props.onReactionSelect(reaction.emoji)}
      onMouseEnter={() => setUserIds(reaction.userIds)}
      mainTooltip={dict.comments.reactions.reacted_by}
      secondaryTooltip={`${Array.from(users.values())
        .map((user) => user.username)
        .join("\n")}`}
    />
  );
};
