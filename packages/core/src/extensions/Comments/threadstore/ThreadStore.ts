import { CommentBody, CommentData, ThreadData } from "../types.js";
import { ThreadStoreAuth } from "./ThreadStoreAuth.js";

/**
 * ThreadStore is an abstract class that defines the interface
 * to read / add / update / delete threads and comments.
 */
export abstract class ThreadStore {
  public readonly auth: ThreadStoreAuth;

  constructor(auth: ThreadStoreAuth) {
    this.auth = auth;
  }

  /**
   * Creates a new thread with an initial comment.
   */
  abstract createThread(options: {
    initialComment: {
      body: CommentBody;
      metadata?: any;
    };
    metadata?: any;
  }): Promise<ThreadData>;

  /**
   * Adds a comment to a thread.
   */
  abstract addComment(options: {
    comment: {
      body: CommentBody;
      metadata?: any;
    };
    threadId: string;
  }): Promise<CommentData>;

  /**
   * Updates a comment in a thread.
   */
  abstract updateComment(options: {
    comment: {
      body: CommentBody;
      metadata?: any;
    };
    threadId: string;
    commentId: string;
  }): Promise<void>;

  /**
   * Deletes a comment from a thread.
   */
  abstract deleteComment(options: {
    threadId: string;
    commentId: string;
  }): Promise<void>;

  /**
   * Deletes a thread.
   */
  abstract deleteThread(options: { threadId: string }): Promise<void>;

  /**
   * Marks a thread as resolved.
   */
  abstract resolveThread(options: { threadId: string }): Promise<void>;

  /**
   * Marks a thread as unresolved.
   */
  abstract unresolveThread(options: { threadId: string }): Promise<void>;

  /**
   * Adds a reaction to a comment.
   *
   * Auth: should be possible by anyone with comment access
   */
  abstract addReaction(options: {
    threadId: string;
    commentId: string;
    reaction: string;
  }): Promise<void>;

  /**
   * Deletes a reaction from a comment.
   *
   * Auth: should be possible by the reaction author
   */
  abstract deleteReaction(options: {
    threadId: string;
    commentId: string;
    reactionId: string;
  }): Promise<void>;

  abstract getThread(threadId: string): ThreadData;

  abstract getThreads(): Map<string, ThreadData>;

  abstract subscribe(
    cb: (threads: Map<string, ThreadData>) => void
  ): () => void;
}
