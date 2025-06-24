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
   * A "thread" in the ThreadStore only contains information about the content
   * of the thread / comments. It does not contain information about the position.
   *
   * This function can be implemented to store the thread in the document (by creating a mark)
   * If not implemented, default behavior will apply (creating the mark via TipTap)
   * See CommentsPlugin.ts for more details.
   */
  abstract addThreadToDocument?(options: {
    threadId: string;
    selection: {
      prosemirror: {
        head: number;
        anchor: number;
      };
      yjs?: {
        head: any;
        anchor: any;
      };
    };
  }): Promise<void>;

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
    emoji: string;
  }): Promise<void>;

  /**
   * Deletes a reaction from a comment.
   *
   * Auth: should be possible by the reaction author
   */
  abstract deleteReaction(options: {
    threadId: string;
    commentId: string;
    emoji: string;
  }): Promise<void>;

  /**
   * Retrieve data for a specific thread.
   */
  abstract getThread(threadId: string): ThreadData;

  /**
   * Retrieve all threads.
   */
  abstract getThreads(): Map<string, ThreadData>;

  /**
   * Subscribe to changes in the thread store.
   *
   * @returns a function to unsubscribe from the thread store
   */
  abstract subscribe(
    cb: (threads: Map<string, ThreadData>) => void,
  ): () => void;
}
