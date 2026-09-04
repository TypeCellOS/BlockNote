/**
 * A portal mount target.
 *
 * - `HTMLElement` — used as-is.
 * - `string` — treated as a CSS selector and resolved via `document.querySelector`.
 * - `null` — explicit `document.body` (escape any ancestor stacking context).
 */
export type PortalElement = HTMLElement | string | null;

/**
 * Per-element portal targets for BlockNote's floating UI. Keys mirror the
 * default UI element flags on `BlockNoteView`.
 *
 * `default` is the fallback used for any element whose key is omitted. If
 * `default` is also omitted, floating UI portals into the editor's
 * `bn-container` element.
 */
export type PortalElementsMap = {
  default?: PortalElement;
  formattingToolbar?: PortalElement;
  linkToolbar?: PortalElement;
  slashMenu?: PortalElement;
  emojiPicker?: PortalElement;
  sideMenu?: PortalElement;
  filePanel?: PortalElement;
  tableHandles?: PortalElement;
  comments?: PortalElement;
  attributionTooltip?: PortalElement;
};

export type PortalElementKey = Exclude<keyof PortalElementsMap, "default">;

export function resolvePortalElement(
  target: PortalElement | undefined,
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
