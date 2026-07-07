import {
  PreviewPlaceholder,
  ReactCustomBlockRenderProps,
  SourceBlockWithPreview,
} from "@blocknote/react";
import mermaid from "mermaid";
import { useEffect, useState } from "react";
import { SiMermaid } from "react-icons/si";

import { getDiagramPlainTextContent } from "../../shared/getDiagramPlainTextContent.js";
import { initializeMermaid } from "../../shared/initializeMermaid.js";
import { DiagramBlockConfig } from "../createDiagramBlockConfig.js";

// Each render call needs its own element ID.
let mermaidElementId = 0;

/**
 * Renders the Mermaid source to an SVG string. The current diagram (or the
 * last valid one, when the source has an error) stays up until the new one
 * has fully rendered, and swapping inline SVG commits in a single frame - so
 * the preview never flashes.
 */
export const useMermaidSVG = (source: string) => {
  const [svg, setSVG] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!source.trim()) {
      setSVG("");
      setError(undefined);

      return;
    }

    initializeMermaid();

    // Rendering is asynchronous, so bail out if the source changed (or the
    // block was removed) before it finished.
    let stale = false;
    void (async () => {
      // The rendered SVG carries the given ID into the document, and Mermaid
      // removes any existing element with that ID when rendering. So each
      // render gets a fresh ID - reusing one makes Mermaid yank the displayed
      // diagram out of the page mid-render.
      const id = `mermaid-preview-${mermaidElementId++}`;
      try {
        await mermaid.parse(source);
        const { svg } = await mermaid.render(id, source);
        if (!stale) {
          setSVG(svg);
          setError(undefined);
        }
      } catch (err) {
        if (!stale) {
          setError(err instanceof Error ? err.message : String(err));
        }
      }
    })();

    return () => {
      stale = true;
    };
  }, [source]);

  return { svg, error };
};
export const DiagramBlockPreviewWithPopup = (
  props: ReactCustomBlockRenderProps<DiagramBlockConfig>,
) => {
  const source = getDiagramPlainTextContent(props.block.content).trim();
  const { svg, error } = useMermaidSVG(source);

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
            // Centers the diagram - Mermaid's SVG is left-aligned otherwise.
            style={{ display: "flex", justifyContent: "center" }}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : undefined
      }
      error={error}
      emptySourcePlaceholder={
        <PreviewPlaceholder icon={<SiMermaid />} text="Add a Mermaid diagram" />
      }
    />
  );
};
