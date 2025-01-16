import { v4 } from "uuid";
import * as Y from "yjs";
import { BlockNoteEditor } from "../../../editor/BlockNoteEditor.js";
import { CommentBody, CommentData, ThreadData } from "../types.js";
import { ThreadStore } from "./ThreadStore.js";
import { ThreadStoreAuth } from "./ThreadStoreAuth.js";

export class YjsThreadStore extends ThreadStore {
  constructor(
    private readonly editor: BlockNoteEditor<any, any, any>,
    private readonly userId: string,
    private readonly threadsYMap: Y.Map<any>,
    auth: ThreadStoreAuth
  ) {
    super(auth);
  }

  private transact = <T, R>(
    fn: (options: T) => R
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
    }
  );

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
    }
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
        (comment) => comment.get("id") === options.commentId
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
    }
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
        (comment) => comment.get("id") === options.commentId
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
    }
  );

  public deleteThread = this.transact((options: { threadId: string }) => {
    if (
      !this.auth.canDeleteThread(
        yMapToThread(this.threadsYMap.get(options.threadId))
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
    (options: {
      threadId: string;
      commentId: string;
      // reaction: string; TODO
    }) => {
      throw new Error("Not implemented");
    }
  );

  public deleteReaction = this.transact(
    (options: { threadId: string; commentId: string; reactionId: string }) => {
      throw new Error("Not implemented");
    }
  );

  // TODO: async / reactive interface?
  public getThread(threadId: string) {
    const yThread = this.threadsYMap.get(threadId);
    if (!yThread) {
      throw new Error("Thread not found");
    }
    const thread = yMapToThread(yThread);
    return thread;
  }

  public getThreads(): Map<string, ThreadData> {
    const threadMap = new Map<string, ThreadData>();
    this.threadsYMap.forEach((yThread, id) => {
      threadMap.set(id, yMapToThread(yThread));
    });
    return threadMap;
  }

  public subscribe(cb: (threads: Map<string, ThreadData>) => void) {
    const observer = () => {
      cb(this.getThreads());
    };

    this.threadsYMap.observeDeep(observer);

    return () => {
      this.threadsYMap.unobserveDeep(observer);
    };
  }
}

// HELPERS

function commentToYMap(comment: CommentData) {
  const yMap = new Y.Map<any>();
  yMap.set("id", comment.id);
  yMap.set("userId", comment.userId);
  yMap.set("createdAt", comment.createdAt.getTime());
  yMap.set("updatedAt", comment.updatedAt.getTime());
  if (comment.deletedAt) {
    yMap.set("deletedAt", comment.deletedAt.getTime());
    yMap.set("body", undefined);
  } else {
    yMap.set("body", comment.body);
  }
  if (comment.reactions.length > 0) {
    throw new Error("Reactions should be empty in commentToYMap");
  }
  yMap.set("reactions", new Y.Array());
  yMap.set("metadata", comment.metadata);

  return yMap;
}

function threadToYMap(thread: ThreadData) {
  const yMap = new Y.Map();
  yMap.set("id", thread.id);
  yMap.set("createdAt", thread.createdAt.getTime());
  yMap.set("updatedAt", thread.updatedAt.getTime());
  const commentsArray = new Y.Array<Y.Map<any>>();

  commentsArray.push(thread.comments.map((comment) => commentToYMap(comment)));

  yMap.set("comments", commentsArray);
  yMap.set("resolved", thread.resolved);
  yMap.set("resolvedUpdatedAt", thread.resolvedUpdatedAt?.getTime());
  yMap.set("metadata", thread.metadata);
  return yMap;
}

function yMapToComment(yMap: Y.Map<any>): CommentData {
  return {
    type: "comment",
    id: yMap.get("id"),
    userId: yMap.get("userId"),
    createdAt: new Date(yMap.get("createdAt")),
    updatedAt: new Date(yMap.get("updatedAt")),
    deletedAt: yMap.get("deletedAt")
      ? new Date(yMap.get("deletedAt"))
      : undefined,
    reactions: [],
    metadata: yMap.get("metadata"),
    body: yMap.get("body"),
  };
}

function yMapToThread(yMap: Y.Map<any>): ThreadData {
  return {
    type: "thread",
    id: yMap.get("id"),
    createdAt: new Date(yMap.get("createdAt")),
    updatedAt: new Date(yMap.get("updatedAt")),
    comments: ((yMap.get("comments") as Y.Array<Y.Map<any>>) || []).map(
      (comment) => yMapToComment(comment)
    ),
    resolved: yMap.get("resolved"),
    resolvedUpdatedAt: yMap.get("resolvedUpdatedAt"),
    metadata: yMap.get("metadata"),
  };
}

function yArrayFindIndex(
  yArray: Y.Array<any>,
  predicate: (item: any) => boolean
) {
  for (let i = 0; i < yArray.length; i++) {
    if (predicate(yArray.get(i))) {
      return i;
    }
  }
  return -1;
}
