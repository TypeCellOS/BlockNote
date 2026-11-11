import { createAnthropic } from "@ai-sdk/anthropic";
import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
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
  fetchViaProxy,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import * as Y from "yjs";

import { ChatPanel, RunFromOutside } from "./ChatPanel";
import { getEnv } from "./getEnv";
import { initialContent } from "./initialContent";
import {
  createSessionTransport,
  sessionReviewOptions,
  useCloseEmptyReview,
  useJsonStore,
  useSession,
  useYjsNotices,
} from "./session";
import "./styles.css";
import { connectYDoc } from "./yjsRelay";

const BASE_URL =
  getEnv("BLOCKNOTE_AI_SERVER_BASE_URL") || "https://localhost:3000/ai";
const AGENT_URL = `${BASE_URL}/document-agent`;
/** The Yjs relay of the BlockNote AI server. */
const YJS_URL = `${BASE_URL}/yjs`;

/**
 * The modes of the example. The chat, the display and the review are the
 * same code. A mode selects only where the loop runs and where the
 * proposal lives.
 */
const MODES = {
  json: "Session on the server (JSON store)",
  yjs: "Session on the server (Yjs)",
  client: "Client (the loop runs in the browser)",
} as const;
type Mode = keyof typeof MODES;

function currentMode(): Mode {
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode !== null && mode in MODES ? (mode as Mode) : "json";
}

/**
 * The flag `guard=1` of the URL: an accept asks the server first (see
 * `sessionReviewOptions`). Without it, the editor writes an accept at once:
 * the base scenario.
 */
function hasAcceptGuard(): boolean {
  return new URLSearchParams(window.location.search).get("guard") === "1";
}

/** The options that all modes share: the dictionary and the two AI extensions. */
function editorOptions(agentOptions: DocumentAgentExtensionOptions) {
  return {
    dictionary: { ...en, ai: aiEn },
    extensions: [
      // The AI extension has the suggestion marks and the state of the AI menu.
      AIExtension(),
      // The chat is the review surface: a run from the chat does not open
      // the AI menu.
      DocumentAgentExtension({ ...agentOptions, aiMenu: false }),
    ],
  };
}

/** The options of the document agent for a session on the server. */
function sessionOptions(sessionUrl: string): DocumentAgentExtensionOptions {
  return {
    transport: createSessionTransport(sessionUrl),
    ...sessionReviewOptions(sessionUrl, hasAcceptGuard()),
  };
}

export default function App() {
  const mode = currentMode();
  return (
    <div className="agent-chat-example">
      <div className="agent-chat-modes">
        {Object.entries(MODES).map(([key, label]) => (
          <a
            key={key}
            href={`?mode=${key}${hasAcceptGuard() ? "&guard=1" : ""}`}
            aria-current={key === mode ? "page" : undefined}
          >
            {label}
          </a>
        ))}
        {mode !== "client" && (
          <a
            href={`?mode=${mode}${hasAcceptGuard() ? "" : "&guard=1"}`}
            aria-current={hasAcceptGuard() ? "page" : undefined}
            title="With the guard, an accept asks the server first. Without it, two users who accept the same change at the same time write its text two times."
          >
            Accept guard: {hasAcceptGuard() ? "on" : "off"}
          </a>
        )}
      </div>
      {mode === "json" ? (
        <JsonSession />
      ) : mode === "yjs" ? (
        <YjsSession />
      ) : (
        <ClientMode />
      )}
    </div>
  );
}

/**
 * A session on a document that the server has as JSON. The editor loads
 * the document from the server, and saves it there.
 */
function JsonSession() {
  const documentId = "chat-json";
  const [content, setContent] = useState<PartialBlock[] | undefined>();
  useEffect(() => {
    let current = true;
    void fetch(`${AGENT_URL}/documents/${documentId}`)
      .then((response) => (response.ok ? response.json() : initialContent))
      .catch(() => initialContent)
      .then((blocks: PartialBlock[]) => {
        if (current) {
          setContent(blocks);
        }
      });
    return () => {
      current = false;
    };
  }, []);
  return content === undefined ? null : (
    <JsonSessionEditor documentId={documentId} content={content} />
  );
}

function JsonSessionEditor(props: {
  documentId: string;
  content: PartialBlock[];
}) {
  const sessionUrl = `${AGENT_URL}/sessions/json/${props.documentId}`;
  const editor = useCreateBlockNote({
    ...editorOptions(sessionOptions(sessionUrl)),
    initialContent: props.content,
  });
  const notice = useJsonStore(editor, AGENT_URL, props.documentId);
  useSession(editor, sessionUrl, notice);
  return (
    <EditorWithChat editor={editor} sessionUrl={sessionUrl}>
      <RunFromOutside runsUrl={`${sessionUrl}/runs`} />
    </EditorWithChat>
  );
}

/** A session on a document of a Yjs collaboration server. */
function YjsSession() {
  const documentId = "chat-yjs";
  const sessionUrl = `${AGENT_URL}/sessions/yjs/${documentId}`;
  const doc = useMemo(() => new Y.Doc(), []);
  const editor = useCreateBlockNote(
    withCollaboration({
      ...editorOptions(sessionOptions(sessionUrl)),
      collaboration: {
        fragment: doc.getXmlFragment("document-store"),
        user: { name: "User", color: "#4f8ff7" },
      },
    }),
  );
  const [synced, setSynced] = useState(false);
  useEffect(
    () =>
      connectYDoc(`${YJS_URL}/${documentId}`, doc, () => {
        // The first client of a new room adds the content.
        const [first] = editor.document;
        if (editor.document.length === 1 && isEmpty(first)) {
          editor.replaceBlocks(editor.document, initialContent);
        }
        setSynced(true);
      }),
    [doc, editor],
  );
  // The notices of the session come through the Y.Doc. The first one is
  // the end of the first sync: then the editor has the document.
  const notice = useYjsNotices(doc);
  return (
    <EditorWithChat editor={editor} sessionUrl={sessionUrl}>
      {synced && (
        <YjsSessionSync editor={editor} url={sessionUrl} at={notice} />
      )}
      <RunFromOutside runsUrl={`${sessionUrl}/runs`} />
    </EditorWithChat>
  );
}

/** Gets the session of a Yjs document after the first sync, and after each notice. */
function YjsSessionSync(props: {
  editor: BlockNoteEditor<any, any, any>;
  url: string;
  at: number;
}) {
  useSession(props.editor, props.url, props.at);
  return null;
}

/**
 * Client mode: the loop and the tools run in the browser, and the proposal
 * lives in this editor. Only the LLM calls go to the server, through the
 * proxy. There is no session: no other caller can start a run.
 */
function ClientMode() {
  const transport = useMemo(
    () =>
      createInProcessTransport({
        model: createAnthropic({
          fetch: fetchViaProxy(
            (url) =>
              `${BASE_URL}/proxy?provider=anthropic&url=${encodeURIComponent(url)}`,
          ),
          apiKey: "fake-api-key",
        })("claude-haiku-5-5"),
        maxOutputTokens: 16000,
      }),
    [],
  );
  const editor = useCreateBlockNote({
    ...editorOptions({ transport }),
    initialContent,
  });
  return <EditorWithChat editor={editor} />;
}

function isEmpty(block: { content?: unknown } | undefined): boolean {
  return Array.isArray(block?.content) && block.content.length === 0;
}

/** The editor with the AI menu, and the chat next to it. */
function EditorWithChat(props: {
  editor: BlockNoteEditor<any, any, any>;
  /** The session of the document on the server, if the mode has one. */
  sessionUrl?: string;
  children?: ReactNode;
}) {
  const { editor, sessionUrl } = props;
  useCloseEmptyReview(editor);
  const side = useRef<HTMLDivElement>(null);
  // The AI menu hides the page outside it from assistive technology while it
  // is open. The chat is a part of the AI surface: keep it available.
  const floatingUIOptions = useMemo(
    () => ({
      focusManagerProps: {
        getInsideElements: () =>
          [editor.domElement, side.current].filter(
            (element): element is HTMLDivElement => element != null,
          ),
      },
    }),
    [editor],
  );
  return (
    <div className="agent-chat-columns">
      <div className="agent-chat-editor">
        <BlockNoteView
          editor={editor}
          formattingToolbar={false}
          slashMenu={false}
        >
          {/* The AI menu, with the items of the document agent. */}
          <AIMenuController
            aiMenu={DocumentAgentMenu}
            floatingUIOptions={floatingUIOptions}
          />
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
      <div className="agent-chat-side" ref={side}>
        <ChatPanel
          editor={editor}
          onStop={
            sessionUrl === undefined
              ? undefined
              : () => void fetch(`${sessionUrl}/stop`, { method: "POST" })
          }
        />
        {props.children}
      </div>
    </div>
  );
}
