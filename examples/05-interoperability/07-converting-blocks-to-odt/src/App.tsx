import { testDocumentBlocks } from "./testDocumentBlocks";
import {
  BlockNoteSchema,
  combineByGroup,
  withPageBreak,
} from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import * as locales from "@blocknote/core/locales";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  createReactInlineMathSpec,
  createReactMathBlockSpec,
} from "@blocknote/math-block";
import { createReactDiagramBlockSpec } from "@blocknote/diagram-block";
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getPageBreakReactSlashMenuItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  ODTExporter,
  odtDefaultSchemaMappings,
} from "@blocknote/xl-odt-exporter";
import { diagramBlockMapping } from "@blocknote/diagram-block/odt-exporter";
import {
  inlineMathMapping,
  mathBlockMapping,
} from "@blocknote/math-block/odt-exporter";
import {
  getMultiColumnSlashMenuItems,
  multiColumnDropCursor,
  locales as multiColumnLocales,
  withMultiColumn,
} from "@blocknote/xl-multi-column";
import { useMemo } from "react";

import "./styles.css";

export default function App() {
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
  const getSlashMenuItems = useMemo(() => {
    return async (query: string) =>
      filterSuggestionItems(
        combineByGroup(
          getDefaultReactSlashMenuItems(editor),
          getPageBreakReactSlashMenuItems(editor),
          getMultiColumnSlashMenuItems(editor),
        ),
        query,
      );
  }, [editor]);

  // Exports the editor content to ODT and downloads it.
  const onDownloadClick = async () => {
    const exporter = new ODTExporter(editor.schema, {
      ...odtDefaultSchemaMappings,
      blockMapping: {
        ...odtDefaultSchemaMappings.blockMapping,
        // Embeds diagrams as images instead of their Mermaid source.
        diagram: diagramBlockMapping,
        // Renders math blocks as native equations instead of their LaTeX
        // source.
        mathBlock: mathBlockMapping,
      },
      inlineContentMapping: {
        ...odtDefaultSchemaMappings.inlineContentMapping,
        // Renders inline math as native equations instead of its LaTeX
        // source.
        math: inlineMathMapping,
      },
    });
    const blob = await exporter.toODTDocument(editor.document);

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = "My Document (blocknote export).odt";
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

  // Renders the editor instance.
  return (
    <div className="views">
      <div className="view-wrapper">
        <div className="view-label">
          Editor
          <span className="view-label-download" onClick={onDownloadClick}>
            Download ODT
          </span>
        </div>
        <div className="view">
          <BlockNoteView editor={editor} slashMenu={false}>
            <SuggestionMenuController
              triggerCharacter={"/"}
              getItems={getSlashMenuItems}
            />
          </BlockNoteView>
        </div>
      </div>
    </div>
  );
}
