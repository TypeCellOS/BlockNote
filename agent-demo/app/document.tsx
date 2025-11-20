"use client";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { useChat } from "@ai-sdk/react";
import {
  ActionBarPrimitive,
  makeAssistantTool,
  makeAssistantToolUI,
  tool,
  ToolCallMessagePartComponent,
  ToolCallMessagePartProps,
  useAssistantApi,
} from "@assistant-ui/react";
import { BlockNoteEditor, filterSuggestionItems } from "@blocknote/core";
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
  aiDocumentFormats,
  AIMenuController,
  AIToolbarButton,
  createAIExtension,
  createStreamToolsArraySchema,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import { PencilIcon, UndoIcon } from "lucide-react";
import { useCallback, useEffect, useMemo } from "react";
import { getMessageWithToolCallId, useChatContext } from "./page";
const BASE_URL = "https://localhost:3000/ai";

const UndoActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="always"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      {/* <ActionBarPrimitive.Edit asChild> */}
      <TooltipIconButton
        tooltip="Revert to before this change"
        className="aui-user-action-edit"
      >
        <UndoIcon className="size-4" />
      </TooltipIconButton>
      {/* </ActionBarPrimitive.Edit> */}
    </ActionBarPrimitive.Root>
  );
};

const BlockNoteToolUI: ToolCallMessagePartComponent<any, any> = (
  props: ToolCallMessagePartProps<any, any> & {
    editor: BlockNoteEditor<any, any, any>;
  },
) => {
  const ctx = useChatContext();
  console.log("render");
  const onHover = useCallback(() => {
    ctx.setPreviewDocument(props.toolCallId);
  }, [props.toolCallId]);

  const onMouseLeave = useCallback(() => {
    ctx.setPreviewDocument(undefined);
    console.log("onMouseLeave");
  }, [ctx]);

  const message = getMessageWithToolCallId(ctx.chat, props.toolCallId);

  if (props.status.type === "running") {
    return (
      <div className="flex flex-col items-end text-sm text-muted-foreground">
        <PencilIcon className="size-4" /> Updating document...
      </div>
    );
  } else if (props.status.type === "complete") {
    return (
      // TODO: should get rid of min-h-10, but otherwise layout shifts when undo is shown
      <div
        className="flex min-h-10 flex-row items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        onMouseEnter={onHover}
        onMouseLeave={onMouseLeave}
      >
        <PencilIcon className="size-4" />{" "}
        <span
          className={message?.metadata?.applied === false ? "line-through" : ""}
        >
          Updated document
        </span>
        {/* <UndoIcon className="size-4" /> */}
        <UndoActionBar />
      </div>
    );
  } else {
    throw new Error("Not implemented");
  }
};

export default function Document() {
  const api = useAssistantApi();

  const ctx = useChatContext();
  const chatRaw = ctx.chat;
  const chat = useChat({
    chat: chatRaw,
  });

  // TODO: prefer to migrate to this?
  // useEffect(() => {
  //   api.on({ event: "*", scope: "*" }, (event) => {
  //     console.log("composer.sendMessages", event);
  //     debugger;
  //     // const message = api.thread().getState().messages[0];
  //     // message.
  //   });
  // }, [api]);

  // Creates a new editor instance.
  const editor = useCreateBlockNote({
    dictionary: {
      ...en,
      ai: aiEn, // add default translations for the AI extension
    },
    // Register the AI extension
    extensions: [
      createAIExtension({
        chatProvider: () => ctx.chat,
        // transport: new DefaultChatTransport({
        //   // URL to your backend API, see example source in `packages/xl-ai-server/src/routes/regular.ts`
        //   api: `${BASE_URL}/regular/streamText`,
        // }),
      }),
      // createAIAutoCompleteExtension(),
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

  useEffect(() => {
    ctx.setEditor(editor);
  }, [ctx, editor]);

  const streamTools = useMemo(() => {
    return aiDocumentFormats.html
      .getStreamToolsProvider()
      .getStreamTools(editor); // TODO: not document dependent?
  }, [editor]);

  const BlockNoteTool = makeAssistantTool({
    // type: "frontend",
    toolName: "applyDocumentOperations",
    ...tool({
      parameters: createStreamToolsArraySchema(streamTools),
      execute: async (args) => {
        // debugger;
        console.log(args);
      },
    }),
    render: (props) => <BlockNoteToolUI {...props} editor={editor} />,
  });

  const DocumentStateTool = makeAssistantToolUI({
    toolName: "document-state",
    render: (props) => null,
  });
  // Renders the editor instance using a React component.
  return (
    <div>
      <BlockNoteView
        editor={editor}
        // We're disabling some default UI elements
        formattingToolbar={false}
        slashMenu={false}
        style={{ paddingBottom: "300px" }}
      >
        <BlockNoteTool />
        <DocumentStateTool />
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
