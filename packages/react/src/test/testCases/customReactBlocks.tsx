import {
  BlockNoteEditor,
  BlockNoteSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  EditorTestCases,
  defaultBlockSpecs,
  defaultProps,
  uploadToTmpFilesDotOrg_DEV_ONLY,
  filePropSchema,
  fileParse,
  imagePropSchema,
  imageParse,
} from "@blocknote/core";
import { createContext, useContext } from "react";
import { RiImage2Fill } from "react-icons/ri";

import {
  AddFileButton,
  DefaultFilePreview,
  FileAndCaptionWrapper,
} from "../../blocks/FileBlockContent/fileBlockHelpers";
import { FileToExternalHTML } from "../../blocks/FileBlockContent/FileBlockContent";
import { createReactBlockSpec } from "../../schema/ReactBlockSpec";

import {
  ImagePreview,
  ImageToExternalHTML,
} from "../../blocks/ImageBlockContent/ImageBlockContent";

const ReactFile = createReactBlockSpec(
  {
    type: "reactFile",
    propSchema: filePropSchema,
    content: "none",
  },
  {
    render: (props) => (
      <div className={"bn-file-block-content-wrapper"}>
        {props.block.props.url === "" ? (
          <AddFileButton block={props.block} editor={props.editor as any} />
        ) : (
          <FileAndCaptionWrapper
            block={props.block}
            editor={props.editor as any}>
            <DefaultFilePreview
              block={props.block}
              editor={props.editor as any}
            />
          </FileAndCaptionWrapper>
        )}
      </div>
    ),
    parse: fileParse,
    toExternalHTML: (props) => (
      <FileToExternalHTML
        block={props.block as any}
        editor={props.editor as any}
      />
    ),
  }
);

const ReactImage = createReactBlockSpec(
  {
    type: "reactImage",
    propSchema: imagePropSchema,
    content: "none",
    isFileBlock: true,
  },
  {
    render: (props) => (
      <div className={"bn-file-block-content-wrapper"}>
        {props.block.props.url === "" ? (
          <AddFileButton
            {...props}
            editor={props.editor as any}
            buttonText={"Add image"}
            buttonIcon={<RiImage2Fill size={24} />}
          />
        ) : !props.block.props.showPreview ? (
          <FileAndCaptionWrapper
            block={props.block}
            editor={props.editor as any}>
            <DefaultFilePreview
              block={props.block}
              editor={props.editor as any}
            />
          </FileAndCaptionWrapper>
        ) : (
          <FileAndCaptionWrapper
            block={props.block}
            editor={props.editor as any}>
            <ImagePreview block={props.block} editor={props.editor as any} />
          </FileAndCaptionWrapper>
        )}
      </div>
    ),
    parse: imageParse,
    toExternalHTML: (props) => (
      <ImageToExternalHTML
        block={props.block as any}
        editor={props.editor as any}
      />
    ),
  }
);

const ReactCustomParagraph = createReactBlockSpec(
  {
    type: "reactCustomParagraph",
    propSchema: defaultProps,
    content: "inline",
  },
  {
    render: (props) => (
      <p ref={props.contentRef} className={"react-custom-paragraph"} />
    ),
    toExternalHTML: () => (
      <p className={"react-custom-paragraph"}>Hello World</p>
    ),
  }
);

const SimpleReactCustomParagraph = createReactBlockSpec(
  {
    type: "simpleReactCustomParagraph",
    propSchema: defaultProps,
    content: "inline",
  },
  {
    render: (props) => (
      <p ref={props.contentRef} className={"simple-react-custom-paragraph"} />
    ),
  }
);

export const TestContext = createContext<true | undefined>(undefined);

const ReactContextParagraphComponent = (props: any) => {
  const testData = useContext(TestContext);
  if (testData === undefined) {
    throw Error();
  }

  return <div ref={props.contentRef} />;
};

const ReactContextParagraph = createReactBlockSpec(
  {
    type: "reactContextParagraph",
    propSchema: defaultProps,
    content: "inline",
  },
  {
    render: ReactContextParagraphComponent,
  }
);

const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    reactFile: ReactFile,
    reactImage: ReactImage,
    reactCustomParagraph: ReactCustomParagraph,
    simpleReactCustomParagraph: SimpleReactCustomParagraph,
    reactContextParagraph: ReactContextParagraph,
  },
});

export const customReactBlockSchemaTestCases: EditorTestCases<
  typeof schema.blockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema
> = {
  name: "custom react block schema",
  createEditor: () => {
    return BlockNoteEditor.create({
      schema,
      uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
    });
  },
  documents: [
    {
      name: "reactFile/button",
      blocks: [
        {
          type: "reactFile",
        },
      ],
    },
    {
      name: "reactFile/basic",
      blocks: [
        {
          type: "reactFile",
          props: {
            url: "exampleURL",
            caption: "Caption",
          },
        },
      ],
    },
    {
      name: "reactFile/nested",
      blocks: [
        {
          type: "reactFile",
          props: {
            url: "exampleURL",
            caption: "Caption",
          },
          children: [
            {
              type: "reactFile",
              props: {
                url: "exampleURL",
                caption: "Caption",
              },
            },
          ],
        },
      ],
    },
    {
      name: "reactImage/button",
      blocks: [
        {
          type: "reactImage",
        },
      ],
    },
    {
      name: "reactImage/basic",
      blocks: [
        {
          type: "reactImage",
          props: {
            url: "exampleURL",
            caption: "Caption",
            previewWidth: 256,
          },
        },
      ],
    },
    {
      name: "reactImage/nested",
      blocks: [
        {
          type: "reactImage",
          props: {
            url: "exampleURL",
            caption: "Caption",
            previewWidth: 256,
          },
          children: [
            {
              type: "reactImage",
              props: {
                url: "exampleURL",
                caption: "Caption",
                previewWidth: 256,
              },
            },
          ],
        },
      ],
    },
    {
      name: "reactCustomParagraph/basic",
      blocks: [
        {
          type: "reactCustomParagraph",
          content: "React Custom Paragraph",
        },
      ],
    },
    {
      name: "reactCustomParagraph/styled",
      blocks: [
        {
          type: "reactCustomParagraph",
          props: {
            textAlignment: "center",
            textColor: "orange",
            backgroundColor: "pink",
          },
          content: [
            {
              type: "text",
              styles: {},
              text: "Plain ",
            },
            {
              type: "text",
              styles: {
                textColor: "red",
              },
              text: "Red Text ",
            },
            {
              type: "text",
              styles: {
                backgroundColor: "blue",
              },
              text: "Blue Background ",
            },
            {
              type: "text",
              styles: {
                textColor: "red",
                backgroundColor: "blue",
              },
              text: "Mixed Colors",
            },
          ],
        },
      ],
    },
    {
      name: "reactCustomParagraph/nested",
      blocks: [
        {
          type: "reactCustomParagraph",
          content: "React Custom Paragraph",
          children: [
            {
              type: "reactCustomParagraph",
              content: "Nested React Custom Paragraph 1",
            },
            {
              type: "reactCustomParagraph",
              content: "Nested React Custom Paragraph 2",
            },
          ],
        },
      ],
    },
    {
      name: "simpleReactCustomParagraph/basic",
      blocks: [
        {
          type: "simpleReactCustomParagraph",
          content: "React Custom Paragraph",
        },
      ],
    },
    {
      name: "simpleReactCustomParagraph/styled",
      blocks: [
        {
          type: "simpleReactCustomParagraph",
          props: {
            textAlignment: "center",
            textColor: "orange",
            backgroundColor: "pink",
          },
          content: [
            {
              type: "text",
              styles: {},
              text: "Plain ",
            },
            {
              type: "text",
              styles: {
                textColor: "red",
              },
              text: "Red Text ",
            },
            {
              type: "text",
              styles: {
                backgroundColor: "blue",
              },
              text: "Blue Background ",
            },
            {
              type: "text",
              styles: {
                textColor: "red",
                backgroundColor: "blue",
              },
              text: "Mixed Colors",
            },
          ],
        },
      ],
    },
    {
      name: "simpleReactCustomParagraph/nested",
      blocks: [
        {
          type: "simpleReactCustomParagraph",
          content: "Custom React Paragraph",
          children: [
            {
              type: "simpleReactCustomParagraph",
              content: "Nested React Custom Paragraph 1",
            },
            {
              type: "simpleReactCustomParagraph",
              content: "Nested React Custom Paragraph 2",
            },
          ],
        },
      ],
    },
    {
      name: "reactContextParagraph/basic",
      blocks: [
        {
          type: "reactContextParagraph",
          content: "React Context Paragraph",
        },
      ],
    },
  ],
};
