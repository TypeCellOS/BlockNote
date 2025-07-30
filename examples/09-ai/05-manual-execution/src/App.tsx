import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  AIToolbarButton,
  StreamToolExecutor,
  createAIExtension,
  getAIExtension,
  getAISlashMenuItems,
  llmFormats,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn, // add default translations for the AI extension
    },
    // Register the AI extension
    extensions: [
      createAIExtension({
        model: undefined as any, // disable model
      }),
    ],
    // We set some initial content for demo purposes
    initialContent: [
      {
        type: "heading",
        props: {
          level: 1,
        },
        content: "Open source software",
      },
      {
        type: "paragraph",
        content:
          "Open source software refers to computer programs whose source code is made available to the public, allowing anyone to view, modify, and distribute the code. This model stands in contrast to proprietary software, where the source code is kept secret and only the original creators have the right to make changes. Open projects are developed collaboratively, often by communities of developers from around the world, and are typically distributed under licenses that promote sharing and openness.",
      },
      {
        type: "paragraph",
        content:
          "One of the primary benefits of open source is the promotion of digital autonomy. By providing access to the source code, these programs empower users to control their own technology, customize software to fit their needs, and avoid vendor lock-in. This level of transparency also allows for greater security, as anyone can inspect the code for vulnerabilities or malicious elements. As a result, users are not solely dependent on a single company for updates, bug fixes, or continued support.",
      },
      {
        type: "paragraph",
        content:
          "Additionally, open development fosters innovation and collaboration. Developers can build upon existing projects, share improvements, and learn from each other, accelerating the pace of technological advancement. The open nature of these projects often leads to higher quality software, as bugs are identified and fixed more quickly by a diverse group of contributors. Furthermore, using open source can reduce costs for individuals, businesses, and governments, as it is often available for free and can be tailored to specific requirements without expensive licensing fees.",
      },
    ],
  });

  // Renders the editor instance using a React component.
  return (
    <div>
      <BlockNoteView
        editor={editor}
        // // We're disabling some default UI elements
        // formattingToolbar={false}
        // slashMenu={false}
      />

      {/* <AIMenuController />
        <FormattingToolbarWithAI />
        <SuggestionMenuWithAI editor={editor} />
      </BlockNoteView> */}
      <div className={"edit-buttons"}>
        {/*Inserts a new block at start of document.*/}
        <button
          className={"edit-button"}
          onClick={async () => {
            const blockToChange = editor.document[1].id;
            const tools = llmFormats.html.streamTools.update(editor, {
              idsSuffixed: true,
              withDelays: true,
            });

            const executor = new StreamToolExecutor([tools]);
            await executor.executeOne({
              type: "update",
              id: blockToChange,
              block: "<p>Open source software is cool</p>",
            });
            await executor.waitTillEnd();
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await getAIExtension(editor).acceptChanges();
          }}
        >
          Update first block
        </button>
        <button
          className={"edit-button"}
          onClick={async () => {
            const blockToChange = editor.document[1].id;
            const tools = llmFormats.html.streamTools.update(editor, {
              idsSuffixed: true,
              withDelays: true,
            });

            const executor = new StreamToolExecutor([tools]);
            const writer = executor.writable.getWriter();
            writer.write({
              operation: {
                type: "update",
                id: blockToChange,
                block:
                  "<p>This Open source software like Hello World refers to computer programs, this is a longer update, let's write a first sentence that's quite long long long long here.",
              },
              isUpdateToPreviousOperation: false,
              isPossiblyPartial: true,
            });
            await new Promise((resolve) => setTimeout(resolve, 3000));
            writer.write({
              operation: {
                type: "update",
                id: blockToChange,
                block:
                  "<p>This Open source software like Hello World refers to computer programs, this is a longer update, let's write a first sentence that's quite long long long long here. And now let's write a second sentence.</p>",
              },
              isUpdateToPreviousOperation: true,
              isPossiblyPartial: false,
            });
            writer.close();

            await executor.waitTillEnd();
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await getAIExtension(editor).acceptChanges();
          }}
        >
          Update first block (streaming)
        </button>
      </div>
    </div>
  );
}

// Formatting toolbar with the `AIToolbarButton` added
function FormattingToolbarWithAI() {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          {...getFormattingToolbarItems()}
          {/* Add the AI button */}
          <AIToolbarButton />
        </FormattingToolbar>
      )}
    />
  );
}

// Slash menu with the AI option added
function SuggestionMenuWithAI(props: {
  editor: BlockNoteEditor<any, any, any>;
}) {
  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={async (query) =>
        filterSuggestionItems(
          [
            ...getDefaultReactSlashMenuItems(props.editor),
            // add the default AI slash menu items, or define your own
            ...getAISlashMenuItems(props.editor),
          ],
          query,
        )
      }
    />
  );
}
