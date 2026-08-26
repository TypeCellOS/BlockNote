// `children.js` and `validateChildren.js` are deliberately *not* re-exported
// wholesale: almost everything in them is machinery for compiling a `children`
// config into a ProseMirror content expression, which lives on
// `@blocknote/core/internal` (see `src/internal.ts`). Only the question a
// block author asks, "is this a container?", belongs here; the config types
// come from `./blocks/types.js` below.
export * from "./blocks/createSpec.js";
export * from "./blocks/internal.js";
export * from "./blocks/types.js";
export * from "./inlineContent/createSpec.js";
export * from "./inlineContent/internal.js";
export * from "./inlineContent/types.js";
export * from "./markGroups.js";
export * from "./propTypes.js";
export * from "./styles/createSpec.js";
export * from "./styles/internal.js";
export * from "./styles/types.js";
export * from "./schema.js";
