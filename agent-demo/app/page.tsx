"use client";
import { Assistant } from "./assistant";

import { useRef } from "react";

import { UIMessage } from "ai";

import { BlockNoteAISDKChat } from "@/components/BlockNoteChat";
import { ChatContextProvider } from "@/components/ChatContext";
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";

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
  }
  return (
    <ChatContextProvider chat={chatRef.current} transport={transport}>
      <Assistant />
    </ChatContextProvider>
  );
}
