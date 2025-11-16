"use client";

import { AssistantModal } from "@/components/assistant-ui/assistant-modal";
import { ThreadListSidebar } from "@/components/assistant-ui/threadlist-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Chat, useChat } from "@ai-sdk/react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import {
  AssistantChatTransport,
  useAISDKRuntime,
} from "@assistant-ui/react-ai-sdk";
import { createContext, useContext, useEffect, useRef, useState } from "react";

import { BlockNoteEditor } from "@blocknote/core";
import { _getApplySuggestionsTr, getAIExtension } from "@blocknote/xl-ai";
import { isToolOrDynamicToolUIPart, isToolUIPart, UIMessage } from "ai";

import dynamic from "next/dynamic";
import { Node, Slice } from "prosemirror-model";
const transport = new AssistantChatTransport({
  api: "/api/chat",
});
const Document = dynamic(() => import("./document"), { ssr: false });

export const Assistant = () => {
  const chatRef = useRef<Chat<UIMessage>>(undefined);
  if (!chatRef.current) {
    // TODO: would be better to get rid of this, but currently we need the raw chat object (on context)
    chatRef.current = new Chat({
      // api: "/api/chat",
      transport,
    });
    chatRef.current.sendMessageOrig = chatRef.current.sendMessage;
    chatRef.current.sendMessage = async (message: UIMessage) => {
      if (chatRef.current.sendMessageAlt) {
        return chatRef.current.sendMessageAlt(message);
      } else {
        return chatRef.current.sendMessageOrig(message);
      }
    };
  }
  const chat = useChat({
    chat: chatRef.current,
    // api: "/api/chat",
    // transport,
  });
  const runtime = useAISDKRuntime(chat);

  useEffect(() => {
    // not documented!
    transport.setRuntime(runtime);
  }, [runtime]);
  // const runtime = useChatRuntime({
  //   transport: new AssistantChatTransport({
  //     api: "/api/chat",
  //   }),
  // });

  useEffect(() => {
    console.log(chat);
    // debugger;
  }, [chat]);

  return (
    <ChatContextProvider chat={chatRef.current}>
      <AssistantRuntimeProvider runtime={runtime}>
        <SidebarProvider>
          <div className="flex h-dvh w-full pr-0.5">
            <ThreadListSidebar />
            <SidebarInset>
              <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
                <SidebarTrigger />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      {/* <BreadcrumbLink
                      href="https://www.assistant-ui.com/docs/getting-started"
                      target="_blank"
                      rel="noopener noreferrer"
                    > */}
                      Agent demo
                      {/* </BreadcrumbLink> */}
                    </BreadcrumbItem>
                    {/* <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Starter Template</BreadcrumbPage>
                  </BreadcrumbItem> */}
                  </BreadcrumbList>
                </Breadcrumb>
              </header>
              <div className="flex-1 overflow-hidden">
                {/* <Thread /> */}
                <div className="mx-auto max-w-2xl">
                  <Document />
                </div>
              </div>
            </SidebarInset>
          </div>
        </SidebarProvider>
        <AssistantModal />
      </AssistantRuntimeProvider>
    </ChatContextProvider>
  );
};

const ChatContextProvider = ({
  children,
  chat,
}: {
  children: React.ReactNode;
  chat: Chat<UIMessage>;
}) => {
  // Note: lots of functionality on context, maybe some can be moved to components?
  const [editor, setEditor] = useState<
    BlockNoteEditor<any, any, any> | undefined
  >(undefined);

  const [hasSuggestions, setHasSuggestions] = useState(false);

  const acceptChanges = () => {
    if (!editor) {
      throw new Error("Editor not found");
    }
    getAIExtension(editor).acceptChanges();
    chat.messages = chat.messages.map((message) => {
      if (
        message.role === "assistant" &&
        message.parts.some(
          (part) =>
            isToolUIPart(part) && part.type === "tool-applyDocumentOperations",
        )
      ) {
        if (message.metadata?.applied === undefined) {
          message.metadata = { ...(message.metadata || {}), applied: true };
        }
      }
      return message;
    });
  };
  const rejectChanges = () => {
    if (!editor) {
      throw new Error("Editor not found");
    }
    getAIExtension(editor).rejectChanges();
    chat.messages = chat.messages.map((message) => {
      if (
        message.role === "assistant" &&
        message.parts.some(
          (part) =>
            isToolUIPart(part) && part.type === "tool-applyDocumentOperations",
        )
      ) {
        if ((message.metadata as any).applied === undefined) {
          message.metadata = { ...(message.metadata || {}), applied: false };
        }
      }
      return message;
    });
  };

  const [previewDocument, setPreviewDocument] = useState<string | undefined>();

  useEffect(() => {
    if (!editor) {
      return;
    }
    const unsubscribe = editor.onChange((editor) => {
      const tr = _getApplySuggestionsTr(editor);
      if (tr.docChanged) {
        setHasSuggestions(true);
      } else {
        setHasSuggestions(false);
      }
    });
    return unsubscribe;
  }, [editor]);

  const previousDocumentState = useRef<Node | undefined>(undefined);

  useEffect(() => {
    console.log("previewDocument", previewDocument);
    if (!editor) {
      return;
    }
    if (!previewDocument) {
      console.log("resetting document 1");
      if (previousDocumentState.current) {
        // reset
        console.log("resetting document");

        editor.transact((tr) => {
          tr.replace(
            0,
            tr.doc.content.size,
            new Slice(previousDocumentState.current!.content, 0, 0),
          );
        });
        previousDocumentState.current = undefined;
      }
      return;
    }

    // set preview document
    const documentState = getMessageWithToolCallId(chat, previewDocument)
      ?.metadata?.documentState;

    const newNode = Node.fromJSON(editor.pmSchema, documentState.pm);

    if (editor.prosemirrorState.doc.eq(newNode)) {
      // duplicate strict mode render?
      // smelly, probably wrong architecture between effect / ref / etc.
      return;
    }

    console.log("documentState", documentState);
    previousDocumentState.current = editor._tiptapEditor.state.doc;
    editor.transact((tr) => {
      tr.replace(0, tr.doc.content.size, new Slice(newNode.content, 0, 0));
    });
  }, [chat, editor, previewDocument, previousDocumentState]);

  return (
    <ChatContext.Provider
      value={{
        chat,
        setEditor,
        hasSuggestions: hasSuggestions && !previewDocument,
        acceptChanges,
        rejectChanges,
        setPreviewDocument,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export function getMessageWithToolCallId(
  chat: Chat<UIMessage>,
  toolCallId: string,
) {
  return chat.messages.find(
    (m) =>
      m.role === "assistant" &&
      m.parts.some(
        (p) => isToolOrDynamicToolUIPart(p) && p.toolCallId === toolCallId,
      ),
  );
}
// function getDocumentStateBeforeToolCall(
//   chat: Chat<UIMessage>,
//   toolCallId: string,
// ) {
//   let index = chat.messages.findIndex(
//     (m) =>
//       m.role === "assistant" &&
//       m.parts.some(
//         (p) => isToolOrDynamicToolUIPart(p) && p.toolCallId === toolCallId,
//       ),
//   );
//   if (index === -1) {
//     throw new Error("Tool call not found");
//   }
//   return chat.messages[index].metadata?.documentState;
//   // while (index >= 0) {
//   //   const message = chat.messages[index];
//   //   // find the last document-state message before the tool call and get the metadata
//   //   if (
//   //     message.role === "assistant" &&
//   //     message.id.startsWith("document-state-")
//   //   ) {
//   //     const state = (message.metadata as any)?.documentState;
//   //     return state;
//   //   }

//   //   index--;
//   // }
//   throw new Error("Document state not found");
// }

type ChatContextType = {
  chat: Chat<UIMessage>;
  hasSuggestions: boolean;
  setEditor: (editor: BlockNoteEditor<any, any, any>) => void;
  acceptChanges: () => void;
  rejectChanges: () => void;
  setPreviewDocument: (toolCallId: string | undefined) => void;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const chat = useContext(ChatContext);
  if (!chat) {
    throw new Error("ChatContext not found");
  }
  return chat;
};
