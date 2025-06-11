import {
  CustomBlockConfig,
  CustomBlockImplementation,
  PropSchema,
  createBlockSpec,
} from "../../schema/index.js";
import { defaultProps } from "../defaultProps.js";
import { createToggleWrapper } from "../ToggleWrapper/createToggleWrapper.js";

export const headingPropSchema = {
  ...defaultProps,
  level: { default: 1, values: [1, 2, 3] as const },
  isTogglable: { default: false },
} as const satisfies PropSchema;

export const headingConfig = {
  type: "heading",
  propSchema: headingPropSchema,
  content: "inline",
} as const satisfies CustomBlockConfig;

export const headingRender: CustomBlockImplementation<
  typeof headingConfig,
  any,
  any
>["render"] = (block, editor) => {
  const dom = document.createElement(`h${block.props.level}`);
  const renderedElement = {
    dom,
    contentDOM: dom,
  };

  if (block.props.isTogglable) {
    return createToggleWrapper(block, editor, renderedElement);
  }

  return renderedElement;
};

export const headingParse: CustomBlockImplementation<
  typeof headingConfig,
  any,
  any
>["parse"] = (element) => {
  if (element.tagName === "H1") {
    return { level: 1 };
  } else if (element.tagName === "H2") {
    return { level: 2 };
  } else if (element.tagName === "H3") {
    return { level: 3 };
  }

  return undefined;
};

export const headingImplementation = {
  render: headingRender,
  parse: headingParse,
} satisfies CustomBlockImplementation<typeof headingConfig, any, any>;

export const Heading = createBlockSpec(headingConfig, headingImplementation);

// const HeadingBlockContent = createStronglyTypedTiptapNode({
//   name: "heading",
//   content: "inline*",
//   group: "blockContent",

//   addAttributes() {
//     return propsToAttributes(headingPropSchema);
//   },

//   addInputRules() {
//     return [
//       ...[1, 2, 3].map((level) => {
//         // Creates a heading of appropriate level when starting with "#", "##", or "###".
//         return new InputRule({
//           find: new RegExp(`^(#{${level}})\\s$`),
//           handler: ({ state, chain, range }) => {
//             const blockInfo = getBlockInfoFromSelection(state);
//             if (
//               !blockInfo.isBlockContainer ||
//               blockInfo.blockContent.node.type.spec.content !== "inline*"
//             ) {
//               return;
//             }

//             chain()
//               .command(
//                 updateBlockCommand(blockInfo.bnBlock.beforePos, {
//                   type: "heading",
//                   props: {
//                     level: level as any,
//                   },
//                 }),
//               )
//               // Removes the "#" character(s) used to set the heading.
//               .deleteRange({ from: range.from, to: range.to })
//               .run();
//           },
//         });
//       }),
//     ];
//   },

//   addKeyboardShortcuts() {
//     return {
//       "Mod-Alt-1": () => {
//         const blockInfo = getBlockInfoFromSelection(this.editor.state);
//         if (
//           !blockInfo.isBlockContainer ||
//           blockInfo.blockContent.node.type.spec.content !== "inline*"
//         ) {
//           return true;
//         }

//         // call updateBlockCommand
//         return this.editor.commands.command(
//           updateBlockCommand(blockInfo.bnBlock.beforePos, {
//             type: "heading",
//             props: {
//               level: 1 as any,
//             },
//           }),
//         );
//       },
//       "Mod-Alt-2": () => {
//         const blockInfo = getBlockInfoFromSelection(this.editor.state);
//         if (
//           !blockInfo.isBlockContainer ||
//           blockInfo.blockContent.node.type.spec.content !== "inline*"
//         ) {
//           return true;
//         }

//         return this.editor.commands.command(
//           updateBlockCommand(blockInfo.bnBlock.beforePos, {
//             type: "heading",
//             props: {
//               level: 2 as any,
//             },
//           }),
//         );
//       },
//       "Mod-Alt-3": () => {
//         const blockInfo = getBlockInfoFromSelection(this.editor.state);
//         if (
//           !blockInfo.isBlockContainer ||
//           blockInfo.blockContent.node.type.spec.content !== "inline*"
//         ) {
//           return true;
//         }

//         return this.editor.commands.command(
//           updateBlockCommand(blockInfo.bnBlock.beforePos, {
//             type: "heading",
//             props: {
//               level: 3 as any,
//             },
//           }),
//         );
//       },
//     };
//   },
//   parseHTML() {
//     return [
//       // Parse from internal HTML.
//       {
//         tag: "div[data-content-type=" + this.name + "]",
//         contentElement: ".bn-inline-content",
//       },
//       // Parse from external HTML.
//       {
//         tag: "h1",
//         attrs: { level: 1 },
//         node: "heading",
//       },
//       {
//         tag: "h2",
//         attrs: { level: 2 },
//         node: "heading",
//       },
//       {
//         tag: "h3",
//         attrs: { level: 3 },
//         node: "heading",
//       },
//     ];
//   },

//   renderHTML({ node, HTMLAttributes }) {
//     return createDefaultBlockDOMOutputSpec(
//       this.name,
//       `h${node.attrs.level}`,
//       {
//         ...(this.options.domAttributes?.blockContent || {}),
//         ...HTMLAttributes,
//       },
//       this.options.domAttributes?.inlineContent || {},
//     );
//   },
// });

// export const Heading = createBlockSpecFromStronglyTypedTiptapNode(
//   HeadingBlockContent,
//   headingPropSchema,
// );
