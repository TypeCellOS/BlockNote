// Set once we've checked the viewport meta tag, so the warning below fires at
// most once per page rather than on every editor mount.
let hasCheckedViewportMeta = false;

/**
 * Warns (once) if the page's viewport meta tag is missing
 * `interactive-widget=resizes-content`. Without it, browsers shrink only the
 * visual viewport when the on-screen keyboard opens, so the mobile Formatting
 * Toolbar (and other `position: fixed` UI) can end up hidden behind the
 * keyboard. See https://www.blocknotejs.org/docs/getting-started#mobile-compatibility
 *
 * Called when the editor view mounts (see `BlockNoteViewEditor`), on every
 * device: the page is misconfigured regardless of who opens it, and the
 * developer reads the console on desktop, not on the phone. Development builds
 * only: the consumer's bundler replaces `process.env.NODE_ENV` (the library
 * build leaves it in place); without a bundler `process` is undefined and the
 * check runs.
 *
 * Not exported from the package on purpose (this module is not re-exported
 * from `index.ts`): it is a mount-time check, not API.
 */
export function warnIfViewportMetaMisconfigured() {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "production") {
    return;
  }
  if (hasCheckedViewportMeta || typeof document === "undefined") {
    return;
  }
  hasCheckedViewportMeta = true;

  const content =
    document.querySelector('meta[name="viewport"]')?.getAttribute("content") ??
    "";

  // Strip whitespace so `initial-scale=1, interactive-widget=resizes-content`
  // (and any stray spaces) still match.
  if (
    !content.replace(/\s/g, "").includes("interactive-widget=resizes-content")
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      `[BlockNote] This page's viewport meta tag is missing "interactive-widget=resizes-content" in its content attribute. Add it to ensure proper mobile functionality, e.g. <meta name="viewport" content="width=device-width, initial-scale=1, interactive-widget=resizes-content">. See https://www.blocknotejs.org/docs/getting-started#mobile-compatibility for more information`,
    );
  }
}
