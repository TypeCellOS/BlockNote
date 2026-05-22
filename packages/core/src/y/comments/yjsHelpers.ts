import * as Y from "@y/y";
import type {
  CommentData,
  CommentReactionData,
  ThreadData,
} from "../../comments/types.js";

export function commentToYType(comment: CommentData) {
  const yType = new Y.Type();
  yType.setAttr("id", comment.id);
  yType.setAttr("userId", comment.userId);
  yType.setAttr("createdAt", comment.createdAt.getTime());
  yType.setAttr("updatedAt", comment.updatedAt.getTime());
  if (comment.deletedAt) {
    yType.setAttr("deletedAt", comment.deletedAt.getTime());
    yType.setAttr("body", undefined);
  } else {
    yType.setAttr("body", comment.body);
  }
  if (comment.reactions.length > 0) {
    throw new Error("Reactions should be empty in commentToYType");
  }

  /**
   * Reactions are stored in a map keyed by {userId-emoji},
   * this makes it easy to add / remove reactions and in a way that works local-first.
   * The cost is that "reading" the reactions is a bit more complex (see yTypeToReactions).
   */
  yType.setAttr("reactionsByUser", new Y.Type());
  yType.setAttr("metadata", comment.metadata);

  return yType;
}

export function threadToYType(thread: ThreadData) {
  const yType = new Y.Type();
  yType.setAttr("id", thread.id);
  yType.setAttr("createdAt", thread.createdAt.getTime());
  yType.setAttr("updatedAt", thread.updatedAt.getTime());
  const commentsType = new Y.Type();

  commentsType.push(thread.comments.map((comment) => commentToYType(comment)));

  yType.setAttr("comments", commentsType);
  yType.setAttr("resolved", thread.resolved);
  yType.setAttr("resolvedUpdatedAt", thread.resolvedUpdatedAt?.getTime());
  yType.setAttr("resolvedBy", thread.resolvedBy);
  yType.setAttr("metadata", thread.metadata);
  return yType;
}

type SingleUserCommentReactionData = {
  emoji: string;
  createdAt: Date;
  userId: string;
};

export function yTypeToReaction(
  yType: Y.Type,
): SingleUserCommentReactionData {
  return {
    emoji: yType.getAttr("emoji"),
    createdAt: new Date(yType.getAttr("createdAt")),
    userId: yType.getAttr("userId"),
  };
}

function yTypeToReactions(yType: Y.Type): CommentReactionData[] {
  const flatReactions = [...yType.attrValues()].map((reaction: Y.Type) =>
    yTypeToReaction(reaction),
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

export function yTypeToComment(yType: Y.Type): CommentData {
  return {
    type: "comment",
    id: yType.getAttr("id"),
    userId: yType.getAttr("userId"),
    createdAt: new Date(yType.getAttr("createdAt")),
    updatedAt: new Date(yType.getAttr("updatedAt")),
    deletedAt: yType.getAttr("deletedAt")
      ? new Date(yType.getAttr("deletedAt"))
      : undefined,
    reactions: yTypeToReactions(yType.getAttr("reactionsByUser")),
    metadata: yType.getAttr("metadata"),
    body: yType.getAttr("body"),
  };
}

export function yTypeToThread(yType: Y.Type): ThreadData {
  return {
    type: "thread",
    id: yType.getAttr("id"),
    createdAt: new Date(yType.getAttr("createdAt")),
    updatedAt: new Date(yType.getAttr("updatedAt")),
    comments: (
      (yType.getAttr("comments") as Y.Type)?.toArray() || []
    ).map((comment) => yTypeToComment(comment as Y.Type)),
    resolved: yType.getAttr("resolved"),
    resolvedUpdatedAt: new Date(yType.getAttr("resolvedUpdatedAt")),
    resolvedBy: yType.getAttr("resolvedBy"),
    metadata: yType.getAttr("metadata"),
  };
}
