/**
 * How the keyboard treats a block, as far as it differs from an ordinary
 * paragraph.
 *
 * When settings meet, they are applied in this order:
 * - `enter: "line-break"` first: Enter then never splits or resets the block.
 * - `emptyEnterResets` before `enter: "into-children"`: Enter in an empty
 *   block resets it, even when its Enter otherwise goes into its children.
 * - A child's `emptyEnterResets` before its parent's `emptyChildEnter`.
 * - `enter: "into-children"` before `splitKeepsType`: the new first child is a
 *   paragraph.
 * - Enter at the start of non-empty content always inserts an empty block
 *   above it, so the block keeps its id, type and props.
 */
export type BlockKeyboard = {
  /**
   * What Enter does in the block's content.
   * - `"split"`: splits the block. The text after the caret goes into a new
   *   block after it.
   * - `"into-children"`: the text after the caret goes into a new first child.
   * - `"line-break"`: inserts a line break (a `"\n"` in `content: "plain"`
   *   blocks). Shift-Enter then does the same.
   * @default "split"
   */
  enter: "split" | "into-children" | "line-break";
  /**
   * What Shift-Enter does in the block's content.
   * @default "line-break"
   */
  shiftEnter: "line-break" | "same-as-enter";
  /**
   * Whether a block created by splitting this one with Enter has the same type,
   * as in lists. Also applies to the empty block Enter inserts above the
   * block's content. New blocks always get default props.
   * @default false
   */
  splitKeepsType: boolean;
  /**
   * What the block turns into when it is reset: by Backspace at the start of
   * its content, and by Enter in an empty block when `emptyEnterResets` is set.
   * Its content and children are kept. `props` are merged into the block's
   * props, so return the block's own type to only change props.
   * @default { type: "paragraph" }
   */
  resetsTo: { type: string; props?: Record<string, unknown> };
  /**
   * Whether Enter in the empty block resets it (see `resetsTo`), as when an
   * empty list item turns into a paragraph.
   * @default false
   */
  emptyEnterResets: boolean;
  /**
   * What Enter does in an empty child of this block.
   * - `"outdent"`: any empty child is outdented, as for nested blocks
   *   (needs `childrenCanOutdent`).
   * - `"exit-at-end"`: an empty last child moves out to after this block, as
   *   for containers. An empty child elsewhere gets a new child after it.
   * - `"stay"`: an empty child always gets a new child after it.
   * @default "outdent", or "exit-at-end" for container blocks
   */
  emptyChildEnter: "outdent" | "exit-at-end" | "stay";
  /**
   * Whether this block's children can be outdented out of it: Shift-Tab, the
   * unnest button, and the outdent that Backspace and Enter do at the start of
   * an empty or nested block. A container's children can never be outdented,
   * so this has no effect on containers.
   * @default true, or false for container blocks
   */
  childrenCanOutdent: boolean;
};

/**
 * The `keyboard` option of a block implementation: the settings that differ
 * from the defaults, or a function of the block that returns them, so they can
 * depend on the block's props (a toggle heading vs. a regular heading) or on
 * view state the block owns (whether a toggle is open).
 */
export type BlockKeyboardOption<TBlock> =
  | Partial<BlockKeyboard>
  // Declared as a method so a spec for a specific block type still fits where
  // a spec for any block is expected (method parameters are checked
  // bivariantly), like `meta.highlight`.
  | { keyboard(block: TBlock): Partial<BlockKeyboard> }["keyboard"];

/**
 * Fills in the defaults of a block's `keyboard` option. The result is what a
 * block spec in a schema holds: a function of the block that returns every
 * setting.
 * @internal
 */
export function createBlockKeyboard<TBlock>(
  option: BlockKeyboardOption<TBlock> | undefined,
  spec: {
    isContainer: boolean;
    /** The deprecated `meta.hardBreakShortcut`, read when set. */
    hardBreakShortcut: "shift+enter" | "enter" | "none" | undefined;
  },
): (block: TBlock) => BlockKeyboard {
  const { isContainer, hardBreakShortcut } = spec;
  const defaults: BlockKeyboard = {
    enter: hardBreakShortcut === "enter" ? "line-break" : "split",
    shiftEnter: hardBreakShortcut === "none" ? "same-as-enter" : "line-break",
    splitKeepsType: false,
    resetsTo: { type: "paragraph" },
    emptyEnterResets: false,
    // A container's children can't be outdented (the schema doesn't allow
    // them outside it), so an empty last child leaves it instead.
    emptyChildEnter: isContainer ? "exit-at-end" : "outdent",
    childrenCanOutdent: !isContainer,
  };
  if (typeof option === "function") {
    return (block) => ({ ...defaults, ...option(block) });
  }
  const keyboard = { ...defaults, ...option };
  return () => keyboard;
}
