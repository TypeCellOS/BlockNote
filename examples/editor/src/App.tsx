import { useEffect } from "react";
import { defaultBlockSchema, BlockSchema } from "@blocknote/core";
import { BlockNoteView, useBlockNote, createReactBlockSpec, getDefaultReactSlashMenuItems, ReactSlashMenuItem } from "@blocknote/react";

import "@blocknote/core/style.css";
import styles from "./App.module.css";

export const AccordionBlock = createReactBlockSpec({
  type: 'accordion',
  propSchema: {
    label: {
      default: 'Default Label',
    },
    testBoolean: {
      default: false,
    },
    autoLayout: {
      default: {
        enabled: false,
        deep: {
          nested: {
            value: 'Default Value',
            creepArray: ['why', 'would', 'someone', 'do', 'this', '?']
          }
        }
      }
    }
  },
  render: ({ editor, block }) => {
    useEffect(() => {
      const id = setTimeout(() => {
        editor.updateBlock(block, {
          props: {
            autoLayout: {
              ...block.props.autoLayout,
              enabled: true
            }
          }
        })
      }, 500)

      return () => {
        clearTimeout(id)
      }
    }, [block])

    useEffect(() => {
      const id = setTimeout(() => {
        editor.updateBlock(block, {
          props: {
            testBoolean: true
          }
        })
      }, 500)

      return () => {
        clearTimeout(id)
      }
    }, [block])

    useEffect(() => {
      const id = setTimeout(() => {
        editor.updateBlock(block, {
          props: {
            autoLayout: {
              ...block.props.autoLayout,
              deep: {
                nested: {
                  ...block.props.autoLayout.deep.nested,
                  value: 'Updated Value 2222'
                }
              }
            }
          }
        })
      }, 500)

      return () => {
        clearTimeout(id)
      }
    }, [block])

    useEffect(() => {
      const id = setTimeout(() => {
        editor.updateBlock(block, {
          props: {
            label: 'Updated Label'
          }
        })
      }, 500)

      return () => {
        clearTimeout(id)
      }
    }, [block])

    return (
      <>
        <h2>{block.props.label}</h2>

        {
          block.props.autoLayout?.enabled ? 
            (
              <div>
                Enabled
              </div>
            ) : 
          <></>
        }

        {
          block.props.testBoolean ? 
            (
              <div>
                Should render
              </div>
            ) : 
          <></>
        }


        <div>
          {block.props.autoLayout?.deep?.nested?.value}

          <div 
            style={{
              display: 'flex',
              gap: '8px'
            }}
          > 
            {block.props.autoLayout?.deep?.nested?.creepArray.map((item, index) => (
              <span key={index}>{item}</span>
            ))}
          </div>
        </div>
      </>
    );
  },
  containsInlineContent: false,
});

const customSchema = {
  ...defaultBlockSchema,
  accordion: AccordionBlock,
} satisfies BlockSchema;

const insertAccordion: ReactSlashMenuItem<typeof customSchema> = {
  name: 'Insert Accordion',
  execute: (editor) => {
    editor.insertBlocks(
      [
        {
          type: 'accordion',
        },
      ],
      editor.getTextCursorPosition().block,
      'before'
    );
  },
  aliases: ["accordion"],
  group: "Containers",
  icon: <>+</>,
  hint: 'Used to group content in an accordion.',
};

type WindowWithProseMirror = Window & typeof globalThis & { ProseMirror: any };

function App() {
  const editor = useBlockNote({
    onEditorContentChange: (editor) => {
      console.log(editor.topLevelBlocks);
    },
    editorDOMAttributes: {
      class: styles.editor,
      "data-test": "editor",
    },
    blockSchema: customSchema,
    slashMenuItems: [
      ...getDefaultReactSlashMenuItems(customSchema),
      insertAccordion,
    ],
    theme: "light",
  });

  // Give tests a way to get prosemirror instance
  (window as WindowWithProseMirror).ProseMirror = editor?._tiptapEditor;

  return <BlockNoteView editor={editor} />;
}

export default App;
