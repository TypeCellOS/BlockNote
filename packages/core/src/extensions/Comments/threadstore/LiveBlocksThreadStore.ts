import {
  CommentData as LiveBlocksCommentData,
  ThreadData as LiveBlocksThreadData,
} from "@liveblocks/client";
import {
  useCreateComment,
  useCreateThread,
  useDeleteThread,
  useThreads,
} from "@liveblocks/react";
import { CommentBody, CommentData, ThreadData } from "../types.js";
import { ThreadStore } from "./ThreadStore.js";
import { ThreadStoreAuth } from "./ThreadStoreAuth.js";

export class LiveBlocksThreadStore extends ThreadStore {
  constructor(
    private readonly methods: {
      createThread: ReturnType<typeof useCreateThread>;
      deleteThread: ReturnType<typeof useDeleteThread>;
      createComment: ReturnType<typeof useCreateComment>;
      threads: ReturnType<typeof useThreads>;
    },
    auth: ThreadStoreAuth
  ) {
    super(auth);
  }

  public createThread = async (options: {
    initialComment: {
      body: CommentBody;
      metadata?: any;
    };
    metadata?: any;
  }): Promise<ThreadData> => {
    if (options.initialComment.metadata) {
      throw new Error("Metadata is not supported in LiveBlocks");
    }
    const thread = this.methods.createThread({
      body: {
        version: 1,
        content: options.initialComment.body,
      },
      metadata: options.metadata,
    });
    return {
      type: "thread",
      id: thread.id,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      comments: thread.comments.map((comment) => ({
        type: "comment",
        id: comment.id,
        userId: comment.userId,
        createdAt: comment.createdAt,
        updatedAt: comment.editedAt ?? comment.createdAt,
        reactions: [],
        metadata: undefined, // unsupported
        deletedAt: undefined, // unsupported
        body: comment.body,
      })),
      resolved: thread.resolved,
      resolvedUpdatedAt: undefined, // unsupported
      metadata: thread.metadata,
      deletedAt: undefined, // unsupported
    };
  };

  public addComment = async (options: {
    comment: {
      body: CommentBody;
      metadata?: any;
    };
    threadId: string;
  }) => {
    if (options.comment.metadata) {
      throw new Error("Metadata is not supported in LiveBlocks");
    }
    this.methods.createComment({
      body: options.comment.body,
      threadId: options.threadId,
    });
    throw new Error("Not implemented");
  };

  public updateComment = async (options: {
    comment: {
      body: CommentBody;
      metadata?: any;
    };
    threadId: string;
    commentId: string;
  }) => {
    throw new Error("Not implemented");
  };

  public deleteComment = async (options: {
    threadId: string;
    commentId: string;
    softDelete?: boolean;
  }) => {
    throw new Error("Not implemented");
  };

  public deleteThread = async (options: { threadId: string }) => {
    throw new Error("Not implemented");
  };

  public resolveThread = async (options: { threadId: string }) => {
    throw new Error("Not implemented");
  };

  public unresolveThread = async (options: { threadId: string }) => {
    throw new Error("Not implemented");
  };

  public addReaction = (options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) => {
    throw new Error("Not implemented");
  };

  public deleteReaction = async (options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) => {
    throw new Error("Not implemented");
  };

  // TODO: async / reactive interface?
  public getThread(threadId: string) {
    return this.getThreads().get(threadId)!;
  }

  public getThreads(): Map<string, ThreadData> {
    return new Map(
      (this.methods.threads.threads! || []).map((thread) => [
        thread.id,
        mapLiveBlocksThreadDataToBlockNote(thread),
      ])
    );
  }

  public subscribe(cb: (threads: Map<string, ThreadData>) => void) {
    return () => {
      // no op
    };
  }
}

function mapLiveBlocksThreadDataToBlockNote(
  thread: LiveBlocksThreadData
): ThreadData {
  return {
    type: "thread",
    id: thread.id,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    comments: thread.comments.map((comment) =>
      mapLiveBlocksCommentDataToBlockNote(comment)
    ),
    resolved: thread.resolved,
    resolvedUpdatedAt: undefined, // unsupported
    metadata: thread.metadata,
    deletedAt: undefined, // unsupported
  };
}

function mapLiveBlocksCommentDataToBlockNote(
  comment: LiveBlocksCommentData
): CommentData {
  return {
    type: "comment",
    id: comment.id,
    userId: comment.userId,
    createdAt: comment.createdAt,
    updatedAt: comment.editedAt ?? comment.createdAt,
    reactions: [],
    metadata: undefined, // unsupported
    deletedAt: undefined, // unsupported
    body: comment.body,
  };
}
