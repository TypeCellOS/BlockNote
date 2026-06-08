import * as Y from "@y/y";
import { CommentData, CommentReactionData, ThreadData } from "../../types.js";

export function commentToYMap(comment: CommentData) {
  const yMap = new Y.Type();
  yMap.setAttr("id", comment.id);
  yMap.setAttr("userId", comment.userId);
  yMap.setAttr("createdAt", comment.createdAt.getTime());
  yMap.setAttr("updatedAt", comment.updatedAt.getTime());
  if (comment.deletedAt) {
    yMap.setAttr("deletedAt", comment.deletedAt.getTime());
    yMap.setAttr("body", undefined);
  } else {
    yMap.setAttr("body", comment.body);
  }
  if (comment.reactions.length > 0) {
    throw new Error("Reactions should be empty in commentToYMap");
  }

  /**
   * Reactions are stored in a map keyed by {userId-emoji},
   * this makes it easy to add / remove reactions and in a way that works local-first.
   * The cost is that "reading" the reactions is a bit more complex (see yMapToReactions).
   */
  yMap.setAttr("reactionsByUser", new Y.Type());
  yMap.setAttr("metadata", comment.metadata);

  return yMap;
}

export function threadToYMap(thread: ThreadData) {
  const yMap = new Y.Type();
  yMap.setAttr("id", thread.id);
  yMap.setAttr("createdAt", thread.createdAt.getTime());
  yMap.setAttr("updatedAt", thread.updatedAt.getTime());
  const commentsArray = new Y.Type();

  commentsArray.push(thread.comments.map((comment) => commentToYMap(comment)));

  yMap.setAttr("comments", commentsArray);
  yMap.setAttr("resolved", thread.resolved);
  yMap.setAttr("resolvedUpdatedAt", thread.resolvedUpdatedAt?.getTime());
  yMap.setAttr("resolvedBy", thread.resolvedBy);
  yMap.setAttr("metadata", thread.metadata);
  return yMap;
}

type SingleUserCommentReactionData = {
  emoji: string;
  createdAt: Date;
  userId: string;
};

export function yMapToReaction(yMap: Y.Type): SingleUserCommentReactionData {
  return {
    emoji: yMap.getAttr("emoji"),
    createdAt: new Date(yMap.getAttr("createdAt")),
    userId: yMap.getAttr("userId"),
  };
}

function yMapToReactions(yMap: Y.Type): CommentReactionData[] {
  const flatReactions = [...yMap.attrValues()].map((reaction: Y.Type) =>
    yMapToReaction(reaction),
  );
  // combine reactions by the same emoji
  return flatReactions.reduce(
    (acc: CommentReactionData[], reaction: SingleUserCommentReactionData) => {
      const existingReaction = acc.find((r) => r.emoji === reaction.emoji);
      if (existingReaction) {
        existingReaction.userIds.push(reaction.userId);
        existingReaction.createdAt = new Date(
          Math.min(
            existingReaction.createdAt.getTime(),
            reaction.createdAt.getTime(),
          ),
        );
      } else {
        acc.push({
          emoji: reaction.emoji,
          createdAt: reaction.createdAt,
          userIds: [reaction.userId],
        });
      }
      return acc;
    },
    [] as CommentReactionData[],
  );
}

export function yMapToComment(yMap: Y.Type): CommentData {
  return {
    type: "comment",
    id: yMap.getAttr("id"),
    userId: yMap.getAttr("userId"),
    createdAt: new Date(yMap.getAttr("createdAt")),
    updatedAt: new Date(yMap.getAttr("updatedAt")),
    deletedAt: yMap.getAttr("deletedAt")
      ? new Date(yMap.getAttr("deletedAt"))
      : undefined,
    reactions: yMapToReactions(yMap.getAttr("reactionsByUser") as Y.Type),
    metadata: yMap.getAttr("metadata"),
    body: yMap.getAttr("body"),
  };
}

export function yMapToThread(yMap: Y.Type): ThreadData {
  return {
    type: "thread",
    id: yMap.getAttr("id"),
    createdAt: new Date(yMap.getAttr("createdAt")),
    updatedAt: new Date(yMap.getAttr("updatedAt")),
    comments: ((yMap.getAttr("comments") as Y.Type | undefined)?.toArray() ||
      []).map((comment) => yMapToComment(comment as Y.Type)),
    resolved: yMap.getAttr("resolved"),
    resolvedUpdatedAt: new Date(yMap.getAttr("resolvedUpdatedAt")),
    resolvedBy: yMap.getAttr("resolvedBy"),
    metadata: yMap.getAttr("metadata"),
  };
}
