import {
  BlockFromConfig,
  BlockNoteSchema,
  BlockSchema,
  InlineContentFromConfig,
  InlineContentSchema,
  StyleSchema,
  Styles,
} from "@blocknote/core";

/**
 * Defines a mapping from all block types with a schema to a result type `R`.
 */
export type BlockMapping<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema,
  R
> = {
  [K in keyof B]: (
    block: BlockFromConfig<B[K], I, S>,
    nestingLevel: number
  ) => R;
};

/**
 * Defines a mapping from all inline content types with a schema to a result type R.
 */
export type InlineContentMapping<
  I extends InlineContentSchema,
  S extends StyleSchema,
  R
> = {
  [K in keyof I]: (inlineContent: InlineContentFromConfig<I[K], S>) => R;
};

/**
 * Defines a mapping from all style types with a schema to a result type R.
 */
export type StyleMapping<S extends StyleSchema, R> = {
  [K in keyof S]: (style: Styles<S>[K]) => R;
};

/**
 * The mapping factory is a utility function to easily create mappings for
 * a BlockNoteSchema. Using the factory makes it easier to get typescript code completion etc.
 */
export function mappingFactory<
  B extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(_schema: BlockNoteSchema<B, I, S>) {
  return {
    createBlockMapping: <R>(
      mapping: BlockMapping<B, InlineContentSchema, StyleSchema, R>
    ) => mapping,
    createInlineContentMapping: <R>(
      mapping: InlineContentMapping<I, StyleSchema, R>
    ) => mapping,
    createStyleMapping: <R>(mapping: StyleMapping<S, R>) => mapping,
  };
}

// export async function saveTestFile() {
//   // Documents contain sections, you can have multiple sections per document, go here to learn more about sections
//   // This simple example will only contain one section
//   const doc = new Document({
//     sections: [
//       {
//         properties: {},
//         children: [
//           new Paragraph({
//             children: [
//               new TextRun("Hello World"),
//               new TextRun({
//                 text: "Foo Bar",
//                 bold: true,
//               }),
//               new TextRun({
//                 text: "\tGithub is the best",
//                 bold: true,
//               }),
//             ],
//           }),
//           new Paragraph({
//             children: [
//               new TextRun("Hello World"),
//               new TextRun({
//                 text: "Foo Bar",
//                 bold: true,
//               }),
//               new TextRun({
//                 text: "\tGithub is the best",
//                 bold: true,
//               }),
//             ],
//             indent: { left: "1cm", start: "1cm" },
//           }),
//         ],
//       },
//     ],
//   });

//   // Used to export the file into a .docx file
//   const buffer = await Packer.toBuffer(doc);
//   fs.writeFileSync(__dirname + "/My Document.docx", buffer);
// }
