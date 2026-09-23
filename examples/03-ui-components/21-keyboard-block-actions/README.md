# Keyboard Block Actions

A runnable interaction proposal for [#2854](https://github.com/TypeCellOS/BlockNote/issues/2854). Place the caret in a block and press **Shift+F10** (or the Context Menu key) to open its actions. Arrow keys move between actions. Escape or Tab closes the menu and returns to the same editor selection; Tab keeps its existing indentation behavior while editing.

This example uses BlockNote's public editor APIs, `BlockPopover`, and the same Mantine menu primitives and `bn-menu-*` classes as the default adapter. It does not change library shortcuts or the hover side menu. The explicit “Block actions” button makes the interaction discoverable without requiring the shortcut.

It reuses an existing Mantine provider when embedded in the playground and supplies one when run independently. It also loads Mantine's core styles for the demo controls outside the editor, matching the playground setup.

The proposal covers one current block, including a nested block and its children. Multi-block selections, IME composition, and read-only editors do not intercept the shortcut. Selecting multiple blocks disables the visible action button and explains that the actions support one block at a time. Dismissing by clicking elsewhere preserves the newly clicked focus target. Deleting a block moves the caret to a surviving neighbor; duplication regenerates IDs for every descendant. Opening or cancelling the menu does not create an undo entry.

The menu intentionally demonstrates three structural actions rather than claiming full parity with the existing drag-handle menu. Color submenus, all three UI adapters, shortcut documentation/localization, and the final library API need maintainer agreement before promoting this example into a default behavior.

**Try it out:**

1. Put the caret in the middle of a sentence. Open the menu and press Escape, then type: the caret should be unchanged.
2. Open again, use the arrow keys, and duplicate a nested block. Its content and children are copied with fresh IDs.
3. Delete a block and use the editor's Undo shortcut.
4. Toggle read-only mode. The action button is disabled and Shift+F10 is left to the browser.
5. Select text across multiple blocks. The disabled button explains the unsupported selection; collapse the selection to use the actions again.

The browser regressions import this example directly and exercise keyboard focus, exact caret restoration, indentation, nested identities, Undo, unsupported selections, and narrow layout. Run them with the repository's Docker runner: `pnpm e2e keyboard-block-actions --retry=0 --maxWorkers=1`.

**Relevant Docs:**

- [Side Menu](/docs/react/components/side-menu)
- [Manipulating Content](/docs/reference/editor/manipulating-content)
