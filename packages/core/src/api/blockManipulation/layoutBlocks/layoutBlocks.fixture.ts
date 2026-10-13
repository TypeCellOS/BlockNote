import { BlockNoteSchema } from "../../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../../blocks/defaultBlocks.js";
import { createBlockSpec } from "../../../schema/blocks/createSpec.js";

const renderDiv = () => {
  const dom = document.createElement("div");
  return { dom, contentDOM: dom };
};

const frameDiv = () => {
  const dom = document.createElement("div");
  return { dom, slot: dom };
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
    layoutOnly: true,
  },
  { renderFrame: frameDiv },
)();

const Grid = createBlockSpec(
  {
    type: "grid" as const,
    propSchema: {},
    content: "none",
    layoutOnly: true,
    children: {
      allow: ["gridCell"],
      min: 2,
    },
  },
  { renderFrame: frameDiv },
)();

const GridCell = createBlockSpec(
  {
    type: "gridCell" as const,
    propSchema: {},
    content: "none",
    layoutOnly: true,
    placeable: "namedOnly",
  },
  { renderFrame: frameDiv },
)();

// A second layout block of any blocks, for conversions between layout block types.
const Box = createBlockSpec(
  {
    type: "box" as const,
    propSchema: {},
    content: "none",
    layoutOnly: true,
  },
  { renderFrame: frameDiv },
)();

// A layout block that requires two callouts, so dropping below `min` dissolves
// it into the survivor. (`min` needs an `allow` list: a layout block of any
// blocks always holds at least one.)
const Pair = createBlockSpec(
  {
    type: "pair" as const,
    propSchema: {},
    content: "none",
    layoutOnly: true,
    children: { allow: ["callout"], min: 2 },
  },
  { renderFrame: frameDiv },
)();

// A tab set: its tabs are content, not layout, so it does not dissolve. An
// empty tab stays, and the set stays when too few tabs are left.
const Tabs = createBlockSpec(
  {
    type: "tabs" as const,
    propSchema: {},
    content: "none",
    layoutOnly: true,
    children: { allow: ["tab"], min: 1, dissolve: false },
  },
  { renderFrame: frameDiv },
)();

const Tab = createBlockSpec(
  {
    type: "tab" as const,
    propSchema: {},
    content: "none",
    layoutOnly: true,
    placeable: "namedOnly",
  },
  { renderFrame: frameDiv },
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

export const layoutSchema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: Callout,
    alert: Alert,
    grid: Grid,
    gridCell: GridCell,
    pair: Pair,
    box: Box,
    tabs: Tabs,
    tab: Tab,
  } as const,
});
