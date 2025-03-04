import { CommentData, ThreadData } from "../types.js";

export abstract class ThreadStoreAuth {
  abstract canCreateThread(): boolean;
  abstract canAddComment(thread: ThreadData): boolean;
  abstract canUpdateComment(comment: CommentData): boolean;
  abstract canDeleteComment(comment: CommentData): boolean;
  abstract canDeleteThread(thread: ThreadData): boolean;
  abstract canResolveThread(thread: ThreadData): boolean;
  abstract canUnresolveThread(thread: ThreadData): boolean;
  abstract canAddReaction(comment: CommentData, emoji?: string): boolean;
  abstract canDeleteReaction(comment: CommentData, emoji?: string): boolean;
}
