import { CommentData, ThreadData } from "../types.js";
import { ThreadStoreAuth } from "./ThreadStoreAuth.js";

/*
 * The DefaultThreadStoreAuth class defines the authorization rules for interacting with comments.
 * We take a role ("comment" or "editor") and implement the rules.
 *
 * This class is then used in the UI to show / hide specific interactions.
 *
 * Rules:
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
    private readonly role: "comment" | "editor",
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

  /**
   * Auth: should be possible by anyone with comment access
   *
   * Note: will also check if the user has already reacted with the same emoji. TBD: is that a nice design or should this responsibility be outside of auth?
   */
  canAddReaction(comment: CommentData, emoji?: string): boolean {
    if (!emoji) {
      return true;
    }

    return !comment.reactions.some(
      (reaction) =>
        reaction.emoji === emoji && reaction.userIds.includes(this.userId),
    );
  }

  /**
   * Auth: should be possible by anyone with comment access
   *
   * Note: will also check if the user has already reacted with the same emoji. TBD: is that a nice design or should this responsibility be outside of auth?
   */
  canDeleteReaction(comment: CommentData, emoji?: string): boolean {
    if (!emoji) {
      return true;
    }

    return comment.reactions.some(
      (reaction) =>
        reaction.emoji === emoji && reaction.userIds.includes(this.userId),
    );
  }
}
