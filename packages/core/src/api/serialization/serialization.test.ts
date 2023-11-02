import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { BlockNoteEditor } from "../../BlockNoteEditor";
import { Editor } from "@tiptap/core";
import { customBlockSerializer } from "./serialization";
import { uploadToTmpFilesDotOrg_DEV_ONLY } from "../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/uploadToTmpFilesDotOrg_DEV_ONLY";
import { createBlockSpec } from "../../extensions/Blocks/api/block";
import {
  imagePropSchema,
  renderImage,
} from "../../extensions/Blocks/nodes/BlockContent/ImageBlockContent/ImageBlockContent";
import { defaultBlockSchema } from "../../extensions/Blocks/api/defaultBlocks";
import { cleanHTML } from "../formatConversions/formatConversions";
import { DOMSerializer, Fragment, Node } from "prosemirror-model";

// This is a modified version of the default image block that does not implement
// a `serialize` function. It's used to test if the custom serializer by default
// serializes custom blocks using their `render` function.
const SimpleImage = createBlockSpec({
  type: "simpleImage",
  propSchema: imagePropSchema,
  containsInlineContent: false,
  render: renderImage as any,
});

const customSchema = {
  ...defaultBlockSchema,
  simpleImage: SimpleImage,
};

let editor: BlockNoteEditor<typeof customSchema>;
let tt: Editor;

beforeEach(() => {
  (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS = {};

  editor = new BlockNoteEditor({
    blockSchema: customSchema,
    uploadFile: uploadToTmpFilesDotOrg_DEV_ONLY,
  });
  tt = editor._tiptapEditor;
});

afterEach(() => {
  tt.destroy();
  editor = undefined as any;
  tt = undefined as any;

  delete (window as Window & { __TEST_OPTIONS?: any }).__TEST_OPTIONS;
});

// Tests `serializeNode`, `serializeFragment`, and `cleanHTML` methods.
async function serializeAndCompareSnapshots(
  serializer: DOMSerializer,
  blockGroup: Node
) {
  const serializeNodeHTML = (
    serializer.serializeNode(blockGroup) as HTMLElement
  ).outerHTML;
  const serializeFragmentHTML = (
    serializer.serializeFragment(Fragment.from(blockGroup)) as HTMLElement
  ).firstElementChild!.outerHTML;

  expect(serializeNodeHTML).toMatchSnapshot();
  expect(serializeFragmentHTML).toMatchSnapshot();

  const serializeNodeCleanHTML = await cleanHTML(serializeNodeHTML);
  const serializeFragmentCleanHTML = await cleanHTML(serializeFragmentHTML);

  expect(serializeNodeCleanHTML).toMatchSnapshot();
  expect(serializeFragmentCleanHTML).toMatchSnapshot();
}

describe("Convert paragraphs to structured HTML", () => {
  it("Convert paragraph to structured HTML", async () => {
    const serializer = customBlockSerializer(tt.schema, editor);

    const text = tt.schema.text("Paragraph");
    const paragraph = tt.schema.nodes["paragraph"].create(null, text);
    const blockContainer = tt.schema.nodes["blockContainer"].create(
      null,
      paragraph
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, [
      blockContainer,
    ]);

    await serializeAndCompareSnapshots(serializer, blockGroup);
  });

  it("Convert styled paragraph to structured HTML", async () => {
    const serializer = customBlockSerializer(tt.schema, editor);

    const text = [
      tt.schema.text("Plain "),
      tt.schema.text("Red Text ", [
        tt.schema.marks["textColor"].create({ color: "red" }),
      ]),
      tt.schema.text("Blue Background ", [
        tt.schema.marks["backgroundColor"].create({ color: "blue" }),
      ]),
      tt.schema.text("Mixed Colors", [
        tt.schema.marks["textColor"].create({ color: "red" }),
        tt.schema.marks["backgroundColor"].create({ color: "blue" }),
      ]),
    ];
    const paragraph = tt.schema.nodes["paragraph"].create(
      { textAlignment: "center" },
      text
    );
    const blockContainer = tt.schema.nodes["blockContainer"].create(
      { textColor: "red", backgroundColor: "blue" },
      paragraph
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, [
      blockContainer,
    ]);

    await serializeAndCompareSnapshots(serializer, blockGroup);
  });

  it("Convert nested paragraph to structured HTML", async () => {
    const serializer = customBlockSerializer(tt.schema, editor);

    const nestedText1 = tt.schema.text("Nested Paragraph 1");
    const nestedParagraph1 = tt.schema.nodes["paragraph"].create(
      null,
      nestedText1
    );
    const nestedBlockContainer1 = tt.schema.nodes["blockContainer"].create(
      null,
      nestedParagraph1
    );

    const nestedText2 = tt.schema.text("Nested Paragraph 2");
    const nestedParagraph2 = tt.schema.nodes["paragraph"].create(
      null,
      nestedText2
    );
    const nestedBlockContainer2 = tt.schema.nodes["blockContainer"].create(
      null,
      nestedParagraph2
    );

    const text = tt.schema.text("Paragraph");
    const paragraph = tt.schema.nodes["paragraph"].create(null, text);
    const nestedBlockGroup = tt.schema.nodes["blockGroup"].create(null, [
      nestedBlockContainer1,
      nestedBlockContainer2,
    ]);
    const blockContainer = tt.schema.nodes["blockContainer"].create(null, [
      paragraph,
      nestedBlockGroup,
    ]);
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, [
      blockContainer,
    ]);

    await serializeAndCompareSnapshots(serializer, blockGroup);
  });
});

describe("Convert images to structured HTML", () => {
  it("Convert add image button to structured HTML", async () => {
    const serializer = customBlockSerializer(tt.schema, editor);

    const image = tt.schema.nodes["image"].create(null);
    const blockContainer = tt.schema.nodes["blockContainer"].create(
      null,
      image
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, [
      blockContainer,
    ]);

    await serializeAndCompareSnapshots(serializer, blockGroup);
  });

  it("Convert image to structured HTML", async () => {
    const serializer = customBlockSerializer(tt.schema, editor);

    const image = tt.schema.nodes["image"].create({
      url: "exampleURL",
      caption: "Caption",
      width: 256,
    });
    const blockContainer = tt.schema.nodes["blockContainer"].create(
      null,
      image
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, [
      blockContainer,
    ]);

    await serializeAndCompareSnapshots(serializer, blockGroup);
  });

  it("Convert nested image to structured HTML", async () => {
    const serializer = customBlockSerializer(tt.schema, editor);

    const nestedImage = tt.schema.nodes["image"].create({
      url: "exampleURL",
      caption: "Caption",
      width: 256,
    });
    const nestedBlockContainer = tt.schema.nodes["blockContainer"].create(
      null,
      nestedImage
    );

    const image = tt.schema.nodes["image"].create({
      url: "exampleURL",
      caption: "Caption",
      width: 256,
    });
    const nestedBlockGroup = tt.schema.nodes["blockGroup"].create(null, [
      nestedBlockContainer,
    ]);
    const blockContainer = tt.schema.nodes["blockContainer"].create(null, [
      image,
      nestedBlockGroup,
    ]);
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, [
      blockContainer,
    ]);

    await serializeAndCompareSnapshots(serializer, blockGroup);
  });
});

describe("Convert simple images to structured HTML", () => {
  it("Convert simple add image button to structured HTML", async () => {
    const serializer = customBlockSerializer(tt.schema, editor);

    const image = tt.schema.nodes["simpleImage"].create(null);
    const blockContainer = tt.schema.nodes["blockContainer"].create(
      null,
      image
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, [
      blockContainer,
    ]);

    await serializeAndCompareSnapshots(serializer, blockGroup);
  });

  it("Convert simple image to structured HTML", async () => {
    const serializer = customBlockSerializer(tt.schema, editor);

    const image = tt.schema.nodes["simpleImage"].create({
      url: "exampleURL",
      caption: "Caption",
      width: 256,
    });
    const blockContainer = tt.schema.nodes["blockContainer"].create(
      null,
      image
    );
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, [
      blockContainer,
    ]);

    await serializeAndCompareSnapshots(serializer, blockGroup);
  });

  it("Convert nested image to structured HTML", async () => {
    const serializer = customBlockSerializer(tt.schema, editor);

    const nestedImage = tt.schema.nodes["simpleImage"].create({
      url: "exampleURL",
      caption: "Caption",
      width: 256,
    });
    const nestedBlockContainer = tt.schema.nodes["blockContainer"].create(
      null,
      nestedImage
    );

    const image = tt.schema.nodes["simpleImage"].create({
      url: "exampleURL",
      caption: "Caption",
      width: 256,
    });
    const nestedBlockGroup = tt.schema.nodes["blockGroup"].create(null, [
      nestedBlockContainer,
    ]);
    const blockContainer = tt.schema.nodes["blockContainer"].create(null, [
      image,
      nestedBlockGroup,
    ]);
    const blockGroup = tt.schema.nodes["blockGroup"].create(null, [
      blockContainer,
    ]);

    await serializeAndCompareSnapshots(serializer, blockGroup);
  });
});
