import { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  FormattingToolbar,
  FormattingToolbarController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  SuggestionMenuController,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  AIExtension,
  aiDocumentFormats,
  AIMenuController,
  AIToolbarButton,
  defaultAIRequestSender,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import { DefaultChatTransport, isToolOrDynamicToolUIPart } from "ai";
import { getEnv } from "./getEnv";

const BASE_URL =
  getEnv("BLOCKNOTE_AI_SERVER_BASE_URL") || "https://localhost:3000/ai";

export default function App() {
  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn, // add default translations for the AI extension
    },
    // Register the AI extension
    extensions: [AIExtension()],
    ai: {
      // similar to https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence#sending-only-the-last-message
      // we adjust the transport to not send all messages to the backend
      transport: new DefaultChatTransport({
        // (see packages/xl-ai-server/src/routes/vercelAiSdkPersistence.ts)
        api: `${BASE_URL}/server-promptbuilder/streamText`,
        prepareSendMessagesRequest({ id, body, messages, requestMetadata }) {
          // we don't send the messages, just the information we need to compose / append messages server-side:
          // - the conversation id
          // - the promptData
          // - the tool results of the last message

          // we need to share data about tool calls with the backend,
          // as these can be client-side executed. The backend needs to know the tool outputs
          // in order to compose a new valid LLM request
          const lastToolParts =
            messages.length > 0
              ? messages[messages.length - 1].parts.filter((part) =>
                  isToolOrDynamicToolUIPart(part),
                )
              : [];

          return {
            body: {
              ...body,
              // TODO: this conversation id is client-side generated, we
              // should have a server-side generated id to ensure uniqueness
              // see https://github.com/vercel/ai/issues/7340#issuecomment-3307559636
              id,
              // get the promptData from requestMetadata (set by `promptAIRequestSender`) and send to backend
              promptData: (requestMetadata as any).promptData,
              lastToolParts,
              // messages, -> we explicitly don't send the messages array as we compose messages server-side
            },
          };
        },
      }),
      // customize the aiRequestSender to not update the messages array on the client-side
      aiRequestSender: defaultAIRequestSender(
        async () => {}, // disable the client-side promptbuilder
        aiDocumentFormats.html.defaultPromptInputDataBuilder,
      ),
    },
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
        // We're disabling some default UI elements
        formattingToolbar={false}
        slashMenu={false}
      >
        {/* Add the AI Command menu to the editor */}
        <AIMenuController />

        {/* We disabled the default formatting toolbar with `formattingToolbar=false` 
        and replace it for one with an "AI button" (defined below). 
        (See "Formatting Toolbar" in docs)
        */}
        <FormattingToolbarWithAI />

        {/* We disabled the default SlashMenu with `slashMenu=false` 
        and replace it for one with an AI option (defined below). 
        (See "Suggestion Menus" in docs)
        */}
        <SuggestionMenuWithAI editor={editor} />
      </BlockNoteView>
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
