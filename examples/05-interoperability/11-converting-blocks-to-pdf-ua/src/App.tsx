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
import {
  getMultiColumnSlashMenuItems,
  locales as multiColumnLocales,
  multiColumnDropCursor,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
// Bundle the Typst compiler wasm so it resolves locally (no CDN / importer).
import compilerWasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";
// Bundle BlockNote's fonts (Inter + Geist Mono) + a color emoji font so the
// export matches the editor and works fully offline. Noto Color Emoji is the
// pure-COLRv1 build (~5MB), which Typst renders in color.
import interRegular from "./fonts/Inter_18pt-Regular.ttf?url";
import interItalic from "./fonts/Inter_18pt-Italic.ttf?url";
import interBold from "./fonts/Inter_18pt-Bold.ttf?url";
import interBoldItalic from "./fonts/Inter_18pt-BoldItalic.ttf?url";
import geistMono from "./fonts/GeistMono-Regular.ttf?url";
import notoColorEmoji from "./fonts/Noto-COLRv1.ttf?url";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./styles.css";

// Fetch the bundled fonts once and reuse them across exports. The emoji font is
// kept separate so it can be passed via the dedicated `emojiFont` option.
const BODY_FONT_URLS = [
  interRegular,
  interItalic,
  interBold,
  interBoldItalic,
  geistMono,
];
const fetchFont = (url: string) =>
  fetch(url)
    .then((r) => r.arrayBuffer())
    .then((b) => new Uint8Array(b));

let fontsPromise:
  | Promise<{ fonts: Uint8Array[]; emojiFont: Uint8Array }>
  | undefined;
function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      Promise.all(BODY_FONT_URLS.map(fetchFont)),
      fetchFont(notoColorEmoji),
    ]).then(([fonts, emojiFont]) => ({ fonts, emojiFont }));
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
    schema: withMultiColumn(withPageBreak(BlockNoteSchema.create())),
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
    initialContent: testDocumentBlocks,
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

  // Exports the editor document to a PDF/UA-1 file (Typst wasm + post-process).
  const exportPdf = useCallback(async () => {
    setStatus("loading");
    try {
      const exporter = new TypstExporter(
        editor.schema,
        typstDefaultSchemaMappings,
        // Noto Color Emoji is the internal family name of the bundled emoji
        // font; listing it lets ZWJ emoji (e.g. 🚶‍♀️) shape correctly.
        { emojiFontFamily: "Noto Color Emoji" },
      );
      const { fonts, emojiFont } = await loadFonts();
      const bytes = await blocksToPdfUA(
        exporter,
        editor.document,
        {
          getModule: () => compilerWasmUrl,
          fonts,
          emojiFont,
          preloadDefaultFonts: false,
        },
        { title: "BlockNote document", lang: "en" },
      );
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
