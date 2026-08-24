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
    children: {
      allow: "any",
      default: [{ type: "paragraph" }],
    },
  },
  { render: renderDiv },
)();

// A compartment-style container, like a table cell. Content never implicitly
// crosses its boundary.
const SealedBox = createBlockSpec(
  {
    type: "sealedBox" as const,
    propSchema: {},
    content: "none",
    children: { allow: "any", boundary: "sealed" },
  },
  { render: renderDiv },
)();

// An open container, like a column list. Everything crosses its edge
// (PM `isolating: false`).
const OpenBox = createBlockSpec(
  {
    type: "openBox" as const,
    propSchema: {},
    content: "none",
    children: { allow: "any", boundary: "open" },
  },
  { render: renderDiv },
)();

// Same shape as tables: an isolated container (the default) that holds only
// sealed ones, so any descent into it bottoms out at a sealed boundary.
const SealedGrid = createBlockSpec(
  {
    type: "sealedGrid" as const,
    propSchema: {},
    content: "none",
    children: { allow: ["sealedBox"] },
  },
  { render: renderDiv },
)();

const Grid = createBlockSpec(
  {
    type: "grid" as const,
    propSchema: {},
    content: "none",
    children: {
      allow: ["gridCell"],
      min: 2,
      whenEmptied: "unwrap",
    },
  },
  { render: renderDiv },
)();

const GridCell = createBlockSpec(
  {
    type: "gridCell" as const,
    propSchema: {},
    content: "none",
    children: { allow: "any" },
    placement: "containerOnly",
  },
  { render: renderDiv },
)();

// A refill (default `whenEmptied`) container whose `default` has content.
// Dropping below `min` tops it back up from the unconsumed tail of `default`.
const SeededPair = createBlockSpec(
  {
    type: "seededPair" as const,
    propSchema: {},
    content: "none",
    children: {
      allow: "any",
      min: 2,
      default: [
        { type: "paragraph", content: "Seed A" },
        { type: "paragraph", content: "Seed B" },
      ],
    },
  },
  { render: renderDiv },
)();

// A container that only accepts regular blocks, not other container blocks.
// Used to check that placement validation matches on the moved block's real
// node type rather than always assuming a `blockContainer`.
const BlocksOnlyBox = createBlockSpec(
  {
    type: "blocksOnlyBox" as const,
    propSchema: {},
    content: "none",
    children: { allow: "blocks" },
  },
  { render: renderDiv },
)();

export const containerSchema = BlockNoteSchema.create().extend({
  blockSpecs: {
    ...defaultBlockSpecs,
    callout: Callout,
    sealedBox: SealedBox,
    openBox: OpenBox,
    sealedGrid: SealedGrid,
    grid: Grid,
    gridCell: GridCell,
    seededPair: SeededPair,
    blocksOnlyBox: BlocksOnlyBox,
  } as const,
});
