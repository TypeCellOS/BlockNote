import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { PDFExporter, pdfDefaultSchemaMappings } from "@blocknote/pdf";
import { useCreateBlockNote } from "@blocknote/react";
import { PDFViewer } from "@react-pdf/renderer";
import { useEffect, useState } from "react";
import "./styles.css";

export default function App() {
  // Stores the editor's contents as HTML.
  const [pdfDocument, setPDFDocument] = useState<any>();

  // Creates a new editor instance with some initial content.
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "paragraph",
        content: [
          "Hello, ",
          {
            type: "text",
            text: "world!",
            styles: {
              bold: true,
            },
          },
        ],
      },
    ],
  });

  const onChange = async () => {
    const exporter = new PDFExporter(
      editor.schema,
      pdfDefaultSchemaMappings as any
    );
    // Converts the editor's contents from Block objects to HTML and store to state.
    const pdfDocument = await exporter.toReactPDFDocument(editor.document);
    setPDFDocument(pdfDocument);

    // const buffer = await ReactPDF.renderToBuffer(pdfDocument);
  };

  useEffect(() => {
    onChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renders the editor instance, and its contents as HTML below.
  return (
    <div className="wrapper">
      <div>Input (BlockNote Editor):</div>
      <div className="item">
        <BlockNoteView editor={editor} onChange={onChange} />
      </div>
      <div>Output (PDF):</div>
      <PDFViewer height={1000}>{pdfDocument}</PDFViewer>
    </div>
  );
}
