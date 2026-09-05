import {
  PreviewPlaceholder,
  ReactCustomBlockRenderProps,
  SourceBlockWithPreview,
} from "@blocknote/react";
import mermaid from "mermaid";
import { useEffect, useState } from "react";
import { SiMermaid } from "react-icons/si";

import { plainContentToString } from "@blocknote/core";
import { initializeMermaid } from "../../../helpers/initializeMermaid.js";
import { withSVGFontFamily } from "../../../helpers/svgFontFamily.js";
import { trimDiagramSVG } from "../../../helpers/trimDiagramSVG.js";
import { getDiagramDictionary } from "../../../i18n/dictionary.js";
import { DiagramBlockConfig } from "../../createReactDiagramBlockSpec.js";

// Each render call needs its own element ID.
let mermaidElementId = 0;

/**
 * Renders the Mermaid source to an SVG string. The current diagram (or the
 * last valid one, when the source has an error) stays up until the new one
 * has fully rendered, and swapping inline SVG commits in a single frame - so
 * the preview never flashes.
 */
export const useMermaidSVG = (source: string, fontFamilyElement?: Element) => {
  const [svg, setSVG] = useState("");
  const [error, setError] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!source.trim()) {
      setSVG("");
      setError(undefined);

      return;
    }

    initializeMermaid();

    // Read the font at render time, not at mount - the computed font is
    // themeable via CSS, so a memoized read would go stale on theme changes.
    const fontFamily = fontFamilyElement
      ? getComputedStyle(fontFamilyElement).fontFamily
      : undefined;

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
          // Diagrams display in the editor's own font (see
          // `setSVGFontFamily`) - the same treatment the export renderers
          // apply, so the preview shows what exports produce.
          const trimmed = trimDiagramSVG(svg);
          setSVG(fontFamily ? withSVGFontFamily(trimmed, fontFamily) : trimmed);
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
  }, [source, fontFamilyElement]);

  return { svg, error };
};
export const DiagramBlockPreviewWithPopup = (
  props: ReactCustomBlockRenderProps<DiagramBlockConfig>,
) => {
  const source = plainContentToString(props.block.content).trim();
  // Diagrams render in the editor's computed font, so they match the document
  // they live in - the block renders inside the editor, so the element is
  // mounted by the time the hook's effect reads its style.
  const { svg, error } = useMermaidSVG(source, props.editor.domElement);
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
            // Centers the diagram - Mermaid's SVG is left-aligned otherwise.
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
