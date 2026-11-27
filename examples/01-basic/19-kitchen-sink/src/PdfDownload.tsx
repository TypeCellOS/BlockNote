import { useEffect, useRef, useState } from "react";
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

export function PdfDownload({
  editor,
  disabled,
}: {
  editor: KitchenSinkEditor;
  disabled: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const requestId = useRef(0);

  useEffect(
    () => () => {
      requestId.current++;
    },
    [],
  );

  async function downloadPdf() {
    const request = ++requestId.current;
    setStatus("loading");

    // Each click exports a snapshot with a fresh asset registry.
    try {
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

      const result = await exporter.toPDF(editor.document, {
        title: "Kitchen sink",
        lang: "en",
      });

      if (request !== requestId.current) {
        return;
      }

      if (result.error) {
        setStatus("error");
        return;
      }

      const link = document.createElement("a");
      link.href = URL.createObjectURL(result.blob);
      link.download = "kitchen-sink.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } finally {
      // Unexpected failures still propagate, but must not leave the button disabled.
      if (request === requestId.current) {
        setStatus((current) => (current === "loading" ? "idle" : current));
      }
    }
  }

  return (
    <>
      <button
        className="kitchen-sink-button kitchen-sink-download"
        type="button"
        disabled={disabled || status === "loading"}
        onClick={() => {
          void downloadPdf();
        }}
      >
        {status === "loading" ? "Generating PDF…" : "Download PDF"}
      </button>
      {status === "error" && (
        <p className="kitchen-sink-help" role="status">
          There was an error converting this document to PDF.
        </p>
      )}
    </>
  );
}
