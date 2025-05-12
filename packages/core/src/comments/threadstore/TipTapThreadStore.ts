import type {
  TCollabComment,
  TCollabThread,
  TiptapCollabProvider,
} from "@hocuspocus/provider";
import {
  CommentBody,
  CommentData,
  CommentReactionData,
  ThreadData,
} from "../types.js";
import { ThreadStore } from "./ThreadStore.js";
import { ThreadStoreAuth } from "./ThreadStoreAuth.js";

type ReactionAsTiptapData = {
  emoji: string;
  createdAt: number;
  userId: string;
};

/**
 * The `TiptapThreadStore` integrates with Tiptap's collaboration provider for comment management.
 * You can pass a `TiptapCollabProvider` to the constructor which takes care of storing the comments.
 *
 * Under the hood, this actually works similarly to the `YjsThreadStore` implementation. (comments are stored in the Yjs document)
 */
export class TiptapThreadStore extends ThreadStore {
  constructor(
    private readonly userId: string,
    private readonly provider: TiptapCollabProvider,
    auth: ThreadStoreAuth, // TODO: use?
  ) {
    super(auth);
  }

  /**
   * Creates a new thread with an initial comment.
   */
  public async createThread(options: {
    initialComment: {
      body: CommentBody;
      metadata?: any;
    };
    metadata?: any;
  }): Promise<ThreadData> {
    let thread = this.provider.createThread({
      data: options.metadata,
    });

    thread = this.provider.addComment(thread.id, {
      content: options.initialComment.body,
      data: {
        metadata: options.initialComment.metadata,
        userId: this.userId,
      },
    });

    return this.tiptapThreadToThreadData(thread);
  }

  // TipTapThreadStore does not support addThreadToDocument
  public addThreadToDocument = undefined;

  /**
   * Adds a comment to a thread.
   */
  public async addComment(options: {
    comment: {
      body: CommentBody;
      metadata?: any;
    };
    threadId: string;
  }): Promise<CommentBody> {
    const thread = this.provider.addComment(options.threadId, {
      content: options.comment.body,
      data: {
        metadata: options.comment.metadata,
        userId: this.userId,
      },
    });

    return this.tiptapCommentToCommentData(
      thread.comments[thread.comments.length - 1],
    );
  }

  /**
   * Updates a comment in a thread.
   */
  public async updateComment(options: {
    comment: {
      body: CommentBody;
      metadata?: any;
    };
    threadId: string;
    commentId: string;
  }) {
    const comment = this.provider.getThreadComment(
      options.threadId,
      options.commentId,
      true,
    );

    if (!comment) {
      throw new Error("Comment not found");
    }

    this.provider.updateComment(options.threadId, options.commentId, {
      content: options.comment.body,
      data: {
        ...comment.data,
        metadata: options.comment.metadata,
      },
    });
  }

  private tiptapCommentToCommentData(comment: TCollabComment): CommentData {
    const reactions: CommentReactionData[] = [];

    for (const reaction of (comment.data?.reactions ||
      []) as ReactionAsTiptapData[]) {
      const existingReaction = reactions.find(
        (r) => r.emoji === reaction.emoji,
      );
      if (existingReaction) {
        existingReaction.userIds.push(reaction.userId);
        existingReaction.createdAt = new Date(
          Math.min(existingReaction.createdAt.getTime(), reaction.createdAt),
        );
      } else {
        reactions.push({
          emoji: reaction.emoji,
          createdAt: new Date(reaction.createdAt),
          userIds: [reaction.userId],
        });
      }
    }

    return {
      type: "comment",
      id: comment.id,
      body: comment.content,
      metadata: comment.data?.metadata,
      userId: comment.data?.userId,
      createdAt: new Date(comment.createdAt),
      updatedAt: new Date(comment.updatedAt),
      reactions,
    };
  }

  private tiptapThreadToThreadData(thread: TCollabThread): ThreadData {
    return {
      type: "thread",
      id: thread.id,
      comments: thread.comments.map((comment) =>
        this.tiptapCommentToCommentData(comment),
      ),
      resolved: !!thread.resolvedAt,
      metadata: thread.data?.metadata,
      createdAt: new Date(thread.createdAt),
      updatedAt: new Date(thread.updatedAt),
    };
  }

  /**
   * Deletes a comment from a thread.
   */
  public async deleteComment(options: { threadId: string; commentId: string }) {
    this.provider.deleteComment(options.threadId, options.commentId);
  }

  /**
   * Deletes a thread.
   */
  public async deleteThread(options: { threadId: string }) {
    this.provider.deleteThread(options.threadId);
  }

  /**
   * Marks a thread as resolved.
   */
  public async resolveThread(options: { threadId: string }) {
    this.provider.updateThread(options.threadId, {
      resolvedAt: new Date().toISOString(),
    });
  }

  /**
   * Marks a thread as unresolved.
   */
  public async unresolveThread(options: { threadId: string }) {
    this.provider.updateThread(options.threadId, {
      resolvedAt: null,
    });
  }

  /**
   * Adds a reaction to a comment.
   *
   * Auth: should be possible by anyone with comment access
   */
  public async addReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) {
    const comment = this.provider.getThreadComment(
      options.threadId,
      options.commentId,
      true,
    );

    if (!comment) {
      throw new Error("Comment not found");
    }

    this.provider.updateComment(options.threadId, options.commentId, {
      data: {
        ...comment.data,
        reactions: [
          ...((comment.data?.reactions || []) as ReactionAsTiptapData[]),
          {
            emoji: options.emoji,
            createdAt: Date.now(),
            userId: this.userId,
          },
        ],
      },
    });
  }

  /**
   * Deletes a reaction from a comment.
   *
   * Auth: should be possible by the reaction author
   */
  public async deleteReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }) {
    const comment = this.provider.getThreadComment(
      options.threadId,
      options.commentId,
      true,
    );

    if (!comment) {
      throw new Error("Comment not found");
    }

    this.provider.updateComment(options.threadId, options.commentId, {
      data: {
        ...comment.data,
        reactions: (
          (comment.data?.reactions || []) as ReactionAsTiptapData[]
        ).filter(
          (reaction) =>
            reaction.emoji !== options.emoji && reaction.userId !== this.userId,
        ),
      },
    });
  }

  public getThread(threadId: string): ThreadData {
    const thread = this.provider.getThread(threadId);

    if (!thread) {
      throw new Error("Thread not found");
    }

    return this.tiptapThreadToThreadData(thread);
  }

  public getThreads(): Map<string, ThreadData> {
    return new Map(
      this.provider
        .getThreads()
        .map((thread) => [thread.id, this.tiptapThreadToThreadData(thread)]),
    );
  }

  public subscribe(cb: (threads: Map<string, ThreadData>) => void): () => void {
    const newCb = () => {
      cb(this.getThreads());
    };
    this.provider.watchThreads(newCb);
    return () => {
      this.provider.unwatchThreads(newCb);
    };
  }
}
