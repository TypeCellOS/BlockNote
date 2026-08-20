import { testDocumentBlocks } from "../testDocumentBlocks";
import {
  BlockNoteSchema,
  COLORS_DARK_MODE_DEFAULT,
  COLORS_DEFAULT,
  combineByGroup,
  withPageBreak,
} from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getPageBreakReactSlashMenuItems,
  useBlockNoteContext,
  useCreateBlockNote,
  usePrefersColorScheme,
} from "@blocknote/react";
import { createReactDiagramBlockSpec } from "@blocknote/diagram-block";
import { createDiagramBlockMapping } from "@blocknote/diagram-block/email-exporter";
import {
  createReactInlineMathSpec,
  createReactMathBlockSpec,
} from "@blocknote/math-block";
import {
  createInlineMathMapping,
  createMathBlockMapping,
} from "@blocknote/math-block/email-exporter";
import {
  ReactEmailExporter,
  reactEmailDefaultSchemaMappings,
} from "@blocknote/xl-email-exporter";
import {
  getMultiColumnSlashMenuItems,
  locales as multiColumnLocales,
  multiColumnDropCursor,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import * as locales from "@blocknote/core/locales";
import { useEffect, useMemo, useState } from "react";

import "./styles.css";

export default function App() {
  // Stores the editor's contents as an email HTML string for download and
  // displaying the email.
  const [emailDocument, setEmailDocument] = useState<string>("");

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

  const existingContext = useBlockNoteContext();
  const systemColorScheme = usePrefersColorScheme();

  // Exports the editor document to email whenever it changes.
  const onChange = async () => {
    const colorScheme =
      existingContext?.colorSchemePreference || systemColorScheme;
    const exporter = new ReactEmailExporter(
      editor.schema,
      {
        ...reactEmailDefaultSchemaMappings,
        blockMapping: {
          ...reactEmailDefaultSchemaMappings.blockMapping,
          // Renders math blocks & diagrams as images with the source as alt
          // text. Embedded as data URLs by default - when actually sending
          // emails, deliver them as inline attachments instead (which Gmail
          // & Outlook also display) by passing an `imageDelivery` from
          // `createCIDImageDelivery()` to each mapping, and handing its
          // `attachments` to your mailer alongside the HTML.
          mathBlock: createMathBlockMapping(),
          diagram: createDiagramBlockMapping(),
        },
        inlineContentMapping: {
          ...reactEmailDefaultSchemaMappings.inlineContentMapping,
          math: createInlineMathMapping(),
        },
      },
      {
        colors:
          colorScheme === "dark" ? COLORS_DARK_MODE_DEFAULT : COLORS_DEFAULT,
      },
    );
    const emailHtml = await exporter.toReactEmailDocument(editor.document);
    setEmailDocument(emailHtml);
  };

  // Exports the inital editor document to PDF.
  useEffect(() => {
    void onChange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Downloads the email in HTML format.
  const onDownloadClick = async () => {
    const blob = new Blob([emailDocument], { type: "text/html" });

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "My Document (blocknote export).html";
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

  // Renders the editor instance and Email view.
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
          Email Output
          <span className="view-label-download" onClick={onDownloadClick}>
            Download
          </span>
        </div>
        <div className="view">
          <div
            className="email"
            dangerouslySetInnerHTML={{ __html: emailDocument }}
          />
        </div>
      </div>
    </div>
  );
}
