import { BlockNoteSchema } from "../../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../../blocks/defaultBlocks.js";
import { createBlockSpec } from "../../../schema/blocks/createSpec.js";

const renderDiv = () => {
  const dom = document.createElement("div");
  return { dom, contentDOM: dom };
};

const Callout = createBlockSpec(
  {
    type: "callout" as const,
    propSchema: {
      flavor: {
        default: "tip",
        values: ["tip", "info", "warning", "success"],
      },
    },
    content: "none",
    container: true,
  },
  { render: renderDiv },
)();

const Grid = createBlockSpec(
  {
    type: "grid" as const,
    propSchema: {},
    content: "none",
    container: true,
    children: {
      allow: ["gridCell"],
      min: 2,
    },
  },
  { render: renderDiv },
)();

const GridCell = createBlockSpec(
  {
    type: "gridCell" as const,
    propSchema: {},
    content: "none",
    container: true,
    placeable: "namedOnly",
  },
  { render: renderDiv },
)();

// A container that requires two children, so dropping below `min` dissolves
// it into the survivors.
const Pair = createBlockSpec(
  {
    type: "pair" as const,
    propSchema: {},
    content: "none",
    container: true,
    children: { min: 2 },
  },
  { render: renderDiv },
)();

// A titled block: an ordinary block with inline content (the title) whose
// child blocks are a body that belongs to it. Its `experimental_keyboard` settings keep
// the body together: Enter in the title starts it, its blocks can't be
// outdented, and an empty last block leaves it. The frame draws the box
// around title and body together.
const Alert = createBlockSpec(
  {
    type: "alert" as const,
    propSchema: {},
    content: "inline",
  },
  {
    experimental_keyboard: {
      enter: "into-children",
      childrenCanOutdent: false,
      emptyChildEnter: "exit-at-end",
    },
    render: renderDiv,
    renderFrame: () => {
      const dom = document.createElement("div");
      dom.className = "alert-frame";
      const slot = document.createElement("div");
      slot.className = "alert-slot";
      dom.append(slot);
      return { dom, slot };
    },
  },
)();

export const containerSchema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: Callout,
    alert: Alert,
    grid: Grid,
    gridCell: GridCell,
    pair: Pair,
  } as const,
});
