// import logo from './logo.svg'
import { z } from 'zod';
import { DefaultBlockSchema, defaultBlockSchema } from '@blocknote/core';
import { BlockNoteView, useBlockNote, createReactBlockSpec, ReactSlashMenuItem, defaultReactSlashMenuItems } from "@blocknote/react";
import "@blocknote/core/style.css";
import styles from "./App.module.css";

export const AccordionBlock = createReactBlockSpec({
  type: 'accordion',
  propSchema: z.object({
    label: z.string(),
    autoLayout: z.object({
      enabled: z.boolean(),
    }).optional(),
  }),
  render: ({ editor, block }) => {
    return (
      <>
        <h2 className='mb-2'>{block.props.label}</h2>
        {
          block.props.autoLayout?.enabled ? 
            (
              <div className='flex flex-col'>
                Enabled
              </div>
            ) : 
          <></>
        }
      </>
    );
  },
  containsInlineContent: false,
});

// Creates a slash menu item for inserting an image block.
export const insertAccordion = new ReactSlashMenuItem<
  DefaultBlockSchema & { accordion: typeof AccordionBlock }
>(
  'Insert Accordion',
  (editor) => {
    editor.insertBlocks(
      [
        // Default values are set here
        {
          type: 'accordion',
          props: {
            label: 'Default',
            autoLayout: {
              enabled: true
            }
          },
        },
      ],
      editor.getTextCursorPosition().block,
      'before'
    );
  },
  ['accordion'],
  'Containers',
  <>+</>,
  'Used to group content in an accordion.'
);


type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

function App() {
  const editor = useBlockNote({
    onEditorContentChange: (editor) => {
      console.log(editor.topLevelBlocks);
    },
    blockSchema: {
      ...defaultBlockSchema,
      accordion: AccordionBlock,
    },
    slashCommands: [
      ...defaultReactSlashMenuItems,
      insertAccordion
    ],
    editorDOMAttributes: {
      class: styles.editor,
      "data-test": "editor",
    },
    theme: "light",
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView editor={editor} />;
}

export default App;
