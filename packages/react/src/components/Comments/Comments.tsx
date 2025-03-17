import { ThreadData } from "@blocknote/core/comments";

import { useComponentsContext } from "../../editor/ComponentsContext.js";
import { useDictionary } from "../../i18n/dictionary.js";
import { Comment } from "./Comment.js";

export type CommentsProps = {
  thread: ThreadData;
  collapse?: boolean;
};

export const Comments = ({ thread, collapse }: CommentsProps) => {
  const Components = useComponentsContext()!;
  const dict = useDictionary();

  if (collapse) {
    return [
      <Comment
        key={thread.comments[0].id}
        thread={thread}
        comment={thread.comments[0]}
        showResolveButton={true}
      />,
      <Components.Comments.ExpandSectionsPrompt
        key={"expand-prompt"}
        className={"bn-thread-expand-prompt"}>
        {dict.comments.sidebar.more_replies(thread.comments.length - 2)}
      </Components.Comments.ExpandSectionsPrompt>,
      <Comment
        key={thread.comments[thread.comments.length - 1].id}
        thread={thread}
        comment={thread.comments[thread.comments.length - 1]}
      />,
    ];
  }

  return thread.comments.map((comment, index) => {
    return (
      <Comment
        key={comment.id}
        thread={thread}
        comment={comment}
        showResolveButton={index === 0}
      />
    );
  });
};
