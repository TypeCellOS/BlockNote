import { Block, BlockPropsType } from "../BlockContentTypes";

export type HeadingBlockSettableProps = {
  level: "1" | "2" | "3";
};

export type HeadingBlockAllProps = HeadingBlockSettableProps;

export type HeadingBlock<PropsType extends BlockPropsType> = Block<
  "heading",
  PropsType,
  HeadingBlockSettableProps,
  HeadingBlockAllProps
>;

// // Flavor 1
//
// type ParagraphBlock = {
//   type: {
//     name: string;
//     attrs: Record<string, string>;
//   },
//   editable: boolean;
//   // Would contain rich text
//   content: {
//     textColor: string;
//     richText: Record<string, string>
//   }
// }
//
// type FileBlock = {
//   type: {
//     name: string;
//     attrs: Record<string, string>;
//   },
//   content: Record<string,string> // Would contain file URL
// }
//
// // Flavor 2
//
// type ParagraphBlock = {
//   type: {
//     name: string;
//     attrs: Record<string, string>;
//   },
//   richText: Record<string,string> // Would contain paragraph text
// }
//
// type FileBlock = {
//   type: {
//     name: string;
//     attrs: Record<string, string>;
//   },
//   url: string // Would contain file URL
// }
//
// // Flavor 3
//
// type HeadingBlock = {
//   type: {
//     name: string;
//     attrs: Record<string, string>;
//   },
//   paragraphContent: Record<string,string> // Would contain rich text
// }
//
// type FileBlock = {
//   type: {
//     name: string;
//     attrs: Record<string, string>;
//   },
//   fileContent: Record<string,string> // Would contain file URL
// }
