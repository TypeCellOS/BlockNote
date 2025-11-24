import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import {
  AIExtension,
  StreamToolExecutor,
  aiDocumentFormats,
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
    extensions: [AIExtension()],
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
      <BlockNoteView editor={editor} />

      <div className={"edit-buttons"}>
        {/*Inserts a new block at start of document.*/}
        <button
          className={"edit-button"}
          onClick={async () => {
            const blockToChange = editor.document[1].id;

            // Let's get the stream tools so we can invoke them manually
            // In this case, we're using the default stream tools, which allow all operations
            const tools = aiDocumentFormats.html
              .getStreamToolsProvider()
              .getStreamTools(editor, true);

            // Create an executor that can execute StreamToolCalls
            const executor = new StreamToolExecutor(tools);

            // Use `executeOne` to invoke a single, non-streaming StreamToolCall
            await executor.executeOne({
              type: "update",
              id: blockToChange,
              block: "<p>Open source software is cool</p>",
            });
            // accept the changes after 1 second
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await editor.getExtension(AIExtension)?.acceptChanges();
          }}
        >
          Update first block
        </button>
        <button
          className={"edit-button"}
          onClick={async () => {
            const blockToChange = editor.document[1].id;

            // Let's get the stream tools so we can invoke them manually
            // In this case, we choose to only get the "update" tool
            const tools = aiDocumentFormats.html
              .getStreamToolsProvider({
                // only allow "update" operations
                defaultStreamTools: {
                  update: true,
                },
              })
              .getStreamTools(editor, true);

            // Create an executor that can execute StreamToolCalls
            const executor = new StreamToolExecutor(tools);

            // We'll stream two updates: a partial update and a full update
            // to use streaming operations, we need to get a writer
            const writer = executor.writable.getWriter();

            // write a partial update
            writer.write({
              operation: {
                type: "update",
                id: blockToChange,
                block:
                  "<p>This Open source software like Hello World refers to computer programs, this is a longer update, let's write a first sentence that's quite long long long long here.",
              },
              // this is not an update to an earlier "update" StreamToolCall
              isUpdateToPreviousOperation: false,
              // this operation is a partial update and will be "completed" by the next update
              isPossiblyPartial: true,
              metadata: {},
            });
            await new Promise((resolve) => setTimeout(resolve, 3000));
            writer.write({
              operation: {
                type: "update",
                id: blockToChange,
                block:
                  "<p>This Open source software like Hello World refers to computer programs, this is a longer update, let's write a first sentence that's quite long long long long here. And now let's write a second sentence.</p>",
              },
              // this is an update to an earlier "update" StreamToolCall
              isUpdateToPreviousOperation: true,
              // this operation is not a partial update, we've received the entire invocation
              isPossiblyPartial: false,
              metadata: {},
            });

            await writer.close();
            await executor.finish();

            // accept the changes after 1 second
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await editor.getExtension(AIExtension)?.acceptChanges();
          }}
        >
          Update first block (streaming)
        </button>
        <button
          className={"edit-button"}
          onClick={async () => {
            const blockToChange = editor.document[1].id;

            // Let's get the stream tools so we can invoke them manually
            // In this case, we choose to only get the "update" tool
            const tools = aiDocumentFormats.html
              .getStreamToolsProvider({
                defaultStreamTools: {
                  // only allow "update" operations
                  update: true,
                },
              })
              .getStreamTools(editor, true);

            // Create an executor that can execute StreamToolCalls
            const executor = new StreamToolExecutor(tools);

            // We'll stream two updates: a partial update and a full update
            // to use streaming operations, we need to get a writer
            const writer = executor.writable.getWriter();

            // write a partial update, notice how the JSON is cut off (simulating a streaming json response)
            writer.write(
              `{
  "type": "update",
  "id": ${JSON.stringify(blockToChange + "$")},
  "block": "<p>This Open source software like Hello World refers to computer programs, this is a longer update, let's write a first sentence that's quite long long long long here.`,
            );
            await new Promise((resolve) => setTimeout(resolve, 3000));
            writer.write(`{
  "type": "update",
  "id": ${JSON.stringify(blockToChange + "$")},
  "block":
    "<p>This Open source software like Hello World refers to computer programs, this is a longer update, let's write a first sentence that's quite long long long long here. And now let's write a second sentence.</p>"
}`);

            await writer.close();
            await executor.finish();

            // accept the changes after 1 second
            await new Promise((resolve) => setTimeout(resolve, 1000));
            await editor.getExtension(AIExtension)?.acceptChanges();
          }}
        >
          Update first block (streaming strings)
        </button>
      </div>
    </div>
  );
}
