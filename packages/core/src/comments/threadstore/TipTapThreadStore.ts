import {
  CommentBody,
  CommentData,
  CommentReactionData,
  ThreadData,
} from "../types.js";
import { ThreadStore } from "./ThreadStore.js";
import { ThreadStoreAuth } from "./ThreadStoreAuth.js";
type TCollabComment<Data = any> = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  data: Data;
  content: any;
};
type TCollabThread<Data = any, CommentData = any> = {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  resolvedAt?: string;
  comments: TCollabComment<CommentData>[];
  deletedComments: TCollabComment<CommentData>[];
  data: Data;
};
type TiptapCollabProvider = {
  /**
   * note: this will only work if your server loaded @hocuspocus-pro/extension-history, or if you are on a Tiptap business plan.
   */
  createVersion(name?: string): void;
  /**
   * note: this will only work if your server loaded @hocuspocus-pro/extension-history, or if you are on a Tiptap business plan.
   */
  revertToVersion(targetVersion: number): void;
  /**
   * note: this will only work if your server loaded @hocuspocus-pro/extension-history, or if you are on a Tiptap business plan.
   *
   * The server will reply with a stateless message (THistoryVersionPreviewEvent)
   */
  previewVersion(targetVersion: number): void;
  isAutoVersioning(): boolean;
  /**
   * Finds all threads in the document and returns them as JSON objects
   * @options Options to control the output of the threads (e.g. include deleted threads)
   * @returns An array of threads as JSON objects
   */
  getThreads<Data, CommentData>(): TCollabThread<Data, CommentData>[];
  /**
   * Gets a single thread by its id
   * @param id The thread id
   * @returns The thread as a JSON object or null if not found
   */
  getThread<Data, CommentData>(
    id: string,
  ): TCollabThread<Data, CommentData> | null;
  /**
   * Create a new thread
   * @param data The thread data
   * @returns The created thread
   */
  createThread(
    data: Omit<
      TCollabThread,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "deletedAt"
      | "comments"
      | "deletedComments"
    >,
  ): TCollabThread;
  /**
   * Update a specific thread
   * @param id The thread id
   * @param data New data for the thread
   * @returns The updated thread or null if the thread is not found
   */
  updateThread(
    id: TCollabThread["id"],
    data: Partial<
      Pick<TCollabThread, "data"> & {
        resolvedAt: TCollabThread["resolvedAt"] | null;
      }
    >,
  ): TCollabThread;
  /**
   * Handle the deletion of a thread. By default, the thread and it's comments are not deleted, but marked as deleted
   * via the `deletedAt` property. Forceful deletion can be enabled by setting the `force` option to `true`.
   *
   * If you only want to delete the comments of a thread, you can set the `deleteComments` option to `true`.
   * @param id The thread id
   * @param options A set of options that control how the thread is deleted
   * @returns The deleted thread or null if the thread is not found
   */
  deleteThread(id: TCollabThread["id"]): TCollabThread | null | undefined;
  /**
   * Tries to restore a deleted thread
   * @param id The thread id
   * @returns The restored thread or null if the thread is not found
   */
  restoreThread(id: TCollabThread["id"]): TCollabThread | null;
  /**
   * Returns comments from a thread, either deleted or not
   * @param threadId The thread id
   * @param includeDeleted If you want to include deleted comments, defaults to `false`
   * @returns The comments or null if the thread is not found
   */
  getThreadComments(
    threadId: TCollabThread["id"],
    includeDeleted?: boolean,
  ): TCollabComment[] | null;
  /**
   * Get a single comment from a specific thread
   * @param threadId The thread id
   * @param commentId The comment id
   * @param includeDeleted If you want to include deleted comments in the search
   * @returns The comment or null if not found
   */
  getThreadComment(
    threadId: TCollabThread["id"],
    commentId: TCollabComment["id"],
    includeDeleted?: boolean,
  ): TCollabComment | null;
  /**
   * Adds a comment to a thread
   * @param threadId The thread id
   * @param data The comment data
   * @returns The updated thread or null if the thread is not found
   * @example addComment('123', { content: 'Hello world', data: { author: 'Maria Doe' } })
   */
  addComment(
    threadId: TCollabThread["id"],
    data: Omit<TCollabComment, "id" | "updatedAt" | "createdAt">,
  ): TCollabThread;
  /**
   * Update a comment in a thread
   * @param threadId The thread id
   * @param commentId The comment id
   * @param data The new comment data
   * @returns The updated thread or null if the thread or comment is not found
   * @example updateComment('123', { content: 'The new content', data: { attachments: ['file1.jpg'] }})
   */
  updateComment(
    threadId: TCollabThread["id"],
    commentId: TCollabComment["id"],
    data: Partial<Pick<TCollabComment, "data" | "content">>,
  ): TCollabThread;
  /**
   * Deletes a comment from a thread
   * @param threadId The thread id
   * @param commentId The comment id
   * @param options A set of options that control how the comment is deleted
   * @returns The updated thread or null if the thread or comment is not found
   */
  deleteComment(
    threadId: TCollabThread["id"],
    commentId: TCollabComment["id"],
  ): TCollabThread | null | undefined;
  /**
   * Start watching threads for changes
   * @param callback The callback function to be called when a thread changes
   */
  watchThreads(callback: () => void): void;
  /**
   * Stop watching threads for changes
   * @param callback The callback function to be removed
   */
  unwatchThreads(callback: () => void): void;
};

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
