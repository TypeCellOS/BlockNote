import { ReactCustomInlineContentRenderProps } from "../../../schema/ReactInlineContentSpec.js";
import {
  SourceWithPreview,
  SourceWithPreviewProps,
} from "../SourceWithPreview.js";
import { useSourceInlineContentPreviewPopup } from "./useSourceInlineContentPreviewPopup.js";

export type SourceInlineContentWithPreviewProps = Pick<
  ReactCustomInlineContentRenderProps<any, any>,
  "editor" | "node" | "getPos"
> &
  SourceWithPreviewProps;

/**
 * Renders inline content as a preview of its source, with the editable source
 * in a popup - the inline counterpart of `SourceBlockWithPreview`. The popup
 * is controlled via {@link useSourceInlineContentPreviewPopup}, so the inline
 * content's `SourceInlineContentWithPreviewExtension` must be registered with
 * the inline content spec. Unlike blocks, the popup is open exactly while the
 * selection is inside the inline content's source, which is the same
 * condition that marks it as selected.
 */
export const SourceInlineContentWithPreview = (
  props: SourceInlineContentWithPreviewProps,
) => {
  const { editor, node, getPos, ...shared } = props;

  const popup = useSourceInlineContentPreviewPopup({ editor, node, getPos });

  return <SourceWithPreview inline editor={editor} popup={popup} {...shared} />;
};
