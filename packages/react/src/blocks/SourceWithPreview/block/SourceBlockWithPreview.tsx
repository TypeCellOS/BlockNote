import { ReactCustomBlockRenderProps } from "../../../schema/ReactBlockSpec.js";
import {
  SourceWithPreview,
  SourceWithPreviewProps,
} from "../SourceWithPreview.js";
import { useSourceBlockPreviewPopup } from "./useSourceBlockPreviewPopup.js";

export type SourceBlockWithPreviewProps = Pick<
  ReactCustomBlockRenderProps<any>,
  "block" | "editor"
> &
  // `contentRef` comes from the shared props rather than being picked from
  // `ReactCustomBlockRenderProps`, as it's conditional on the block's content
  // type there, which TypeScript can't resolve for a generic block config.
  SourceWithPreviewProps;

/**
 * Renders a block as a preview of its source content, with the editable
 * source in a popup. The popup is controlled via
 * {@link useSourceBlockPreviewPopup}, so the block's
 * `SourceBlockWithPreviewExtension` (from `@blocknote/core`) must be registered
 * with the block spec. The caller only provides the preview itself, making this
 * the base for custom blocks rendered from source code (math, diagrams, etc).
 */
export const SourceBlockWithPreview = (props: SourceBlockWithPreviewProps) => {
  const { block, editor, ...shared } = props;

  const popup = useSourceBlockPreviewPopup({ editor, block });

  // Mirrors the `SourceBlockWithPreviewExtension` Enter handling: when the
  // block uses Enter for hard breaks (multi-line source, e.g. diagrams),
  // Enter inserts a newline instead of closing the popup.
  const enterSubmits =
    editor.schema.blockSpecs[block.type]?.implementation?.meta
      ?.hardBreakShortcut !== "enter";

  return (
    <SourceWithPreview
      editor={editor}
      popup={popup}
      enterSubmits={enterSubmits}
      {...shared}
    />
  );
};
