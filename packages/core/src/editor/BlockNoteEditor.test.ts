import { assertType, expect, it } from "vitest";
import { BlockNoteEditor } from "./BlockNoteEditor";
import { getBlockInfoFromPos } from "../api/getBlockInfoFromPos";
import { createBlockSpec } from "../schema/blocks/createSpec";
import { DefaultBlockSchema, defaultBlockSchema, defaultBlockSpecs } from "../blocks/defaultBlocks";
import { BlockSchemaFromSpecs, PartialBlock } from "../schema/blocks/types";
import { getDefaultSlashMenuItems, } from '../extensions/SlashMenu/defaultSlashMenuItems'
import { BaseSlashMenuItem } from "../extensions/SlashMenu/BaseSlashMenuItem";
/**
 * @vitest-environment jsdom
 */
it("creates an editor", () => {
  const editor = BlockNoteEditor.create();
  const blockInfo = getBlockInfoFromPos(editor._tiptapEditor.state.doc, 2);
  expect(blockInfo?.contentNode.type.name).toEqual("paragraph");
});

it("support custom block", () => {
  const testBlock = createBlockSpec(
    {
      type: "testBlock",
      propSchema: {
        content: {
          default: "test",
        },
      },
      content: "none",
    }, 
    {
      render: (block) => {
        const div = document.createElement("div");
        div.contentEditable = "true";
        div.innerHTML = block.props.content;

        return {
          dom: div,
        };
      },
    }
  )

  const editor = BlockNoteEditor.create({
    blockSpecs: {
      ...defaultBlockSpecs,
      test: testBlock,
    },
    slashMenuItems: [
      ...getDefaultSlashMenuItems(),
      {
        name: "table",
        execute: (_editor) => {
          assertType<BlockNoteEditor<DefaultBlockSchema & BlockSchemaFromSpecs<{
            test: typeof testBlock
          }>>>(_editor)

          const currentBlock = editor.getTextCursorPosition().block;

          // @ts-ignore
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const _errorHelloWorldBlock = {
            // @ts-expect-error type should be "testBlock"
            type: "test",
            props: {
              content: "Hello World",
            },
          } satisfies PartialBlock<BlockSchemaFromSpecs<{
            test: typeof testBlock
          }>, any, any>

          const helloWorldBlock = {
            type: "testBlock",
            props: {
              content: "Hello World",
            },
          } satisfies PartialBlock<BlockSchemaFromSpecs<{
            test: typeof testBlock
          }>, any, any>

          editor.insertBlocks([helloWorldBlock], currentBlock, "after");
        },
      },
    ],
  });

  assertType<BaseSlashMenuItem<
    typeof defaultBlockSchema,
    any,
    any
  >[]>(getDefaultSlashMenuItems(defaultBlockSchema))
  
  assertType<BaseSlashMenuItem<
    BlockSchemaFromSpecs<{
      test: typeof testBlock
    }>,
    any,
    any
  >[]>(getDefaultSlashMenuItems({
    test: testBlock['config'],
  }))
  
  // @ts-expect-error blockSpecs of editor need to inculde the test block
  assertType<BlockNoteEditor>(editor)

  assertType<BlockNoteEditor<DefaultBlockSchema & BlockSchemaFromSpecs<{
    test: typeof testBlock
  }>>>(editor)

  const blockInfo = getBlockInfoFromPos(editor._tiptapEditor.state.doc, 2);
  expect(blockInfo?.contentNode.type.name).toEqual("paragraph");
})