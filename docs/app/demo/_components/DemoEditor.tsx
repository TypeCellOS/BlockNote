"use client";

import { codeBlockOptions } from "@blocknote/code-block";
import {
  BlockNoteSchema,
  combineByGroup,
  createCodeBlockSpec,
} from "@blocknote/core";
import {
  DefaultThreadStoreAuth,
  YjsThreadStore,
} from "@blocknote/core/comments";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import * as locales from "@blocknote/core/locales";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  BlockNoteViewEditor,
  FormattingToolbar,
  FormattingToolbarController,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getFormattingToolbarItems,
  useCreateBlockNote,
} from "@blocknote/react";
import {
  AIExtension,
  AIMenuController,
  AIToolbarButton,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEnFile } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import {
  DOCXExporter,
  docxDefaultSchemaMappings,
} from "@blocknote/xl-docx-exporter";
import {
  ODTExporter,
  odtDefaultSchemaMappings,
} from "@blocknote/xl-odt-exporter";
import {
  PDFExporter,
  pdfDefaultSchemaMappings,
} from "@blocknote/xl-pdf-exporter";
import { pdf } from "@react-pdf/renderer";
import { DefaultChatTransport } from "ai";
import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";
import YPartyKitProvider from "y-partykit/provider";
import * as Y from "yjs";
import { EditorMenu } from "./EditorMenu";
import { HARDCODED_USERS, uploadFile } from "./utils";

import "./styles.css";

const AI_API_URL = "https://localhost:3000/ai/regular/streamText";

// Formatting toolbar with AI button
function FormattingToolbarWithAI() {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <FormattingToolbar>
          {...getFormattingToolbarItems()}
          <AIToolbarButton />
        </FormattingToolbar>
      )}
    />
  );
}

export function DemoEditor() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isNewRoom, setIsNewRoom] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleHashChange = () => {
        const hash = window.location.hash.replace("#", "");
        if (hash) {
          setRoomId(hash);
          setIsNewRoom(false); // Manually changed hash -> mostly existing or user choice
        }
      };

      // Initial check
      const hash = window.location.hash.replace("#", "");
      if (hash) {
        setRoomId(hash);
        setIsNewRoom(false);
      } else {
        const newId = Math.random().toString(36).substring(2, 7);
        window.history.replaceState(null, "", "#" + newId);
        setRoomId(newId);
        setIsNewRoom(true);
      }

      window.addEventListener("hashchange", handleHashChange);
      return () => {
        window.removeEventListener("hashchange", handleHashChange);
      };
    }
  }, []);

  const url =
    typeof window !== "undefined" && roomId
      ? `${window.location.origin}${window.location.pathname}#${roomId}`
      : "";

  const content = !roomId ? (
    <div className="flex h-[700px] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
      <EditorMenu
        onExport={() => {}}
        user={HARDCODED_USERS[0]}
        setUser={() => {}}
        sidebarOpen={true}
        onToggleSidebar={() => {}}
        disabled={true}
      />
      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        <div className="text-stone-400">Loading...</div>
      </div>
    </div>
  ) : (
    <DemoEditorInner roomId={roomId} isNewRoom={isNewRoom} />
  );

  return (
    <div className="flex w-full max-w-5xl flex-col gap-4">
      <div className="flex w-full items-center justify-between rounded-lg border border-stone-200 bg-white p-3 shadow-sm">
        <span className="text-sm font-medium text-stone-600">
          ⚡️ Collaborate live! Share this URL:
        </span>
        <div className="flex flex-1 items-center gap-2 px-4">
          <input
            readOnly
            value={url}
            className="w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm text-stone-600 outline-none focus:border-stone-400"
            onClick={(e) => e.currentTarget.select()}
          />
          <button
            className="whitespace-nowrap rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-purple-700"
            onClick={() => {
              navigator.clipboard.writeText(url);
              alert("URL copied to clipboard!");
            }}
          >
            Copy Link
          </button>
        </div>
      </div>

      {content}

      <div className="mt-4 flex justify-center">
        <a
          href="https://blocknotejs.org"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-stone-900 px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-stone-700 hover:shadow-lg md:text-base"
        >
          Read the Documentation →
        </a>
      </div>
    </div>
  );
}

function DemoEditorInner({
  roomId,
  isNewRoom,
}: {
  roomId: string;
  isNewRoom: boolean;
}) {
  const { resolvedTheme } = useTheme();
  // const [mounted, setMounted] = useState(false);
  const [activeUser, setActiveUser] = useState(HARDCODED_USERS[0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { doc, provider } = useMemo(() => {
    const doc = new Y.Doc();
    const provider = new YPartyKitProvider(
      "blocknote-dev.yousefed.partykit.dev",
      "demo-" + roomId,
      doc,
    );
    return { doc, provider };
  }, [roomId, activeUser]);
  // Thread Store
  const threadStore = useMemo(() => {
    return new YjsThreadStore(
      activeUser.id,
      doc.getMap("threads"),
      new DefaultThreadStoreAuth(activeUser.id, "editor"),
    );
  }, [activeUser, doc]);

  const editor = useCreateBlockNote(
    {
      // Schema with MultiColumn & PageBreak
      // schema: withMultiColumn(withPageBreak(BlockNoteSchema.create())),
      // dropCursor: multiColumnDropCursor,
      schema: BlockNoteSchema.create().extend({
        blockSpecs: {
          codeBlock: createCodeBlockSpec(codeBlockOptions),
        },
      }),

      // Locales
      dictionary: {
        ...locales.en,
        // multi_column: multiColumnLocales.en,
        ai: aiEnFile,
      },

      // Collaboration
      collaboration: {
        provider,
        fragment: doc.getXmlFragment("blocknote"),
        user: { color: activeUser.color, name: activeUser.username },
      },

      // Extensions: AI, Comments
      extensions: [
        AIExtension({
          transport: new DefaultChatTransport({
            api: AI_API_URL,
          }),
        }),
        // CommentsExtension({ threadStore, resolveUsers }),
      ],

      uploadFile,
    },
    [activeUser, threadStore, provider, doc],
  );

  const getSlashMenuItems = useMemo(
    () => async (query: string) =>
      filterSuggestionItems(
        combineByGroup(
          getDefaultReactSlashMenuItems(editor),
          // getPageBreakReactSlashMenuItems(editor),
          // getMultiColumnSlashMenuItems(editor),
          getAISlashMenuItems(editor),
        ),
        query,
      ),
    [editor],
  );

  useEffect(() => {
    if (editor && isNewRoom) {
      editor.replaceBlocks(editor.document, [
        {
          type: "heading",
          content: "Welcome to BlockNote!",
        },
        {
          type: "paragraph",
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "This is a demo of BlockNote with ",
              styles: {},
            },
            {
              type: "text",
              text: "multi-cursor collaboration",
              styles: { bold: true },
            },
            {
              type: "text",
              text: ", ",
              styles: {},
            },
            {
              type: "text",
              text: "live comments",
              styles: { bold: true },
            },
            {
              type: "text",
              text: ", and ",
              styles: {},
            },
            {
              type: "text",
              text: "AI features",
              styles: { bold: true },
            },
            {
              type: "text",
              text: ".",
              styles: {},
            },
          ],
        },
        {
          type: "paragraph",
        },
        {
          type: "paragraph",
          content: "Share the URL above to collaborate with others ⚡️",
        },
        {
          type: "paragraph",
        },
      ]);
    }
  }, [editor, isNewRoom]);

  const handleExport = async (format: "pdf" | "docx" | "odt") => {
    let blob: Blob;
    let filename = `blocknote-export.${format}`;

    if (format === "pdf") {
      const exporter = new PDFExporter(editor.schema, pdfDefaultSchemaMappings);
      const pdfDocs = await exporter.toReactPDFDocument(editor.document);
      blob = await pdf(pdfDocs).toBlob();
    } else if (format === "docx") {
      const exporter = new DOCXExporter(
        editor.schema,
        docxDefaultSchemaMappings,
      );
      blob = await exporter.toBlob(editor.document);
    } else if (format === "odt") {
      const exporter = new ODTExporter(editor.schema, odtDefaultSchemaMappings);
      blob = await exporter.toODTDocument(editor.document);
    } else {
      return;
    }

    const link = document.createElement("a");
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="flex h-[700px] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
      <div className="relative z-30">
        <EditorMenu
          onExport={handleExport}
          user={activeUser}
          setUser={setActiveUser}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        <BlockNoteView
          editor={editor}
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          className="min-h-full flex-1 overflow-hidden"
          formattingToolbar={false}
          slashMenu={false}
          renderEditor={false}
          comments={false}
        >
          <AIMenuController />
          <FormattingToolbarWithAI />
          <SuggestionMenuController
            triggerCharacter={"/"}
            getItems={getSlashMenuItems}
          />

          <div className="flex h-full w-full">
            <div className="relative flex-1 overflow-y-auto pb-12 pl-4 pr-4 transition-all duration-300 ease-in-out">
              <div className="mx-auto min-h-full max-w-[800px] py-4">
                <BlockNoteViewEditor />
              </div>
              {/* <FloatingComposerController /> */}
              {/* {!sidebarOpen && <FloatingThreadController />} */}
            </div>

            <div
              className={`relative z-10 h-full overflow-y-auto bg-[#fbfbfb] transition-all duration-300 ease-in-out ${
                sidebarOpen
                  ? "w-[320px] translate-x-0 border-l border-stone-100 opacity-100"
                  : "w-0 translate-x-full overflow-hidden opacity-0"
              }`}
            >
              <div className="sticky top-0 z-20 border-b border-stone-100 bg-white/50 p-4 text-xs font-bold uppercase tracking-wider text-stone-400 backdrop-blur-sm">
                Comments
              </div>
              <div className="p-2">
                {/* <ThreadsSidebar filter="all" sort="recent-activity" /> */}
              </div>
            </div>
          </div>
        </BlockNoteView>
      </div>
    </div>
  );
}
