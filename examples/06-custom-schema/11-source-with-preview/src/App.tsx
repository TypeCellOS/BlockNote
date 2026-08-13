import {
  BlockNoteSchema,
  createBlockConfig,
  CustomInlineContentConfig,
  plainContentToString,
} from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  createReactBlockSpec,
  createReactInlineContentSpec,
  PreviewPlaceholder,
  ReactCustomBlockRenderProps,
  ReactCustomInlineContentRenderProps,
  SourceBlockWithPreview,
  SourceInlineContentWithPreview,
  useCreateBlockNote,
} from "@blocknote/react";
import { TbTable } from "react-icons/tb";

import "./styles.css";

// A custom "CSV table" block: authored as comma-separated values in a source
// popup, rendered as a table. Built on the same source-with-preview pattern
// as BlockNote's math and diagram blocks.
const createCSVTableBlockConfig = createBlockConfig(
  () =>
    ({
      type: "csvTable" as const,
      propSchema: {},
      // The source is stored as the block's plain text content.
      content: "plain" as const,
    }) as const,
);

type CSVTableBlockConfig = ReturnType<typeof createCSVTableBlockConfig>;

// Renders the CSV source to a table element, or reports invalid source as an
// error. Expected failures are values, not exceptions - the preview
// component decides how to show them.
function renderCSV(
  source: string,
): { table: string[][]; error?: undefined } | { error: string } {
  const rows = source
    .split("\n")
    .filter((row) => row.trim())
    .map((row) => row.split(",").map((cell) => cell.trim()));
  if (rows.length === 0) {
    return { error: "No rows" };
  }
  if (rows.some((row) => row.length !== rows[0].length)) {
    return { error: "All rows must have the same number of columns" };
  }
  return { table: rows };
}

const CSVTablePreview = (
  props: ReactCustomBlockRenderProps<CSVTableBlockConfig>,
) => {
  // The block's content as plain text, i.e. the source to render.
  const source = plainContentToString(props.block.content).trim();
  const result = renderCSV(source);

  return (
    <SourceBlockWithPreview
      block={props.block}
      editor={props.editor}
      contentRef={props.contentRef}
      source={source}
      // `undefined` on error, so the error state shows instead of an empty
      // preview.
      preview={
        result.error === undefined ? (
          <table className="csv-table">
            <tbody>
              {result.table.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : undefined
      }
      // Shown below the source in the popup while editing.
      error={result.error}
      // The compact error state shown in place of the preview.
      errorPreview={
        <PreviewPlaceholder
          error
          icon={<TbTable />}
          text="Invalid CSV - click to fix"
        />
      }
      // Shown in place of the preview when the source is empty.
      emptySourcePlaceholder={
        <PreviewPlaceholder icon={<TbTable />} text="Add a CSV table" />
      }
      sourcePlaceholder="Enter comma-separated values"
    />
  );
};

const createCSVTableBlockSpec = createReactBlockSpec(
  createCSVTableBlockConfig,
  {
    meta: {
      code: true,
      defining: true,
      isolating: false,
      // Marks the block as rendering a preview with an editable source popup
      // (driven by an editor-wide extension - nothing to register).
      hasPreview: true,
      // Enter inserts a newline while the popup is open (multiline source);
      // use "shift+enter" for single-line sources, where Enter closes the
      // popup instead.
      hardBreakShortcut: "enter",
    },
    render: CSVTablePreview,
  },
);

// A custom "color" inline content: authored as a CSS color, rendered as a
// color chip that flows with the text.
const colorChipConfig = {
  type: "colorChip" as const,
  propSchema: {},
  content: "plain" as const,
} satisfies CustomInlineContentConfig;

const ColorChipPreview = (
  props: ReactCustomInlineContentRenderProps<typeof colorChipConfig, any>,
) => {
  // For "plain" inline content, `content` is already a plain string.
  const source = props.inlineContent.content.trim();
  const isValidColor = CSS.supports("color", source);

  return (
    <SourceInlineContentWithPreview
      editor={props.editor}
      node={props.node}
      getPos={props.getPos}
      contentRef={props.contentRef}
      source={source}
      preview={
        isValidColor ? (
          <span className="color-chip">
            <span
              className="color-chip-swatch"
              style={{ backgroundColor: source }}
            />
            {source}
          </span>
        ) : undefined
      }
      error={isValidColor ? undefined : `Not a CSS color: "${source}"`}
      sourcePlaceholder="Enter a CSS color"
    />
  );
};

const createColorChipSpec = () =>
  createReactInlineContentSpec(colorChipConfig, {
    meta: {
      code: true,
      hasPreview: true,
    },
    render: ColorChipPreview,
  });

// Our schema with the two custom specs added.
const schema = BlockNoteSchema.create().extend({
  blockSpecs: {
    csvTable: createCSVTableBlockSpec(),
  },
  inlineContentSpecs: {
    colorChip: createColorChipSpec(),
  },
});

export default function App() {
  const editor = useCreateBlockNote({
    schema,
    initialContent: [
      {
        type: "paragraph",
        content: "Click the table to edit its comma-separated source:",
      },
      {
        type: "csvTable",
        content: "Name, Role\nAda, Engineer\nGrace, Admiral",
      },
      {
        type: "paragraph",
        content: [
          "Inline content works too - this color chip ",
          {
            type: "colorChip",
            content: "rebeccapurple",
          },
          " is editable when the selection is inside it.",
        ],
      },
      {
        type: "paragraph",
      },
    ],
  });

  return <BlockNoteView editor={editor} />;
}
