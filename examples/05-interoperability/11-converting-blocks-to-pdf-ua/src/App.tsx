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
// export matches the editor and works fully offline, plus a math font (New
// Computer Modern Math, Typst's default) for the math blocks - with
// `preloadDefaultFonts: false` no fonts come from a CDN, so every needed
// font must be bundled. Noto Color Emoji is the pure-COLRv1 build (~5MB),
// which Typst renders in color. `new URL(<literal>, import.meta.url)` is
// the bundler-portable asset reference (Vite and the docs site's Turbopack
// both emit the file and return its URL) - but only with a full string
// literal per file: a shared helper with a template path breaks Turbopack's
// static analysis (every URL silently resolves to one file).
const interRegular = new URL("./fonts/Inter_18pt-Regular.ttf", import.meta.url)
  .href;
const interItalic = new URL("./fonts/Inter_18pt-Italic.ttf", import.meta.url)
  .href;
const interBold = new URL("./fonts/Inter_18pt-Bold.ttf", import.meta.url).href;
const interBoldItalic = new URL(
  "./fonts/Inter_18pt-BoldItalic.ttf",
  import.meta.url,
).href;
const geistMono = new URL("./fonts/GeistMono-Regular.ttf", import.meta.url)
  .href;
const notoColorEmoji = new URL("./fonts/Noto-COLRv1.ttf", import.meta.url).href;
const newCMMathRegular = new URL(
  "./fonts/NewCMMath-Regular.otf",
  import.meta.url,
).href;
const newCMMathBook = new URL("./fonts/NewCMMath-Book.otf", import.meta.url)
  .href;
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
  newCMMathRegular,
  newCMMathBook,
];
async function fetchFont(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    // A dev server's HTML fallback page must not be loaded as font bytes.
    throw new Error(`Failed to fetch font ${url}: ${res.status}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

let fontsPromise:
  | Promise<{ fonts: Uint8Array[]; emojiFont: Uint8Array }>
  | undefined;
function loadFonts() {
  if (!fontsPromise) {
    fontsPromise = Promise.all([
      Promise.all(BODY_FONT_URLS.map(fetchFont)),
      fetchFont(notoColorEmoji),
    ]).then(([fonts, emojiFont]) => ({ fonts, emojiFont }));
    // A transient fetch failure must not poison every later export - clear
    // the cache so the next export retries.
    fontsPromise.catch(() => {
      fontsPromise = undefined;
    });
  }
  return fontsPromise;
}

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
  makeExporter: () => TypstExporter<any, any, any>,
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
        const { fonts, emojiFont } = await loadFonts();
        const bytes = await blocksToPdfUA(
          makeExporter(),
          blocks,
          {
            getModule: () => compilerWasmUrl,
            fonts,
            emojiFont,
            preloadDefaultFonts: false,
          },
          { title: "BlockNote document", lang: "en" },
        );
        if (stale) {
          return;
        }
        setPdfUrl(
          URL.createObjectURL(
            // @cantoo/pdf-lib always returns a view over a plain
            // (non-shared) buffer; the cast narrows `ArrayBufferLike` for
            // `BlobPart`.
            new Blob([bytes as Uint8Array<ArrayBuffer>], {
              type: "application/pdf",
            }),
          ),
        );
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
      new TypstExporter(
        editor.schema,
        {
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
        },
        // Noto Color Emoji is the internal family name of the bundled emoji
        // font; listing it lets ZWJ emoji (e.g. 🚶‍♀️) shape correctly.
        { emojiFontFamily: "Noto Color Emoji" },
      ),
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
