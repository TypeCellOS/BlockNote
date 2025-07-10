// import type {
//   Block,
//   DefaultBlockSchema,
//   DefaultInlineContentSchema,
//   DefaultStyleSchema,
// } from "../../blocks/defaultBlocks.js";
// import type {
//   BlockSchema,
//   InlineContentSchema,
//   StyleSchema,
// } from "../../schema/index.js";
// import { getBlockRange, Location } from "./Location.js";

// export class LocationResolution<
//   BSchema extends BlockSchema = DefaultBlockSchema,
//   ISchema extends InlineContentSchema = DefaultInlineContentSchema,
//   SSchema extends StyleSchema = DefaultStyleSchema,
//   ABlock = Block<BSchema, ISchema, SSchema>,
// > {
//   constructor(
//     private editor: {
//       document: ABlock[];
//       blockCache: WeakMap<
//         Block<BSchema, ISchema, SSchema>,
//         Block<BSchema, ISchema, SSchema>
//       >;
//     },
//   ) {}

//   private get document() {
//     return this.editor.document as ABlock[];
//   }

//   private get blockCache() {
//     return this.editor.blockCache;
//   }

//   private getBlocks(location: Location): ABlock[] {
//     const [startId, endId] = getBlockRange(location);

//     const startIndex = this.document.findIndex((block) => block. === startId);
//     const endIndex = this.document.findIndex((block) => block.id === endId);

//     return this.document.slice(startIndex, endIndex + 1);
//   }
// }
