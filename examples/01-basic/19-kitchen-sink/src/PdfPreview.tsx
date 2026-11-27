import { useEffect, useState } from "react";
import {
  PDFExporter,
  typstDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter";
import compilerWasmUrl from "@blocknote/xl-typst-compiler/wasm?url";
import { diagramBlockMapping } from "@blocknote/diagram-block/typst-exporter";
import {
  inlineMathMapping,
  mathBlockMapping,
} from "@blocknote/math-block/typst-exporter";
import type { KitchenSinkEditor } from "./schema.js";

type Preview =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; url: string };

export function PdfPreview({ editor }: { editor: KitchenSinkEditor }) {
  const [blocks, setBlocks] = useState(() => editor.document);
  const [preview, setPreview] = useState<Preview>({ status: "loading" });

  // Debounce document snapshots so typing does not trigger an export per keystroke.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const unsubscribe = editor.onChange(() => {
      clearTimeout(timer);
      timer = setTimeout(() => setBlocks(editor.document), 600);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [editor]);

  useEffect(() => {
    let stale = false;
    let url: string | undefined;

    // eslint-disable-next-line react/set-state-in-effect -- Expose the loading transition as soon as a new export starts.
    setPreview({ status: "loading" });

    async function render() {
      // Each export gets a fresh asset registry rather than accumulating old assets.
      const exporter = new PDFExporter(
        editor.schema,
        {
          ...typstDefaultSchemaMappings,
          blockMapping: {
            ...typstDefaultSchemaMappings.blockMapping,
            mathBlock: mathBlockMapping,
            diagram: diagramBlockMapping,
          },
          inlineContentMapping: {
            ...typstDefaultSchemaMappings.inlineContentMapping,
            math: inlineMathMapping,
          },
        },
        { wasm: compilerWasmUrl },
      );

      const result = await exporter.toPDF(blocks, {
        title: "Kitchen sink",
        lang: "en",
      });

      if (stale) {
        return;
      }

      if (result.error) {
        setPreview({ status: "error" });

        return;
      }

      url = URL.createObjectURL(result.blob);

      setPreview({ status: "ready", url });
    }

    void render();

    // Ignore outdated exports and release the previous preview URL.
    return () => {
      stale = true;

      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [editor, blocks]);

  return (
    <section className="kitchen-sink-pdf" aria-label="PDF export">
      <header className="kitchen-sink-panel-header">
        <h2 className="kitchen-sink-panel-title">PDF export</h2>
        {preview.status === "ready" && (
          <a
            className="kitchen-sink-download"
            href={preview.url}
            download="kitchen-sink.pdf"
          >
            Download PDF
          </a>
        )}
      </header>

      {preview.status !== "ready" && (
        <p className="kitchen-sink-export-status" role="status">
          {preview.status === "loading"
            ? "Generating PDF…"
            : "There was an error converting this document to PDF."}
        </p>
      )}

      {preview.status === "ready" && (
        <iframe
          className="kitchen-sink-pdf-frame"
          title="Exported document PDF"
          src={preview.url}
        />
      )}
    </section>
  );
}
