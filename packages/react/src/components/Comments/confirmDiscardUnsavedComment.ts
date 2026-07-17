/**
 * Decides whether comment editor content may be discarded, prompting the user
 * for confirmation when there is unsaved content and confirmation is enabled.
 *
 * Used by the comment composers (new comment, reply and edit) when they're
 * dismissed (e.g. by clicking outside or pressing Escape), so the user doesn't
 * silently lose text they've typed.
 *
 * @returns `true` when it's safe to discard (nothing unsaved, confirmation
 * disabled, or the user accepted the prompt), and `false` when the user
 * cancelled and the editor should stay open.
 */
export function confirmDiscardUnsavedComment(opts: {
  /**
   * Whether the editor(s) being dismissed currently hold unsaved content.
   */
  hasUnsavedContent: boolean;
  /**
   * Whether the confirmation prompt is enabled (see the `confirmBeforeDiscard`
   * option on the comments extension).
   */
  confirmBeforeDiscard: boolean;
  /**
   * The message shown in the confirmation prompt.
   */
  message: string;
  /**
   * The confirm implementation. Defaults to `window.confirm`; injectable for
   * testing.
   */
  confirm?: (message: string) => boolean;
}): boolean {
  if (!opts.hasUnsavedContent || !opts.confirmBeforeDiscard) {
    return true;
  }

  const confirm = opts.confirm ?? ((message) => window.confirm(message));
  return confirm(opts.message);
}
