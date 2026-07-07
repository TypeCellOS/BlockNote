/**
 * State of & actions on the source popup of a block or inline content with a
 * preview. Returned by `useSourceBlockPreviewPopup` and
 * `useSourceInlineContentPreviewPopup`.
 */
export type SourcePreviewPopup = {
  /**
   * Whether the source popup is open.
   */
  isOpen: boolean;
  /**
   * Whether the block/inline content is selected, i.e. whether its preview is
   * highlighted.
   */
  isSelected: boolean;
  /**
   * Opens the popup, moves the cursor into the source, and focuses the
   * editor. Does nothing when the editor isn't editable.
   */
  open: () => void;
  /**
   * Closes the popup.
   */
  close: () => void;
};
