import { v4 } from "uuid";
import * as Y from "yjs";
import { CommentBody, CommentData, ThreadData } from "../../types.js";
import { ThreadStoreAuth } from "../ThreadStoreAuth.js";
import { YjsThreadStoreBase } from "./YjsThreadStoreBase.js";
import {
  commentToYMap,
  threadToYMap,
  yMapToComment,
  yMapToThread,
} from "./yjsHelpers.js";

/**
 * This is a Yjs-based implementation of the ThreadStore interface.
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
    threadsYMap: Y.Map<any>,
    auth: ThreadStoreAuth,
  ) {
    super(threadsYMap, auth);
  }

  private transact = <T, R>(
    fn: (options: T) => R,
  ): ((options: T) => Promise<R>) => {
    return async (options: T) => {
      return this.threadsYMap.doc!.transact(() => {
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
        id: v4(),
        userId: this.userId,
        createdAt: date,
        updatedAt: date,
        reactions: [],
        metadata: options.initialComment.metadata,
        body: options.initialComment.body,
      };

      const thread: ThreadData = {
        type: "thread",
        id: v4(),
        createdAt: date,
        updatedAt: date,
        comments: [comment],
        resolved: false,
        metadata: options.metadata,
      };

      this.threadsYMap.set(thread.id, threadToYMap(thread));

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
      const yThread = this.threadsYMap.get(options.threadId);
      if (!yThread) {
        throw new Error("Thread not found");
      }

      if (!this.auth.canAddComment(yMapToThread(yThread))) {
        throw new Error("Not authorized");
      }

      const date = new Date();
      const comment: CommentData = {
        type: "comment",
        id: v4(),
        userId: this.userId,
        createdAt: date,
        updatedAt: date,
        deletedAt: undefined,
        reactions: [],
        metadata: options.comment.metadata,
        body: options.comment.body,
      };

      (yThread.get("comments") as Y.Array<Y.Map<any>>).push([
        commentToYMap(comment),
      ]);

      yThread.set("updatedAt", new Date().getTime());
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
      const yThread = this.threadsYMap.get(options.threadId);
      if (!yThread) {
        throw new Error("Thread not found");
      }

      const yCommentIndex = yArrayFindIndex(
        yThread.get("comments"),
        (comment) => comment.get("id") === options.commentId,
      );

      if (yCommentIndex === -1) {
        throw new Error("Comment not found");
      }

      const yComment = yThread.get("comments").get(yCommentIndex);

      if (!this.auth.canUpdateComment(yMapToComment(yComment))) {
        throw new Error("Not authorized");
      }

      yComment.set("body", options.comment.body);
      yComment.set("updatedAt", new Date().getTime());
      yComment.set("metadata", options.comment.metadata);
    },
  );

  public deleteComment = this.transact(
    (options: {
      threadId: string;
      commentId: string;
      softDelete?: boolean;
    }) => {
      const yThread = this.threadsYMap.get(options.threadId);
      if (!yThread) {
        throw new Error("Thread not found");
      }

      const yCommentIndex = yArrayFindIndex(
        yThread.get("comments"),
        (comment) => comment.get("id") === options.commentId,
      );

      if (yCommentIndex === -1) {
        throw new Error("Comment not found");
      }

      const yComment = yThread.get("comments").get(yCommentIndex);

      if (!this.auth.canDeleteComment(yMapToComment(yComment))) {
        throw new Error("Not authorized");
      }

      if (yComment.get("deletedAt")) {
        throw new Error("Comment already deleted");
      }

      if (options.softDelete) {
        yComment.set("deletedAt", new Date().getTime());
        yComment.set("body", undefined);
      } else {
        yThread.get("comments").delete(yCommentIndex);
      }

      if (
        (yThread.get("comments") as Y.Array<any>)
          .toArray()
          .every((comment) => comment.get("deletedAt"))
      ) {
        // all comments deleted
        if (options.softDelete) {
          yThread.set("deletedAt", new Date().getTime());
        } else {
          this.threadsYMap.delete(options.threadId);
        }
      }

      yThread.set("updatedAt", new Date().getTime());
    },
  );

  public deleteThread = this.transact((options: { threadId: string }) => {
    if (
      !this.auth.canDeleteThread(
        yMapToThread(this.threadsYMap.get(options.threadId)),
      )
    ) {
      throw new Error("Not authorized");
    }

    this.threadsYMap.delete(options.threadId);
  });

  public resolveThread = this.transact((options: { threadId: string }) => {
    const yThread = this.threadsYMap.get(options.threadId);
    if (!yThread) {
      throw new Error("Thread not found");
    }

    if (!this.auth.canResolveThread(yMapToThread(yThread))) {
      throw new Error("Not authorized");
    }

    yThread.set("resolved", true);
    yThread.set("resolvedUpdatedAt", new Date().getTime());
    yThread.set("resolvedBy", this.userId);
  });

  public unresolveThread = this.transact((options: { threadId: string }) => {
    const yThread = this.threadsYMap.get(options.threadId);
    if (!yThread) {
      throw new Error("Thread not found");
    }

    if (!this.auth.canUnresolveThread(yMapToThread(yThread))) {
      throw new Error("Not authorized");
    }

    yThread.set("resolved", false);
    yThread.set("resolvedUpdatedAt", new Date().getTime());
  });

  public addReaction = this.transact(
    (options: { threadId: string; commentId: string; emoji: string }) => {
      const yThread = this.threadsYMap.get(options.threadId);
      if (!yThread) {
        throw new Error("Thread not found");
      }

      const yCommentIndex = yArrayFindIndex(
        yThread.get("comments"),
        (comment) => comment.get("id") === options.commentId,
      );

      if (yCommentIndex === -1) {
        throw new Error("Comment not found");
      }

      const yComment = yThread.get("comments").get(yCommentIndex);

      if (!this.auth.canAddReaction(yMapToComment(yComment), options.emoji)) {
        throw new Error("Not authorized");
      }

      const date = new Date();

      const key = `${this.userId}-${options.emoji}`;

      const reactionsByUser = yComment.get("reactionsByUser");

      if (reactionsByUser.has(key)) {
        // already exists
        return;
      } else {
        const reaction = new Y.Map();
        reaction.set("emoji", options.emoji);
        reaction.set("createdAt", date.getTime());
        reaction.set("userId", this.userId);
        reactionsByUser.set(key, reaction);
      }
    },
  );

  public deleteReaction = this.transact(
    (options: { threadId: string; commentId: string; emoji: string }) => {
      const yThread = this.threadsYMap.get(options.threadId);
      if (!yThread) {
        throw new Error("Thread not found");
      }

      const yCommentIndex = yArrayFindIndex(
        yThread.get("comments"),
        (comment) => comment.get("id") === options.commentId,
      );

      if (yCommentIndex === -1) {
        throw new Error("Comment not found");
      }

      const yComment = yThread.get("comments").get(yCommentIndex);

      if (
        !this.auth.canDeleteReaction(yMapToComment(yComment), options.emoji)
      ) {
        throw new Error("Not authorized");
      }

      const key = `${this.userId}-${options.emoji}`;

      const reactionsByUser = yComment.get("reactionsByUser");

      reactionsByUser.delete(key);
    },
  );
}

function yArrayFindIndex(
  yArray: Y.Array<any>,
  predicate: (item: any) => boolean,
) {
  for (let i = 0; i < yArray.length; i++) {
    if (predicate(yArray.get(i))) {
      return i;
    }
  }
  return -1;
}
