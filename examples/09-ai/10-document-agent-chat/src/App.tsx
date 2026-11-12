import { createAnthropic } from "@ai-sdk/anthropic";
import type { BlockNoteEditor, PartialBlock } from "@blocknote/core";
import { filterSuggestionItems } from "@blocknote/core/extensions";
import "@blocknote/core/fonts/inter.css";
import { en } from "@blocknote/core/locales";
import { withCollaboration as withYjs14Collaboration } from "@blocknote/core/y";
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
  fetchViaProxy,
  getAISlashMenuItems,
} from "@blocknote/xl-ai";
import {
  createInProcessTransport,
  DocumentAgentExtension,
  type DocumentAgentExtensionOptions,
  DocumentAgentMenu,
} from "@blocknote/xl-ai-lenses";
import { en as aiEn } from "@blocknote/xl-ai/locales";
import "@blocknote/xl-ai/style.css";
import "@blocknote/xl-ai-lenses/style.css";
import {
  createSuggestionCollaboration,
  SuggestionAgentExtension,
} from "@blocknote/xl-ai-lenses/yjs14";
import * as Y14 from "@y/y";
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
  useSuggestionSession,
  useYjs14Notices,
  useYjsNotices,
} from "./session";
import "./styles.css";
import { connectY14Doc } from "./yjs14Relay";
import { connectYDoc } from "./yjsRelay";

const BASE_URL =
  getEnv("BLOCKNOTE_AI_SERVER_BASE_URL") || "https://localhost:3000/ai";
const AGENT_URL = `${BASE_URL}/document-agent`;
/** The Yjs relay of the BlockNote AI server. */
const YJS_URL = `${BASE_URL}/yjs`;
/** The Yjs 14 relay of the BlockNote AI server: two documents for each room. */
const YJS14_URL = `${BASE_URL}/yjs14`;

/**
 * The modes of the example. The chat and the cards of the tool calls are
 * the same code.
 *
 * - The first three are the proposal mode of the document agent: they
 *   select only where the loop runs and where the proposal lives.
 * - `yjs14` is the Yjs 14 mode: the agent writes into a suggestion
 *   document, and a decision of a user is a change of the Y.Docs.
 */
const MODES = {
  json: "Session on the server (JSON store)",
  yjs: "Session on the server (Yjs)",
  client: "Client (the loop runs in the browser)",
  yjs14: "Yjs 14 suggestions",
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

/**
 * The flag `menu=1` of the URL: a run from the chat, and a run that the
 * editor follows, open the AI menu. Without it, the chat is the only review
 * surface, and the AI menu opens only when the user opens it.
 */
function opensAiMenu(): boolean {
  return new URLSearchParams(window.location.search).get("menu") === "1";
}

/** The options that all modes share: the dictionary and the two AI extensions. */
function editorOptions(agentOptions: DocumentAgentExtensionOptions) {
  return {
    dictionary: { ...en, ai: aiEn },
    extensions: [
      // The AI extension has the suggestion marks and the state of the AI menu.
      AIExtension(),
      // The chat is the review surface: a run from the chat does not open
      // the AI menu (see `opensAiMenu`).
      DocumentAgentExtension({ ...agentOptions, aiMenu: opensAiMenu() }),
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

/**
 * Where the server keeps the state of the sessions (the chats, the
 * proposals, the streams of the runs): in files that stay after a restart
 * of the server, or in its memory. `undefined` until the server answers.
 */
function useServerStorage(): "files" | "memory" | undefined {
  const [kind, setKind] = useState<"files" | "memory">();
  useEffect(() => {
    let current = true;
    void fetch(`${AGENT_URL}/storage`).then(
      async (response) => {
        if (!response.ok) {
          return;
        }
        const storage = (await response.json()) as { kind?: unknown };
        if (
          current &&
          (storage.kind === "files" || storage.kind === "memory")
        ) {
          setKind(storage.kind);
        }
      },
      () => undefined,
    );
    return () => {
      current = false;
    };
  }, []);
  return kind;
}

export default function App() {
  const mode = currentMode();
  const storage = useServerStorage();
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
        {(mode === "json" || mode === "yjs") && (
          <a
            href={`?mode=${mode}${hasAcceptGuard() ? "" : "&guard=1"}`}
            aria-current={hasAcceptGuard() ? "page" : undefined}
            title="With the guard, an accept asks the server first. Without it, two users who accept the same change at the same time write its text two times."
          >
            Accept guard: {hasAcceptGuard() ? "on" : "off"}
          </a>
        )}
        {mode !== "client" && storage !== undefined && (
          <span
            className="agent-chat-storage"
            title="Start the AI server with DOCUMENT_AGENT_DATA_DIR to keep the state of the sessions in files."
          >
            {storage === "files"
              ? "Server state: in files. It stays after a restart of the server."
              : "Server state: in memory. A restart of the server loses it."}
          </span>
        )}
      </div>
      {mode === "json" ? (
        <JsonSession />
      ) : mode === "yjs" ? (
        <YjsSession />
      ) : mode === "yjs14" ? (
        <Yjs14Session />
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
      <CloseEmptyReview editor={editor} />
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
      <CloseEmptyReview editor={editor} />
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
  return (
    <EditorWithChat editor={editor}>
      <CloseEmptyReview editor={editor} />
    </EditorWithChat>
  );
}

/** The name of the type of the document content in the two Yjs 14 documents. */
const YJS14_FRAGMENT = "document-store";

/**
 * A session on a document in Yjs 14 mode. The editor has a replica of the
 * main document and of the suggestion document. It shows the changes of
 * the agent as suggestions of Yjs 14, and the user can type at each time.
 */
function Yjs14Session() {
  const documentId = "chat-yjs14";
  const sessionUrl = `${AGENT_URL}/sessions/yjs14/${documentId}`;
  const docs = useMemo(() => {
    const main = new Y14.Doc();
    // No garbage collection: a reject of a suggested deletion needs its text.
    const suggestion = new Y14.Doc({ isSuggestionDoc: true, gc: false });
    return {
      main,
      suggestion,
      ...createSuggestionCollaboration({
        main,
        suggestion,
        fragment: YJS14_FRAGMENT,
      }),
    };
  }, []);
  const editor = useCreateBlockNote(
    withYjs14Collaboration({
      dictionary: { ...en, ai: aiEn },
      extensions: [
        AIExtension(),
        SuggestionAgentExtension({
          transport: createSessionTransport(sessionUrl),
          aiMenu: opensAiMenu(),
          main: docs.main,
          suggestion: docs.suggestion,
          fragment: YJS14_FRAGMENT,
        }),
      ],
      collaboration: {
        ...docs.collaboration,
        user: { name: "User", color: "#4f8ff7" },
      },
    }),
  );
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    let states = 0;
    function onState() {
      if (++states < 2) {
        return;
      }
      // The first client of a new room adds the content.
      const [first] = editor.document;
      if (editor.document.length === 1 && isEmpty(first)) {
        editor.replaceBlocks(editor.document, initialContent);
      }
      setSynced(true);
    }
    const room = `${YJS14_URL}/${documentId}`;
    const closeMain = connectY14Doc(`${room}/main`, docs.main, onState);
    const closeSuggestion = connectY14Doc(
      `${room}/suggestion`,
      docs.suggestion,
      onState,
    );
    return () => {
      closeMain();
      closeSuggestion();
    };
  }, [docs, editor]);
  // The notices of the session come through the suggestion document.
  const notice = useYjs14Notices(docs.suggestion);
  return (
    <EditorWithChat editor={editor} sessionUrl={sessionUrl}>
      {synced && (
        <SuggestionSessionSync editor={editor} url={sessionUrl} at={notice} />
      )}
      <RunFromOutside runsUrl={`${sessionUrl}/runs`} />
    </EditorWithChat>
  );
}

/** Gets the chat of a document in Yjs 14 mode after the first sync, and after each notice. */
function SuggestionSessionSync(props: {
  editor: BlockNoteEditor<any, any, any>;
  url: string;
  at: number;
}) {
  useSuggestionSession(props.editor, props.url, props.at);
  return null;
}

/**
 * Ends a review of the proposal mode that has nothing to review (see
 * `useCloseEmptyReview`). The Yjs 14 mode does this itself.
 */
function CloseEmptyReview(props: { editor: BlockNoteEditor<any, any, any> }) {
  useCloseEmptyReview(props.editor);
  return null;
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
