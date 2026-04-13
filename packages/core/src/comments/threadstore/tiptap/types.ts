/**
 * Tiptap comment types have moved to a private tiptap package and we don't want to create a dependency on it.
 * We've extracted the types from https://github.com/ueberdosis/hocuspocus/blob/v2.15.3/packages/provider/src/types.ts
 * and added them here.
 */

export type TCollabThread<Data = any, CommentData = any> = {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
  resolvedAt?: string; // (new Date()).toISOString()
  comments: TCollabComment<CommentData>[];
  deletedComments: TCollabComment<CommentData>[];
  data: Data;
};

export type TCollabComment<Data = any> = {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  data: Data;
  content: any;
};

export type ThreadType = "archived" | "unarchived";

export type GetThreadsOptions = {
  /**
   * The types of threads to get
   * @default ['unarchived']
   */
  types?: Array<ThreadType>;
};

export type DeleteCommentOptions = {
  /**
   * If `true`, the thread will also be deleted if the deleted comment was the first comment in the thread.
   */
  deleteThread?: boolean;

  /**
   * If `true`, will remove the content of the deleted comment
   */
  deleteContent?: boolean;
};

export type DeleteThreadOptions = {
  /**
   * If `true`, will remove the comments on the thread,
   * otherwise will only mark the thread as deleted
   * and keep the comments
   * @default false
   */
  deleteComments?: boolean;

  /**
   * If `true`, will forcefully remove the thread and all comments,
   * otherwise will only mark the thread as deleted
   * and keep the comments
   * @default false
   */
  force?: boolean;
};

export type TiptapCollabProvider = {
  getThread<Data, CommentData>(
    id: string,
  ): TCollabThread<Data, CommentData> | null;

  getThreads<Data, CommentData>(
    options?: GetThreadsOptions,
  ): TCollabThread<Data, CommentData>[];
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

  addComment(
    threadId: TCollabThread["id"],
    data: Omit<TCollabComment, "id" | "updatedAt" | "createdAt">,
  ): TCollabThread;

  updateComment(
    threadId: TCollabThread["id"],
    commentId: TCollabComment["id"],
    data: Partial<Pick<TCollabComment, "data" | "content">>,
  ): TCollabThread;

  deleteComment(
    threadId: TCollabThread["id"],
    commentId: TCollabComment["id"],
    options?: DeleteCommentOptions,
  ): TCollabThread;

  getThreadComments(
    threadId: TCollabThread["id"],
    includeDeleted?: boolean,
  ): TCollabComment[] | null;

  getThreadComment(
    threadId: TCollabThread["id"],
    commentId: TCollabComment["id"],
    includeDeleted?: boolean,
  ): TCollabComment | null;

  deleteThread(
    id: TCollabThread["id"],
    options?: DeleteThreadOptions,
  ): TCollabThread;

  updateThread(
    id: TCollabThread["id"],
    data: Partial<
      Pick<TCollabThread, "data"> & {
        resolvedAt: TCollabThread["resolvedAt"] | null;
      }
    >,
  ): TCollabThread;

  watchThreads(callback: () => void): void;
  unwatchThreads(callback: () => void): void;
};
