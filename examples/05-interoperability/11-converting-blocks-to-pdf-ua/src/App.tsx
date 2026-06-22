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
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getPageBreakReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  TypstExporter,
  blocksToPdfUA,
  typstDefaultSchemaMappings,
} from "@blocknote/xl-pdf-renderer-2";
// Bundle the Typst compiler wasm so it resolves locally (no CDN / importer).
import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";
// Bundle BlockNote's fonts (Inter + Geist Mono) + an emoji font so the export
// matches the editor and works fully offline.
import interRegular from "./fonts/Inter_18pt-Regular.ttf?url";
import interItalic from "./fonts/Inter_18pt-Italic.ttf?url";
import interBold from "./fonts/Inter_18pt-Bold.ttf?url";
import interBoldItalic from "./fonts/Inter_18pt-BoldItalic.ttf?url";
import geistMono from "./fonts/GeistMono-Regular.ttf?url";
import notoEmoji from "./fonts/NotoEmoji-Regular.ttf?url";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./styles.css";

// Fetch the bundled fonts once and reuse them across exports.
const FONT_URLS = [
  interRegular,
  interItalic,
  interBold,
  interBoldItalic,
  geistMono,
  notoEmoji,
];
let fontsPromise: Promise<Uint8Array[]> | undefined;
function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all(
      FONT_URLS.map((url) =>
        fetch(url)
          .then((r) => r.arrayBuffer())
          .then((b) => new Uint8Array(b)),
      ),
    );
  }
  return fontsPromise;
}

export default function App() {
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const urlRef = useRef<string>();
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  // Creates a new editor instance with support for page breaks.
  const editor = useCreateBlockNote({
    schema: withPageBreak(BlockNoteSchema.create()),
    dictionary: locales.en,
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
    initialContent: [
      {
        type: "heading",
        props: { level: 1 },
        content: "Accessible PDF export",
      },
      {
        type: "paragraph",
        content: [
          { type: "text", text: "This document exports to a ", styles: {} },
          { type: "text", text: "tagged PDF/UA-1", styles: { bold: true } },
          {
            type: "text",
            text: " file that screen readers can navigate. ",
            styles: {},
          },
          {
            type: "link",
            content: "Learn more",
            href: "https://www.blocknotejs.org",
          },
        ],
      },
      { type: "heading", props: { level: 2 }, content: "Highlights" },
      {
        type: "bulletListItem",
        content: "Headings, paragraphs and lists are exposed semantically",
        children: [
          {
            type: "bulletListItem",
            content: "Nested lists become real L › LI structures",
          },
          { type: "numberedListItem", content: "So do numbered lists" },
        ],
      },
      { type: "checkListItem", props: { checked: true }, content: "Links" },
      { type: "checkListItem", content: "Tables with header rows" },
      {
        type: "paragraph",
        props: { backgroundColor: "blue", textAlignment: "center" },
        content: [
          {
            type: "text",
            text: "Colors and alignment are preserved too",
            styles: { italic: true },
          },
        ],
      },
      {
        type: "table",
        content: {
          type: "tableContent",
          rows: [
            { cells: ["Quarter", "Revenue"] },
            { cells: ["Q1", "$1.2M"] },
            { cells: ["Q2", "$1.4M"] },
          ],
        },
      },
      {
        type: "codeBlock",
        props: { language: "typescript" },
        content: `const pdf = await blocksToPdfUA(exporter, editor.document, {});`,
      },
      {
        type: "quote",
        content: "Accessibility is a baseline, not a feature.",
      },
      { type: "pageBreak" },
      {
        type: "image",
        props: {
          url: "https://placehold.co/600x300.png",
          caption: "Images export as tagged figures with alt text",
        },
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
        ),
        query,
      ),
    [editor],
  );

  // Exports the editor document to a PDF/UA-1 file (Typst wasm + post-process).
  const exportPdf = useCallback(async () => {
    setStatus("loading");
    try {
      const exporter = new TypstExporter(
        editor.schema,
        typstDefaultSchemaMappings,
        { title: "BlockNote document", lang: "en" },
      );
      const bytes = await blocksToPdfUA(exporter, editor.document, {
        getModule: () => compilerWasmUrl,
        fonts: await loadFonts(),
        preloadDefaultFonts: false,
      });
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" }),
      );
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
      urlRef.current = url;
      setPdfUrl(url);
      setStatus("ready");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      setStatus("error");
    }
  }, [editor]);

  // Export on mount, and clean up the object URL on unmount.
  useEffect(() => {
    void exportPdf();
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-export (debounced) whenever the document changes.
  const onChange = () => {
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => void exportPdf(), 600);
  };

  const onDownloadClick = () => {
    if (!urlRef.current) {
      return;
    }
    const link = document.createElement("a");
    link.href = urlRef.current;
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
          <span className="view-label-download" onClick={onDownloadClick}>
            Download
          </span>
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
