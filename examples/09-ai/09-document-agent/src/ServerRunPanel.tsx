import type { BlockNoteEditor } from "@blocknote/core";
import { useExtension, useExtensionState } from "@blocknote/react";
import {
  DocumentAgentExtension,
  type DocumentAgentExtensionOptions,
  type Proposal,
} from "@blocknote/xl-ai-lenses";
import { useEffect, useMemo, useRef, useState } from "react";
import type * as Y from "yjs";

/** A notice of the server: a proposal has new batches, or its run ended. */
export type ProposalNotice = {
  proposalId: string;
  batches: number;
  status: "running" | "done" | "failed";
};

/**
 * Sends the review of the user to the proposal store of the server: the
 * accept or the reject of one tool call is a batch of the proposal. Thus,
 * an agent that still runs sees the review in its next tool call.
 */
export function useReviewSync(agentUrl: string) {
  const proposalId = useRef<string | undefined>(undefined);
  return useMemo(() => {
    const agentOptions: DocumentAgentExtensionOptions = {
      onReview(batch) {
        if (proposalId.current !== undefined) {
          void fetch(`${agentUrl}/proposals/${proposalId.current}/batches`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ batch }),
          });
        }
      },
      onClose() {
        proposalId.current = undefined;
      },
    };
    return { agentOptions, proposalId };
  }, [agentUrl]);
}

/**
 * The JSON store: saves the document of the editor to the server, and gets
 * the notices of the proposals as server-sent events. Returns the last
 * notice.
 */
export function useJsonStore(
  editor: BlockNoteEditor<any, any, any>,
  agentUrl: string,
  documentId: string,
): ProposalNotice | undefined {
  const agent = useExtension(DocumentAgentExtension, { editor });
  const [notice, setNotice] = useState<ProposalNotice | undefined>();

  useEffect(() => {
    // `mainDocument()` is the document without the suggestions of a
    // proposal. It is safe to save in each state: `editor.document` is not.
    function save() {
      void fetch(`${agentUrl}/documents/${documentId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(agent.mainDocument()),
      });
    }
    save();
    return editor.onChange(save);
  }, [agent, agentUrl, documentId, editor]);

  useEffect(() => {
    const events = new EventSource(
      `${agentUrl}/documents/${documentId}/events`,
    );
    events.addEventListener("proposal", (event) =>
      setNotice(JSON.parse(event.data)),
    );
    return () => events.close();
  }, [agentUrl, documentId]);

  return notice;
}

/** The notices of the proposals of a Y.Doc: the server writes them into a map of the Y.Doc. */
export function useYjsNotices(doc: Y.Doc): ProposalNotice | undefined {
  const [notice, setNotice] = useState<ProposalNotice | undefined>();
  useEffect(() => {
    const notices = doc.getMap<Omit<ProposalNotice, "proposalId">>(
      "document-agent-proposals",
    );
    function onChange(event: Y.YMapEvent<Omit<ProposalNotice, "proposalId">>) {
      for (const proposalId of event.keysChanged) {
        const value = notices.get(proposalId);
        if (value !== undefined) {
          setNotice({ proposalId, ...value });
        }
      }
    }
    notices.observe(onChange);
    return () => notices.unobserve(onChange);
  }, [doc]);
  return notice;
}

/**
 * The panel of a run that the server starts. It stands for a script or an
 * external agent that starts a run on a document. The user can change the
 * document while the agent works, and opens the proposal for the review.
 */
export function ServerRunPanel(props: {
  editor: BlockNoteEditor<any, any, any>;
  agentUrl: string;
  documentId: string;
  source: "json" | "yjs";
  notice: ProposalNotice | undefined;
  sync: ReturnType<typeof useReviewSync>;
}) {
  const { editor, agentUrl, documentId, source, notice, sync } = props;
  const agent = useExtension(DocumentAgentExtension, { editor });
  const status = useExtensionState(DocumentAgentExtension, {
    editor,
    selector: (state) => state.status,
  });
  const [prompt, setPrompt] = useState(
    "Fix the spelling mistakes. Then add one sentence to the last paragraph.",
  );
  const [message, setMessage] = useState("");

  async function start() {
    setMessage("");
    const response = await fetch(`${agentUrl}/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ documentId, prompt, source }),
    });
    if (!response.ok) {
      setMessage("The server did not start the run.");
    }
  }

  async function review(proposalId: string) {
    const response = await fetch(`${agentUrl}/proposals/${proposalId}`);
    if (!response.ok) {
      setMessage("The server does not have this proposal.");
      return;
    }
    const { proposal } = (await response.json()) as { proposal: Proposal };
    sync.proposalId.current = proposalId;
    // The same display and the same accept as for a run of this client.
    agent.openProposal(proposal);
  }

  // A proposal in review gets its new batches.
  const reviewing = status === "reviewing";
  const openId = sync.proposalId.current;
  useEffect(() => {
    if (reviewing && notice !== undefined && notice.proposalId === openId) {
      void review(notice.proposalId);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- only a new notice opens the proposal again
  }, [notice?.batches, notice?.status]);

  return (
    <div className="document-agent-panel">
      <strong>Run on the server</strong>
      <textarea
        value={prompt}
        rows={3}
        onChange={(event) => setPrompt(event.target.value)}
      />
      <button onClick={() => void start()}>Start a run</button>
      {notice !== undefined && (
        <div>
          Proposal: {notice.batches} batch{notice.batches === 1 ? "" : "es"} (
          {notice.status}).{" "}
          <button
            disabled={status === "running"}
            onClick={() => void review(notice.proposalId)}
          >
            {reviewing ? "Load again" : "Review"}
          </button>
        </div>
      )}
      {message !== "" && <div>{message}</div>}
    </div>
  );
}
