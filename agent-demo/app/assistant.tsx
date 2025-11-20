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
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useAISDKRuntime } from "@assistant-ui/react-ai-sdk";
import { useEffect } from "react";

import { useChat } from "@ai-sdk/react";
import dynamic from "next/dynamic";
import { useChatContext } from "./page";

const Document = dynamic(() => import("./document"), { ssr: false });

export const Assistant = () => {
  const ctx = useChatContext();
  const chat = useChat({
    chat: ctx.chat,
  });

  const runtime = useAISDKRuntime(chat);

  useEffect(() => {
    // not documented!
    (ctx.transport as any).setRuntime(runtime);
  }, [runtime, ctx.transport]);

  return (
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
  );
};
