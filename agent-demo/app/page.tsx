"use client";
import { Assistant } from "./assistant";

import { Chat } from "@ai-sdk/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { BlockNoteEditor } from "@blocknote/core";
import { _getApplySuggestionsTr, getAIExtension } from "@blocknote/xl-ai";
import {
  ChatTransport,
  isToolOrDynamicToolUIPart,
  isToolUIPart,
  UIMessage,
} from "ai";

import { BlockNoteAISDKChat } from "@/components/BlockNoteChat";
import { trackToolCallCheckpoints } from "@/components/checkpoints";
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { Node, Slice } from "prosemirror-model";

const transport = new AssistantChatTransport({
  api: "/api/chat",
});

export default function Home() {
  const chatRef = useRef<BlockNoteAISDKChat<UIMessage>>(undefined);
  if (!chatRef.current) {
    // TODO: would be better to get rid of this, but currently we need the raw chat object (on context)
    chatRef.current = new BlockNoteAISDKChat({
      // api: "/api/chat",
      transport,
    });

    // chatRef.current.sendMessageOrig = chatRef.current.sendMessage;
    // chatRef.current.sendMessage = async (message: UIMessage) => {
    //   if (chatRef.current.sendMessageAlt) {
    //     return chatRef.current.sendMessageAlt(message);
    //   } else {
    //     return chatRef.current.sendMessageOrig(message);
    //   }
    // };
  }
  // const chat = useChat({
  //   chat: chatRef.current,
  //   // api: "/api/chat",
  //   // transport,
  // });

  return (
    <ChatContextProvider chat={chatRef.current} transport={transport}>
      <Assistant />
    </ChatContextProvider>
  );
}

const ChatContextProvider = ({
  children,
  chat,
}: {
  children: React.ReactNode;
  chat: BlockNoteAISDKChat<UIMessage>;
  transport: ChatTransport<UIMessage>;
}) => {
  // Note: lots of functionality on context, maybe some can be moved to components?
  const [editor, setEditor] = useState<
    BlockNoteEditor<any, any, any> | undefined
  >(undefined);

  // TODO: dispose is never called
  const { checkpoints } = useMemo(
    () =>
      editor
        ? trackToolCallCheckpoints(chat, editor)
        : { checkpoints: new Map(), dispose: () => {} },
    [chat, editor],
  );

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
    const documentState = checkpoints.get(previewDocument)!;

    if (!documentState || !documentState.pm) {
      debugger;
    }

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
        transport,
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
  chat: BlockNoteAISDKChat<UIMessage>;
  hasSuggestions: boolean;
  setEditor: (editor: BlockNoteEditor<any, any, any>) => void;
  acceptChanges: () => void;
  rejectChanges: () => void;
  setPreviewDocument: (toolCallId: string | undefined) => void;
  transport: ChatTransport<UIMessage>;
};

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const chat = useContext(ChatContext);
  if (!chat) {
    throw new Error("ChatContext not found");
  }
  return chat;
};
