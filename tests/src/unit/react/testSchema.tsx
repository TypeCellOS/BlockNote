import {
  BlockNoteSchema,
  createPageBreakBlockSpec,
  createPropSchemaFromZod,
  defaultPropSchema,
} from "@blocknote/core";
import {
  createReactBlockSpec,
  createReactInlineContentSpec,
  createReactStyleSpec,
} from "@blocknote/react";
import { createContext, useContext } from "react";
import { z } from "zod/v4";

// BLOCKS ----------------------------------------------------------------------

const createCustomParagraph = createReactBlockSpec(
  {
    type: "customParagraph",
    propSchema: defaultPropSchema,
    content: "inline",
  },
  {
    render: (props) => (
      <p ref={props.contentRef} className={"react-custom-paragraph"} />
    ),
    toExternalHTML: () => (
      <p className={"react-custom-paragraph"}>Hello World</p>
    ),
  },
);

const createSimpleCustomParagraph = createReactBlockSpec(
  {
    type: "simpleCustomParagraph",
    propSchema: defaultPropSchema,
    content: "inline",
  },
  {
    render: (props) => (
      <p ref={props.contentRef} className={"simple-react-custom-paragraph"} />
    ),
  },
);

export const TestContext = createContext<true | undefined>(undefined);

const ContextParagraphComponent = (props: any) => {
  const testData = useContext(TestContext);
  if (testData === undefined) {
    throw Error();
  }

  return <div ref={props.contentRef} />;
};

const createContextParagraph = createReactBlockSpec(
  {
    type: "contextParagraph",
    propSchema: defaultPropSchema,
    content: "inline",
  },
  {
    render: ContextParagraphComponent,
  },
);

// TODO: enable and test this
// const ComplexAttributeNode = createReactBlockSpec(
//   {
//     type: "advancedComplexAttributeNode",
//     propSchema: createPropSchemaFromZod(
//       z.object({
//         user: z.object({
//           name: z.object({
//             first: z.string(),
//             last: z.string(),
//           }),
//           age: z.number(),
//         }),
//       }),
//     ),
//     content: "none",
//   },
//   {
//     render: (props) => {
//       return <div data-user={JSON.stringify(props.block.props.user)} />;
//     },
//   },
// );

// INLINE CONTENT --------------------------------------------------------------

const Mention = createReactInlineContentSpec(
  {
    type: "mention",
    propSchema: createPropSchemaFromZod(
      z.object({
        user: z.string().default(""),
      }),
    ),
    content: "none",
  },
  {
    parse: (el) => {
      const user = el.getAttribute("data-user");
      if (user !== null) {
        return { user };
      }
      return undefined;
    },
    render: (props) => {
      return (
        <span
          className="mention-internal"
          data-user={props.inlineContent.props.user}
        >
          @{props.inlineContent.props.user}
        </span>
      );
    },
    toExternalHTML: (props) => {
      return (
        <span
          data-external={true}
          data-inline-content-type="mention"
          data-user={props.inlineContent.props.user}
          className="mention-external"
        >
          @{props.inlineContent.props.user}
        </span>
      );
    },
  },
);

const Tag = createReactInlineContentSpec(
  {
    type: "tag",
    propSchema: createPropSchemaFromZod(z.object({})),
    content: "styled",
  },
  {
    parse: (el) => {
      const isTag = el.getAttribute("data-tag");
      if (isTag) {
        return {};
      }
      return undefined;
    },
    render: (props) => {
      return (
        <span>
          #<span ref={props.contentRef} data-tag="true"></span>
        </span>
      );
    },
  },
);

// STYLES ----------------------------------------------------------------------

const Small = createReactStyleSpec(
  {
    type: "small",
    propSchema: "boolean",
  },
  {
    render: (props) => {
      return <small ref={props.contentRef}></small>;
    },
  },
);

const FontSize = createReactStyleSpec(
  {
    type: "fontSize",
    propSchema: "string",
  },
  {
    render: (props) => {
      return (
        <span ref={props.contentRef} style={{ fontSize: props.value }}></span>
      );
    },
  },
);

// SCHEMA ----------------------------------------------------------------------

export const testSchema = BlockNoteSchema.create().extend({
  blockSpecs: {
    pageBreak: createPageBreakBlockSpec(),
    customParagraph: createCustomParagraph(),
    simpleCustomParagraph: createSimpleCustomParagraph(),
    contextParagraph: createContextParagraph(),
    // advancedComplexAttributeNode: ComplexAttributeNode(),
  },
  inlineContentSpecs: {
    mention: Mention,
    tag: Tag,
  },
  styleSpecs: {
    small: Small,
    fontSize: FontSize,
  },
});

export type TestBlockSchema = typeof testSchema.blockSchema;
export type TestInlineContentSchema = typeof testSchema.inlineContentSchema;
export type TestStyleSchema = typeof testSchema.styleSchema;
