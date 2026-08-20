import { testDocumentBlocks } from "../testDocumentBlocks";
import {
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
import {
  createReactInlineMathSpec,
  createReactMathBlockSpec,
} from "@blocknote/math-block";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getPageBreakReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  getMultiColumnSlashMenuItems,
  multiColumnDropCursor,
  locales as multiColumnLocales,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import {
  PDFExporter,
  pdfDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter";
import { diagramBlockMapping } from "@blocknote/diagram-block/pdf-exporter";
import {
  inlineMathMapping,
  mathBlockMapping,
} from "@blocknote/math-block/pdf-exporter";
import { pdf, PDFViewer } from "@react-pdf/renderer";
import { JSX, useEffect, useMemo, useReducer, useState } from "react";

import "./styles.css";

export default function App() {
  // Stores the editor's contents as JSX for download and displaying the PDF
  // using ReactPDF's `PDFViewer` component.
  const [pdfDocument, setPDFDocument] = useState<JSX.Element>();
  const [renders, forceRerender] = useReducer((s) => s + 1, 0);

  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    // Adds support for page breaks & multi-column blocks.
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
    // Adds support for advanced table features.
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
    // Sets initial editor content.
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

  // Additional Slash Menu items for page breaks and multi-column blocks.
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

  // Exports the editor document to PDF whenever it changes.
  const onChange = async () => {
    const exporter = new PDFExporter(editor.schema, {
      ...pdfDefaultSchemaMappings,
      blockMapping: {
        ...pdfDefaultSchemaMappings.blockMapping,
        // Embeds diagrams as images instead of their Mermaid source.
        diagram: diagramBlockMapping,
        // Renders math blocks as formulas instead of their LaTeX source.
        mathBlock: mathBlockMapping,
      },
      inlineContentMapping: {
        ...pdfDefaultSchemaMappings.inlineContentMapping,
        // Renders inline math as formula images instead of its LaTeX source.
        math: inlineMathMapping,
      },
    });
    const pdfDocument = await exporter.toReactPDFDocument(editor.document);
    setPDFDocument(pdfDocument);
    forceRerender();
  };

  // Exports the inital editor document to PDF.
  useEffect(() => {
    void onChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Downloads the PDF.
  const onDownloadClick = async () => {
    const blob = await pdf(pdfDocument).toBlob();

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "My Document (blocknote export).pdf";
    document.body.appendChild(link);
    link.dispatchEvent(
      new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
      }),
    );
    link.remove();
    window.URL.revokeObjectURL(link.href);
  };

  // Renders the editor instance and PDF view.
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
          PDF Output
          <span className="view-label-download" onClick={onDownloadClick}>
            Download
          </span>
        </div>
        <div className="view">
          <PDFViewer key={renders} height={"100%"} width={"100%"}>
            {pdfDocument}
          </PDFViewer>
        </div>
      </div>
    </div>
  );
}
