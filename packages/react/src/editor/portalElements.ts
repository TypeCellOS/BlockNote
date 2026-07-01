/**
 * A portal mount target.
 *
 * - `HTMLElement` — used as-is.
 * - `string` — treated as a CSS selector and resolved via `document.querySelector`.
 * - `null` — explicit `document.body` (escape any ancestor stacking context).
 */
export type PortalTarget = HTMLElement | string | null;

/**
 * Per-element portal targets for BlockNote's floating UI. Keys mirror the
 * default UI element flags on `BlockNoteView`.
 *
 * `default` is the fallback used for any element whose key is omitted, and is
 * also where `editor.portalElement` itself is mounted. Elements that omit a
 * specific entry inherit `default`; if `default` is also omitted, the editor's
 * `bn-container` element is used.
 */
export type PortalElementsMap = {
  default?: PortalTarget;
  formattingToolbar?: PortalTarget;
  linkToolbar?: PortalTarget;
  slashMenu?: PortalTarget;
  emojiPicker?: PortalTarget;
  sideMenu?: PortalTarget;
  filePanel?: PortalTarget;
  tableHandles?: PortalTarget;
  comments?: PortalTarget;
  suggestionMarksTooltip?: PortalTarget;
};

export type PortalElementKey = Exclude<keyof PortalElementsMap, "default">;

export function resolvePortalTarget(
  target: PortalTarget | undefined,
): HTMLElement | undefined {
  if (target === undefined) {
    return undefined;
  }
  if (target === null) {
    return typeof document !== "undefined" ? document.body : undefined;
  }
  if (typeof target === "string") {
    if (typeof document === "undefined") {
      return undefined;
    }
    const el = document.querySelector(target);
    if (!el) {
      // eslint-disable-next-line no-console
      console.warn(
        `[BlockNote] portalElements selector "${target}" did not match any element`,
      );
      return undefined;
    }
    return el as HTMLElement;
  }
  return target;
}
