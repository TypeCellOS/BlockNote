import { createAnthropic } from "@ai-sdk/anthropic";
import { BlockNoteEditor } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { withCollaboration } from "@blocknote/core/yjs";
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
  AIMenuController,
  AIToolbarButton,
  createInProcessTransport,
  DocumentAgentExtension,
  type DocumentAgentExtensionOptions,
  DocumentAgentMenu,
  DocumentAgentReview,
  fetchViaProxy,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import { DefaultChatTransport } from "ai";
import { type ReactNode, useEffect, useMemo } from "react";
import { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";

import { getEnv } from "./getEnv";
import { initialContent } from "./initialContent";
import {
  type ProposalNotice,
  ServerRunPanel,
  useJsonStore,
  useReviewSync,
  useYjsNotices,
} from "./ServerRunPanel";
import "./styles.css";

const BASE_URL =
  getEnv("BLOCKNOTE_AI_SERVER_BASE_URL") || "https://localhost:3000/ai";
const AGENT_URL = `${BASE_URL}/document-agent`;
/** The y-websocket server of the mode "Server run (Yjs)". */
const YJS_URL = "ws://localhost:1234";

/**
 * The four modes of the example. The code of the agent, of the display and
 * of the review is the same. A mode selects only where the loop runs and
 * how the proposal comes to the editor.
 */
const MODES = {
  server: "Server (the loop runs on the server)",
  client: "Client (the loop runs in the browser)",
  json: "Server run (JSON store)",
  yjs: "Server run (Yjs)",
} as const;
type Mode = keyof typeof MODES;

function currentMode(): Mode {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode !== null && mode in MODES ? (mode as Mode) : "server";
}

/** The transport of a run that the user starts. A run that a server starts needs none. */
function transportOf(mode: Mode): DocumentAgentExtensionOptions["transport"] {
  switch (mode) {
    case "server":
      // Server mode: the server runs the loop and the tools.
      return new DefaultChatTransport({ api: `${AGENT_URL}/chat` });
    case "client":
      // Client mode: the browser runs the loop and the tools. Only the LLM
      // calls go to the server, through the proxy: the API key stays there.
      return createInProcessTransport({
        model: createAnthropic({
          fetch: fetchViaProxy(
            (url) =>
              `${BASE_URL}/proxy?provider=anthropic&url=${encodeURIComponent(url)}`,
          ),
          apiKey: "fake-api-key",
        })("claude-haiku-5-5"),
        maxOutputTokens: 16000,
      });
    case "json":
    case "yjs":
      return undefined;
    default:
      return mode satisfies never;
  }
}

/** The options that all modes share: the dictionary and the two AI extensions. */
function editorOptions(agentOptions: DocumentAgentExtensionOptions) {
  return {
    dictionary: { ...en, ai: aiEn },
    extensions: [
      // The AI extension has the suggestion marks and the state of the AI menu.
      AIExtension(),
      DocumentAgentExtension(agentOptions),
    ],
  };
}

export default function App() {
  const mode = currentMode();
  return (
    <div className="document-agent">
      <div className="document-agent-modes">
        {Object.entries(MODES).map(([key, label]) => (
          <a
            key={key}
            href={`?mode=${key}`}
            aria-current={key === mode ? "page" : undefined}
          >
            {label}
          </a>
        ))}
      </div>
      {mode === "yjs" ? (
        <YjsEditor />
      ) : mode === "json" ? (
        <JsonStoreEditor />
      ) : (
        <UserRunEditor mode={mode} />
      )}
    </div>
  );
}

/** Server mode and client mode: the user starts the run from the AI menu. */
function UserRunEditor(props: { mode: Mode }) {
  const editor = useCreateBlockNote({
    ...editorOptions({ transport: transportOf(props.mode) }),
    initialContent,
  });
  return <EditorWithReview editor={editor} />;
}

/** A run that the server starts, on a document that the server has as JSON. */
function JsonStoreEditor() {
  const documentId = "demo-json";
  const sync = useReviewSync(AGENT_URL);
  const editor = useCreateBlockNote({
    ...editorOptions(sync.agentOptions),
    initialContent,
  });
  // The editor saves the document to the server, and gets the notices of
  // the proposals as server-sent events.
  const notice = useJsonStore(editor, AGENT_URL, documentId);
  return (
    <EditorWithReview editor={editor}>
      <ServerRunPanel
        editor={editor}
        agentUrl={AGENT_URL}
        documentId={documentId}
        source="json"
        notice={notice}
        sync={sync}
      />
    </EditorWithReview>
  );
}

/** A run that the server starts, on a document of a Yjs collaboration server. */
function YjsEditor() {
  const documentId = "demo-yjs";
  const { doc, provider } = useMemo(() => {
    const doc = new Y.Doc();
    return { doc, provider: new WebsocketProvider(YJS_URL, documentId, doc) };
  }, []);
  useEffect(() => () => provider.destroy(), [provider]);

  const sync = useReviewSync(AGENT_URL);
  const editor = useCreateBlockNote(
    withCollaboration({
      ...editorOptions(sync.agentOptions),
      collaboration: {
        provider,
        fragment: doc.getXmlFragment("document-store"),
        user: { name: "User", color: "#4f8ff7" },
      },
    }),
  );
  // The first client of a new room adds the content.
  useEffect(() => {
    function addContent(isSynced: boolean) {
      const [first] = editor.document;
      if (isSynced && editor.document.length === 1 && isEmpty(first)) {
        editor.replaceBlocks(editor.document, initialContent);
      }
    }
    provider.on("sync", addContent);
    return () => provider.off("sync", addContent);
  }, [editor, provider]);

  // The notices of the proposals come through the Y.Doc.
  const notice: ProposalNotice | undefined = useYjsNotices(doc);
  return (
    <EditorWithReview editor={editor}>
      <ServerRunPanel
        editor={editor}
        agentUrl={AGENT_URL}
        documentId={documentId}
        source="yjs"
        notice={notice}
        sync={sync}
      />
    </EditorWithReview>
  );
}

function isEmpty(block: { content?: unknown } | undefined): boolean {
  return Array.isArray(block?.content) && block.content.length === 0;
}

/** The editor with the AI menu, and the review of the proposal next to it. */
function EditorWithReview(props: {
  editor: BlockNoteEditor<any, any, any>;
  children?: ReactNode;
}) {
  const { editor } = props;
  return (
    <div className="document-agent-columns">
      <div className="document-agent-editor">
        <BlockNoteView
          editor={editor}
          formattingToolbar={false}
          slashMenu={false}
        >
          {/* The AI menu of the old engine, with the items of the document agent. */}
          <AIMenuController aiMenu={DocumentAgentMenu} />
          <FormattingToolbarController
            formattingToolbar={() => (
              <FormattingToolbar>
                {...getFormattingToolbarItems()}
                <AIToolbarButton />
              </FormattingToolbar>
            )}
          />
          <SuggestionMenuController
            triggerCharacter="/"
            getItems={async (query) =>
              filterSuggestionItems(
                [
                  ...getDefaultReactSlashMenuItems(editor),
                  ...getAISlashMenuItems(editor),
                ],
                query,
              )
            }
          />
        </BlockNoteView>
      </div>
      <div className="document-agent-side">
        {props.children}
        {/* One card for each tool call: its reason, an accept and a reject. */}
        <DocumentAgentReview editor={editor} />
      </div>
    </div>
  );
}
