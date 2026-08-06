import { uuidv4 } from "lib0/random";
import * as Y from "@y/y";
import type {
  CommentBody,
  CommentData,
  ThreadData,
} from "../../comments/types.js";
import type { ThreadStoreAuth } from "../../comments/threadstore/ThreadStoreAuth.js";
import { YjsThreadStoreBase } from "./YjsThreadStoreBase.js";
import {
  commentToYType,
  threadToYType,
  yTypeToComment,
  yTypeToThread,
} from "./yjsHelpers.js";

/**
 * This is a @y/y (v14)-based implementation of the ThreadStore interface.
 *
 * It reads and writes thread / comments information directly to the underlying Yjs Document.
 *
 * @important While this is the easiest to add to your app, there are two challenges:
 * - The user needs to be able to write to the Yjs document to store the information.
 *   So a user without write access to the Yjs document cannot leave any comments.
 * - Even with write access, the operations are not secure. Unless your Yjs server
 *   guards against malicious operations, it's technically possible for one user to make changes to another user's comments, etc.
 *   (even though these options are not visible in the UI, a malicious user can make unauthorized changes to the underlying Yjs document)
 */
export class YjsThreadStore extends YjsThreadStoreBase {
  constructor(
    private readonly userId: string,
    threadsYType: Y.Type,
    auth: ThreadStoreAuth,
  ) {
    super(threadsYType, auth);
  }

  private transact = <T, R>(
    fn: (options: T) => R,
  ): ((options: T) => Promise<R>) => {
    return async (options: T) => {
      return this.threadsYType.doc!.transact(() => {
        return fn(options);
      });
    };
  };

  public createThread = this.transact(
    (options: {
      initialComment: {
        body: CommentBody;
        metadata?: any;
      };
      metadata?: any;
    }) => {
      if (!this.auth.canCreateThread()) {
        throw new Error("Not authorized");
      }

      const date = new Date();

      const comment: CommentData = {
        type: "comment",
        id: uuidv4(),
        userId: this.userId,
        createdAt: date,
        updatedAt: date,
        reactions: [],
        metadata: options.initialComment.metadata,
        body: options.initialComment.body,
      };

      const thread: ThreadData = {
        type: "thread",
        id: uuidv4(),
        createdAt: date,
        updatedAt: date,
        comments: [comment],
        resolved: false,
        metadata: options.metadata,
      };

      this.threadsYType.setAttr(thread.id, threadToYType(thread));

      return thread;
    },
  );

  // YjsThreadStore does not support addThreadToDocument
  public addThreadToDocument = undefined;

  public addComment = this.transact(
    (options: {
      comment: {
        body: CommentBody;
        metadata?: any;
      };
      threadId: string;
    }) => {
      const yThread = this.threadsYType.getAttr(options.threadId) as
        | Y.Type
        | undefined;
      if (!yThread) {
        throw new Error("Thread not found");
      }

      if (!this.auth.canAddComment(yTypeToThread(yThread))) {
        throw new Error("Not authorized");
      }

      const date = new Date();
      const comment: CommentData = {
        type: "comment",
        id: uuidv4(),
        userId: this.userId,
        createdAt: date,
        updatedAt: date,
        deletedAt: undefined,
        reactions: [],
        metadata: options.comment.metadata,
        body: options.comment.body,
      };

      (yThread.getAttr("comments") as Y.Type).push([commentToYType(comment)]);

      yThread.setAttr("updatedAt", new Date().getTime());
      return comment;
    },
  );

  public updateComment = this.transact(
    (options: {
      comment: {
        body: CommentBody;
        metadata?: any;
      };
      threadId: string;
      commentId: string;
    }) => {
      const yThread = this.threadsYType.getAttr(options.threadId) as
        | Y.Type
        | undefined;
      if (!yThread) {
        throw new Error("Thread not found");
      }

      const commentsType = yThread.getAttr("comments") as Y.Type;
      const yCommentIndex = yTypeFindIndex(
        commentsType,
        (comment) => (comment as Y.Type).getAttr("id") === options.commentId,
      );

      if (yCommentIndex === -1) {
        throw new Error("Comment not found");
      }

      const yComment = commentsType.get(yCommentIndex) as Y.Type;

      if (!this.auth.canUpdateComment(yTypeToComment(yComment))) {
        throw new Error("Not authorized");
      }

      yComment.setAttr("body", options.comment.body);
      yComment.setAttr("updatedAt", new Date().getTime());
      yComment.setAttr("metadata", options.comment.metadata);
    },
  );

  public deleteComment = this.transact(
    (options: {
      threadId: string;
      commentId: string;
      softDelete?: boolean;
    }) => {
      const yThread = this.threadsYType.getAttr(options.threadId) as
        | Y.Type
        | undefined;
      if (!yThread) {
        throw new Error("Thread not found");
      }

      const commentsType = yThread.getAttr("comments") as Y.Type;
      const yCommentIndex = yTypeFindIndex(
        commentsType,
        (comment) => (comment as Y.Type).getAttr("id") === options.commentId,
      );

      if (yCommentIndex === -1) {
        throw new Error("Comment not found");
      }

      const yComment = commentsType.get(yCommentIndex) as Y.Type;

      if (!this.auth.canDeleteComment(yTypeToComment(yComment))) {
        throw new Error("Not authorized");
      }

      if (yComment.getAttr("deletedAt")) {
        throw new Error("Comment already deleted");
      }

      if (options.softDelete) {
        yComment.setAttr("deletedAt", new Date().getTime());
        yComment.setAttr("body", undefined);
      } else {
        commentsType.delete(yCommentIndex);
      }

      if (
        commentsType
          .toArray()
          .every((comment) => (comment as Y.Type).getAttr("deletedAt"))
      ) {
        // all comments deleted
        if (options.softDelete) {
          yThread.setAttr("deletedAt", new Date().getTime());
        } else {
          this.threadsYType.deleteAttr(options.threadId);
        }
      }

      yThread.setAttr("updatedAt", new Date().getTime());
    },
  );

  public deleteThread = this.transact((options: { threadId: string }) => {
    if (
      !this.auth.canDeleteThread(
        yTypeToThread(this.threadsYType.getAttr(options.threadId) as Y.Type),
      )
    ) {
      throw new Error("Not authorized");
    }

    this.threadsYType.deleteAttr(options.threadId);
  });

  public resolveThread = this.transact((options: { threadId: string }) => {
    const yThread = this.threadsYType.getAttr(options.threadId) as
      | Y.Type
      | undefined;
    if (!yThread) {
      throw new Error("Thread not found");
    }

    if (!this.auth.canResolveThread(yTypeToThread(yThread))) {
      throw new Error("Not authorized");
    }

    yThread.setAttr("resolved", true);
    yThread.setAttr("resolvedUpdatedAt", new Date().getTime());
    yThread.setAttr("resolvedBy", this.userId);
  });

  public unresolveThread = this.transact((options: { threadId: string }) => {
    const yThread = this.threadsYType.getAttr(options.threadId) as
      | Y.Type
      | undefined;
    if (!yThread) {
      throw new Error("Thread not found");
    }

    if (!this.auth.canUnresolveThread(yTypeToThread(yThread))) {
      throw new Error("Not authorized");
    }

    yThread.setAttr("resolved", false);
    yThread.setAttr("resolvedUpdatedAt", new Date().getTime());
  });

  public addReaction = this.transact(
    (options: { threadId: string; commentId: string; emoji: string }) => {
      const yThread = this.threadsYType.getAttr(options.threadId) as
        | Y.Type
        | undefined;
      if (!yThread) {
        throw new Error("Thread not found");
      }

      const commentsType = yThread.getAttr("comments") as Y.Type;
      const yCommentIndex = yTypeFindIndex(
        commentsType,
        (comment) => (comment as Y.Type).getAttr("id") === options.commentId,
      );

      if (yCommentIndex === -1) {
        throw new Error("Comment not found");
      }

      const yComment = commentsType.get(yCommentIndex) as Y.Type;

      if (!this.auth.canAddReaction(yTypeToComment(yComment), options.emoji)) {
        throw new Error("Not authorized");
      }

      const date = new Date();

      const key = `${this.userId}-${options.emoji}`;

      const reactionsByUser = yComment.getAttr("reactionsByUser") as Y.Type;

      if (reactionsByUser.hasAttr(key)) {
        // already exists
        return;
      } else {
        const reaction = new Y.Type();
        reaction.setAttr("emoji", options.emoji);
        reaction.setAttr("createdAt", date.getTime());
        reaction.setAttr("userId", this.userId);
        reactionsByUser.setAttr(key, reaction);
      }
    },
  );

  public deleteReaction = this.transact(
    (options: { threadId: string; commentId: string; emoji: string }) => {
      const yThread = this.threadsYType.getAttr(options.threadId) as
        | Y.Type
        | undefined;
      if (!yThread) {
        throw new Error("Thread not found");
      }

      const commentsType = yThread.getAttr("comments") as Y.Type;
      const yCommentIndex = yTypeFindIndex(
        commentsType,
        (comment) => (comment as Y.Type).getAttr("id") === options.commentId,
      );

      if (yCommentIndex === -1) {
        throw new Error("Comment not found");
      }

      const yComment = commentsType.get(yCommentIndex) as Y.Type;

      if (
        !this.auth.canDeleteReaction(yTypeToComment(yComment), options.emoji)
      ) {
        throw new Error("Not authorized");
      }

      const key = `${this.userId}-${options.emoji}`;

      const reactionsByUser = yComment.getAttr("reactionsByUser") as Y.Type;

      reactionsByUser.deleteAttr(key);
    },
  );
}

function yTypeFindIndex(yType: Y.Type, predicate: (item: any) => boolean) {
  for (let i = 0; i < yType.length; i++) {
    if (predicate(yType.get(i))) {
      return i;
    }
  }
  return -1;
}
