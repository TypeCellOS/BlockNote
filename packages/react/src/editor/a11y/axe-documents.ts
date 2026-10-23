import {
  COLORS_DEFAULT,
  defaultBlockSpecs,
  type PartialBlock,
  type PartialTableCell,
  type DefaultInlineContentSchema,
  type DefaultStyleSchema,
  type PropSchema,
} from "@blocknote/core";
import { blockExamples } from "@root/tests/a11y/documents.js";

const colors = ["default", ...Object.keys(COLORS_DEFAULT)];

// Cover each finite prop value, rather than the Cartesian product of all block
// props. Open-ended strings and numbers use representative values.
function propValues(
  name: string,
  spec: PropSchema[string],
  baseValue: string | number | boolean | undefined,
) {
  if (spec.values) {
    return spec.values;
  }
  if (typeof spec.default === "boolean") {
    return [false, true];
  }
  switch (name) {
    case "textColor":
    case "backgroundColor":
      return colors;
    case "name":
    case "caption":
      return [
        "",
        typeof baseValue === "string" && baseValue !== ""
          ? baseValue
          : "Example text",
      ];
    case "url":
      return [""]; // The populated URL is supplied by blockExamples.
    case "previewWidth":
      return [undefined, 100, 300];
    case "start":
      return [undefined, 1, 3];
    case "language":
      return ["text", "javascript"];
    default:
      throw new Error(`Add axe fixture values for block prop ${name}`);
  }
}

// The first block exposing a prop covers its variants for all block types.
const coveredBlockProps = new Set<string>();

export const blocksDocument: PartialBlock[] = [
  { id: "axe-placeholder", type: "paragraph", content: "" },
  ...Object.values(blockExamples).flatMap((example): PartialBlock[] => {
    const block: PartialBlock = example;
    const props: Record<string, string | number | boolean | undefined> =
      block.props ?? {};
    return [
      { ...block, id: `axe-${example.type}-default` },
      ...Object.entries(
        defaultBlockSpecs[example.type].config.propSchema,
      ).flatMap(([name, spec]) => {
        if (coveredBlockProps.has(name)) {
          return [];
        }
        coveredBlockProps.add(name);
        const baseValue = props[name] ?? spec.default;
        return propValues(name, spec, baseValue).flatMap((value, index) => {
          if ((value ?? spec.default) === baseValue) {
            return [];
          }
          return [
            {
              ...block,
              id: `axe-${example.type}-${name}-${index}`,
              props: { ...block.props, [name]: value },
            },
          ];
        });
      }),
    ];
  }),
  {
    id: "axe-nested",
    type: "paragraph",
    content: "Parent paragraph",
    children: [
      {
        id: "axe-nested-bullet",
        type: "bulletListItem",
        content: "Nested bullet",
        children: [
          {
            id: "axe-nested-numbered",
            type: "numberedListItem",
            content: "Nested numbered item",
            children: [
              {
                id: "axe-nested-task",
                type: "checkListItem",
                content: "Nested task",
              },
            ],
          },
        ],
      },
    ],
  },
  ...(["heading", "toggleListItem"] as const).flatMap((type): PartialBlock[] =>
    [false, true].flatMap((expanded) =>
      [false, true].map((hasChildren): PartialBlock => ({
        id: `axe-${type}-${expanded}-${hasChildren}`,
        ...(type === "heading"
          ? { type, props: { isToggleable: true } }
          : { type }),
        content: `${type} ${expanded ? "expanded" : "collapsed"} ${hasChildren ? "with children" : "empty"}`,
        children: hasChildren
          ? [
              {
                id: `axe-${type}-${expanded}-${hasChildren}-child`,
                type: "paragraph",
                content: "Toggle child",
              },
            ]
          : [],
      })),
    ),
  ),
];

export const inlineContentDocument: PartialBlock[] = colors.flatMap(
  (textColor) =>
    colors.map((backgroundColor) => ({
      id: `axe-inline-${textColor}-${backgroundColor}`,
      type: "paragraph",
      content: [
        {
          type: "text",
          text: `${textColor} on ${backgroundColor}. `,
          styles: { textColor, backgroundColor },
        },
        {
          type: "link",
          href: "https://www.blocknotejs.org/",
          content: [
            {
              type: "text",
              text: "Linked text",
              styles: { textColor, backgroundColor },
            },
          ],
        },
      ],
    })),
);

type Cell = PartialTableCell<DefaultInlineContentSchema, DefaultStyleSchema>;
function cell(content: string, props: Cell["props"] = {}): Cell {
  return { type: "tableCell", content, props };
}

export const tablesDocument: PartialBlock[] = [
  ...(
    [
      { headerRows: 1 },
      { headerCols: 1 },
      { headerRows: 1, headerCols: 1 },
    ] as const
  ).map((headers, index): PartialBlock => ({
    id: `axe-table-headers-${index}`,
    type: "table",
    content: {
      type: "tableContent",
      ...headers,
      rows: [
        { cells: ["Region", "Sales", "Costs"] },
        { cells: ["North", "100", "50"] },
        { cells: ["South", "200", "80"] },
      ],
    },
  })),
  {
    id: "axe-table-merged",
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      headerCols: 1,
      rows: [
        {
          cells: [
            cell("Region"),
            cell("Quarter totals", { colspan: 2 }),
            cell("Notes"),
          ],
        },
        {
          cells: [
            cell("North", { rowspan: 2 }),
            cell("Combined total", { colspan: 2, rowspan: 2 }),
            cell("First period"),
          ],
        },
        { cells: [cell("Second period")] },
        {
          cells: [
            cell("South"),
            cell("100"),
            cell("200"),
            cell("Final period"),
          ],
        },
      ],
    },
  },
  // Cell props use a different rendering path from inline marks. Exercise that
  // path without repeating the full inline foreground/background matrix.
  {
    id: "axe-table-colors",
    type: "table",
    content: {
      type: "tableContent",
      headerRows: 1,
      rows: [
        { cells: ["Color", "Cell text", "Cell background"] },
        ...colors.map((color) => ({
          cells: [
            cell(color),
            cell("Colored text", { textColor: color }),
            cell("Highlighted cell", { backgroundColor: color }),
          ],
        })),
      ],
    },
  },
];
