import { memo } from "react";

// Keep the KaTeX DOM in place when selecting a formula rerenders its node view.
// Replacing the element under the pointer between mousedown and mouseup can
// prevent the browser from dispatching a click to the preview.
export const MathPreview = memo(function MathPreview(props: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: props.html }} />;
});
