import {
  PreviewPlaceholder,
  ReactCustomBlockRenderProps,
  SourceBlockWithPreview,
} from "@blocknote/react";
import { useEffect, useState } from "react";
import { SiMermaid } from "react-icons/si";

import { plainContentToString } from "@blocknote/core";
import { renderDiagram } from "../../../helpers/renderDiagram.js";
import { getDiagramDictionary } from "../../../i18n/dictionary.js";
import { DiagramBlockConfig } from "../../createReactDiagramBlockSpec.js";

/**
 * Renders the Mermaid source to an SVG string. The current diagram (or the
 * last valid one, when the source has an error) stays up until the new one
 * has fully rendered, and swapping inline SVG commits in a single frame - so
 * the preview never flashes.
 */
export function useDiagramSVG(source: string, fontFamilyElement?: Element) {
  const [svg, setSVG] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);
  const [failure, setFailure] = useState<{ cause: unknown }>();

  useEffect(() => {
    if (!source.trim()) {
      // Clear the previous render when the external source becomes empty.
      // eslint-disable-next-line react/set-state-in-effect
      setSVG("");
      // eslint-disable-next-line react/set-state-in-effect
      setError(undefined);

      return;
    }

    // Read the font at render time, not at mount - the computed font is
    // themeable via CSS, so a memoized read would go stale on theme changes.
    const fontFamily = fontFamilyElement
      ? getComputedStyle(fontFamilyElement).fontFamily
      : undefined;

    // Rendering is asynchronous, so bail out if the source changed (or the
    // block was removed) before it finished.
    let stale = false;
    void renderDiagram(source, { fontFamily })
      .then((result) => {
        if (stale) {
          return;
        }
        if (result.error !== undefined) {
          setError(result.error);
        } else {
          setSVG(result.svg);
          setError(undefined);
        }
      })
      .catch((cause: unknown) => {
        if (!stale) {
          // Unexpected failures belong to the host's React error boundary, not
          // the source-error UI. Never expose arbitrary exception messages there.
          setFailure({ cause });
        }
      });

    return () => {
      stale = true;
    };
  }, [source, fontFamilyElement]);

  if (failure) {
    throw failure.cause;
  }

  return { svg, error };
}
export const DiagramBlockPreviewWithPopup = (
  props: ReactCustomBlockRenderProps<DiagramBlockConfig>,
) => {
  const source = plainContentToString(props.block.content).trim();
  // Diagrams render in the editor's computed font, so they match the document
  // they live in - the block renders inside the editor, so the element is
  // mounted by the time the hook's effect reads its style.
  const { svg, error } = useDiagramSVG(source, props.editor.domElement);
  const dict = getDiagramDictionary(props.editor).block;

  return (
    <SourceBlockWithPreview
      block={props.block}
      editor={props.editor}
      contentRef={props.contentRef}
      source={source}
      // `undefined` while nothing has rendered successfully, so an error
      // shows the error state instead of an empty preview.
      preview={
        svg ? (
          <div
            // Center diagrams narrower than the editor.
            style={{ display: "flex", justifyContent: "center" }}
            role="img"
            aria-label={dict.preview_label}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : undefined
      }
      error={error}
      errorPreview={
        <PreviewPlaceholder
          error
          icon={<SiMermaid />}
          text={dict.preview_error_text}
        />
      }
      emptySourcePlaceholder={
        <PreviewPlaceholder icon={<SiMermaid />} text={dict.add_source_text} />
      }
      sourcePlaceholder={dict.input_placeholder}
    />
  );
};
