import { CommentData, ThreadData } from "../types.js";
import { ThreadStoreAuth } from "./ThreadStoreAuth.js";

/*
 * The methods are annotated with the recommended auth pattern
 * (but of course this could be different in your app):
 * - View-only users should not be able to see any comments
 * - Comment-only users and editors can:
 * - - create new comments / replies / reactions
 * - - edit / delete their own comments / reactions
 * - - resolve / unresolve threads
 * - Editors can also delete any comment or thread
 */
export class DefaultThreadStoreAuth extends ThreadStoreAuth {
  constructor(
    private readonly userId: string,
    private readonly role: "comment" | "editor"
  ) {
    super();
  }

  /**
   * Auth: should be possible by anyone with comment access
   */
  canCreateThread(): boolean {
    return true;
  }

  /**
   * Auth: should be possible by anyone with comment access
   */
  canAddComment(_thread: ThreadData): boolean {
    return true;
  }

  /**
   * Auth: should be possible by anyone with comment access
   */
  canLeaveReaction(_comment: CommentData): boolean {
    return true;
  }

  /**
   * Auth: should only be possible by the comment author
   */
  canUpdateComment(comment: CommentData): boolean {
    return comment.userId === this.userId;
  }

  /**
   * Auth: should be possible by the comment author OR an editor of the document
   */
  canDeleteComment(comment: CommentData): boolean {
    return comment.userId === this.userId || this.role === "editor";
  }

  /**
   * Auth: should only be possible by an editor of the document
   */
  canDeleteThread(_thread: ThreadData): boolean {
    return this.role === "editor";
  }

  /**
   * Auth: should be possible by anyone with comment access
   */
  canResolveThread(_thread: ThreadData): boolean {
    return true;
  }

  /**
   * Auth: should be possible by anyone with comment access
   */
  canUnresolveThread(_thread: ThreadData): boolean {
    return true;
  }
}
