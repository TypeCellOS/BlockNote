import { testDocumentBlocks } from "./testDocumentBlocks";
import {
  Block,
  BlockNoteSchema,
  combineByGroup,
  withPageBreak,
} from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import * as locales from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { createReactDiagramBlockSpec } from "@blocknote/diagram-block";
import { diagramBlockMapping } from "@blocknote/diagram-block/typst-exporter";
import {
  createReactInlineMathSpec,
  createReactMathBlockSpec,
} from "@blocknote/math-block";
import {
  inlineMathMapping,
  mathBlockMapping,
} from "@blocknote/math-block/typst-exporter";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getPageBreakReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  PDFExporter,
  typstDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter";
import {
  getMultiColumnSlashMenuItems,
  locales as multiColumnLocales,
  multiColumnDropCursor,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
// Bundle the Typst compiler wasm explicitly (it would otherwise load from
// the package's own files - also CDN-free - but an explicit URL keeps the
// bundling visible in this example).
// Fonts need no setup: the exporter's bundled defaults (Inter, Geist Mono,
// math, emoji - matching the editor) load lazily from the package.
import compilerWasmUrl from "@blocknote/xl-typst-compiler/wasm?url";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./styles.css";

/**
 * Exports the given document to a PDF/UA object URL, re-exporting whenever
 * `blocks` changes.
 *
 * The effect-with-cleanup idiom keeps only the newest result: when a newer
 * version (or unmount) invalidates the effect, the cleanup marks the running
 * export stale and its result is dropped. Overlapping exports are *safe* -
 * the exporter serializes its shared compile stage internally - but like any
 * async calls they may complete out of call order, and which result to
 * display is this component's concern, not the exporter's.
 */
function usePdfUA(
  makeExporter: () => PDFExporter<any, any, any>,
  blocks: Block<any, any, any>[],
) {
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let stale = false;
    setStatus("loading");
    void (async () => {
      try {
        const result = await makeExporter().toBlob(
          blocks,
          { wasm: compilerWasmUrl },
          { title: "BlockNote document", lang: "en" },
        );
        if (stale) {
          return;
        }
        // A document that fails to compile (e.g. text no supplied font
        // covers) is an expected outcome, reported in the result.
        if (result.error) {
          // eslint-disable-next-line no-console
          console.error(
            "PDF export failed:",
            result.compileErrors.map((d) => d.message).join("; "),
          );
          setStatus("error");
          return;
        }
        // A nonconforming document (e.g. one not starting with an H1) still
        // exports - tagged but without the PDF/UA-1 claim; surface why.
        if (!result.pdfUA.declared && result.pdfUA.reason === "nonconforming") {
          // eslint-disable-next-line no-console
          console.info(
            "Exported without PDF/UA-1 declaration:",
            result.pdfUA.violations.map((v) => v.message).join("; "),
          );
        }
        setPdfUrl(URL.createObjectURL(result.blob));
        setStatus("ready");
      } catch (e) {
        if (stale) {
          return;
        }
        // eslint-disable-next-line no-console
        console.error(e);
        setStatus("error");
      }
    })();
    return () => {
      stale = true;
    };
  }, [makeExporter, blocks]);

  // Each object URL is revoked when replaced by the next one (and the last
  // one on unmount).
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  return { pdfUrl, status };
}

export default function App() {
  // Creates a new editor instance with support for page breaks.
  const editor = useCreateBlockNote({
    // Adds support for math & diagram blocks.
    schema: withMultiColumn(withPageBreak(BlockNoteSchema.create())).extend({
      blockSpecs: {
        mathBlock: createReactMathBlockSpec(),
        diagram: createReactDiagramBlockSpec(),
      },
      inlineContentSpecs: {
        math: createReactInlineMathSpec(),
      },
    }),
    dropCursor: multiColumnDropCursor,
    dictionary: {
      ...locales.en,
      multi_column: multiColumnLocales.en,
    },
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
    initialContent: [
      ...testDocumentBlocks,
      // The math & diagram blocks aren't part of the shared test document,
      // since the exporter unit tests' schemas don't register them, so they're
      // appended here instead.
      {
        type: "mathBlock",
        content: "a^2 = \\sqrt{b^2 + c^2}",
      },
      {
        type: "diagram",
        content: `graph TD
  A[Start] --> B{Works?}
  B -->|Yes| C[Ship it]
  B -->|No| A`,
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Inline math: ",
            styles: {},
          },
          {
            type: "math",
            content: "e^{i\\pi} + 1 = 0",
          },
        ],
      },
    ],
  });

  // Additional Slash Menu items for page breaks.
  const getSlashMenuItems = useMemo(
    () => async (query: string) =>
      filterSuggestionItems(
        combineByGroup(
          getDefaultReactSlashMenuItems(editor),
          getPageBreakReactSlashMenuItems(editor),
          getMultiColumnSlashMenuItems(editor),
        ),
        query,
      ),
    [editor],
  );

  // A fresh exporter per export: its asset registry is append-only for the
  // exporter's lifetime, so reusing one across re-exports would accumulate
  // every image/diagram variant it has ever rendered.
  const makeExporter = useCallback(
    () =>
      new PDFExporter(editor.schema, {
        ...typstDefaultSchemaMappings,
        blockMapping: {
          ...typstDefaultSchemaMappings.blockMapping,
          // Renders math blocks as native Typst equations, and diagrams as
          // embedded images - both carrying alt text for PDF/UA.
          mathBlock: mathBlockMapping,
          diagram: diagramBlockMapping,
        },
        inlineContentMapping: {
          ...typstDefaultSchemaMappings.inlineContentMapping,
          math: inlineMathMapping,
        },
      }),
    [editor],
  );

  // The document snapshot driving the export - the export effect depends on
  // the data it exports. Updated debounced: reading `editor.document`
  // converts the whole document to blocks, so it shouldn't run (and the
  // export shouldn't restart) on every keystroke.
  const [blocks, setBlocks] = useState(() => editor.document);
  const { pdfUrl, status } = usePdfUA(makeExporter, blocks);

  const debounceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(debounceTimer.current), []);
  const onChange = () => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setBlocks(editor.document), 600);
  };

  const onDownloadClick = () => {
    if (!pdfUrl) {
      return;
    }
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = "blocknote (pdf-ua).pdf";
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const label =
    status === "loading"
      ? "Generating…"
      : status === "error"
        ? "Export failed (see console)"
        : "✓ Tagged PDF/UA-1";

  return (
    <div className="views">
      <div className="view-wrapper">
        <div className="view-label">Editor Input</div>
        <div className="view">
          <BlockNoteView editor={editor} slashMenu={false} onChange={onChange}>
            <SuggestionMenuController
              triggerCharacter={"/"}
              getItems={getSlashMenuItems}
            />
          </BlockNoteView>
        </div>
      </div>
      <div className="view-wrapper">
        <div className="view-label">
          {label}
          <button
            type="button"
            className="view-label-download"
            onClick={onDownloadClick}
          >
            Download
          </button>
        </div>
        <div className="view">
          {pdfUrl ? (
            <iframe
              title="PDF/UA output"
              height="100%"
              width="100%"
              src={pdfUrl}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
