import { CommentBody, CommentData, ThreadData } from "../types.js";

export abstract class ThreadStore {
  abstract createThread(options: {
    initialComment: {
      body: CommentBody;
      metadata?: any;
    };
    metadata?: any;
  }): Promise<ThreadData>;

  abstract addComment(options: {
    comment: {
      body: CommentBody;
      metadata?: any;
    };
    threadId: string;
  }): Promise<CommentData>;

  abstract updateComment(options: {
    comment: {
      body: CommentBody;
      metadata?: any;
    };
    threadId: string;
    commentId: string;
  }): Promise<void>;

  abstract deleteComment(options: {
    threadId: string;
    commentId: string;
  }): Promise<void>;

  abstract deleteThread(options: { threadId: string }): Promise<void>;

  abstract resolveThread(options: { threadId: string }): Promise<void>;

  abstract unresolveThread(options: { threadId: string }): Promise<void>;

  abstract addReaction(options: {
    threadId: string;
    commentId: string;
    // reaction: string; TODO
  }): Promise<void>;

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
