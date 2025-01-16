import { CommentBody, CommentData, ThreadData } from "../types.js";

/**
 * ThreadStore is an abstract class that defines the interface
 * to read / add / update / delete threads and comments.
 *
 * The methods are annotated with the recommended auth pattern
 * (but of course this could be different in your app):
 * - View-only users should not be able to see any comments
 * - Comment-only users and editors can:
 * - - create new comments / replies / reactions
 * - - edit / delete their own comments / reactions
 * - - resolve / unresolve threads
 * - Editors can also delete any comment or thread
 */
export abstract class ThreadStore {
  /**
   * Creates a new thread with an initial comment.
   *
   * Auth: should be possible by anyone with comment access
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
   *
   * Auth: should be possible by anyone with comment access
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
   *
   * Auth: should only be possible by the comment author
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
   *
   * Auth: should be possible by the comment author OR an editor of the document
   */
  abstract deleteComment(options: {
    threadId: string;
    commentId: string;
  }): Promise<void>;

  /**
   * Deletes a thread.
   *
   * Auth: should only be possible by an editor of the document
   */
  abstract deleteThread(options: { threadId: string }): Promise<void>;

  /**
   * Marks a thread as resolved.
   *
   * Auth: should be possible by anyone with comment access
   */
  abstract resolveThread(options: { threadId: string }): Promise<void>;

  /**
   * Marks a thread as unresolved.
   *
   * Auth: should be possible by anyone with comment access
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
    // reaction: string; TODO
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
