# Prototype: the text lens in `@blocknote/xl-ai` (the document agent)

Branch `proto/xl-ai-lens`, worktree `/Users/yousef/Programming/BlockNote-xl-ai-proto`. The base is `text-lens-readability` (`3d8b4d1a6`) with `origin/main` (`d4567abbf`) merged. The prototype is the commits after the merge commit `8d42ac3c8`. Nothing is pushed.

During the work, `text-lens-readability` got four more commits (to `5faaec2fa`): renames inside the lens. I did not merge them. The files of the public API of the lens (`api/v2/index.ts`, `operations/types.ts`) did not change in them, and the prototype uses only that API.

The prototype adds a second AI engine next to the old engine. An agent loop reads and writes the document as markdown through the text lens. The agent writes only to a proposal. The editor derives suggestions from the proposal, with the reason of each tool call, and the user accepts or rejects each tool call. The same code runs in the browser and on a server.

## 0. Status (11 November, end of the day)

Read this section first. The sections after it are in the order of the work, and the later sections (13 and 14) change some statements of the earlier ones.

**What exists**

- One pipeline for three modes: client mode, a session on the server (the server keeps the chat and the one open proposal of a document), and a run that a caller outside the editors starts. Sections 3 and 14.1.
- The example with a chat window: `examples/09-ai/10-document-agent-chat` (section 14.2). The first example (`09-document-agent`) has the AI menu and the older routes.
- The tools `editText`, `replaceRange`, `writeDocument` and `readDocument`. The document is in the first LLM call, and a tool call starts when the model has written it (section 13).
- The review of a user reaches the agent: the decision is in the tool output of the chat (section 14.1).
- Guards that keep suggestions out of the main document (section 14.7).
- 105 tests with a mock model, a test with random concurrent edits (section 14.10), and three tests that are known failures (below). Live measurements with Haiku 5.5 (sections 9, 13.3 to 13.5).

**Decisions of 11 November**

- The target for the review of AI changes is the Yjs 14 suggestion layer: the agent writes its changes there, and the accept is idempotent. The proposal model of this prototype is the path until then.
- The base scenario of an accept is a write of the client at once, with the known risk of section 14.8. The guard for it (`acceptGuard`, the flag `guard=1` of the example) is optional, and is off by default.
- No default for `reasoning`: an eval suite decides. A run from outside locks each editor that follows it: acceptable now.

**Known failures**

- Two users who accept the same proposal at the same time write its text two times, in the base scenario (section 14.8). For a new block, the shared document also gets one block ID two times (section 14.10). `acceptGuard` prevents the two.
- In the base scenario, an accept that crosses another change of the proposal on the network can put a paragraph into the document two times, also with one reviewer (section 14.10). `acceptGuard` prevents it.
- A reject of the tool call that added a block keeps the block if a later tool call changed it (sections 8.1 and 14.10). The guard does not change this.

**Not decided**

- Who keeps the proposal as the long-term design: the three variants of section 14.1 and the table in the review. One open proposal for each document, or one for each run.
- The decisions to confirm of sections 7 and 14.5.

**Not done** (in the order that I recommend)

1. Done (section 14.10): a test with random concurrent edits for a session.
2. A spike of the target: the agent writes its changes into a Yjs 14 suggestion document through the lens. You asked if such a document replaces the proposal: section 14.11. The spike waits for your confirmation.
3. A block that two tool calls change shows as one suggestion (section 8.1).
4. Colors and alignment: an HTML format for the tools, or a tool for props (section 9.3).
5. The selection and the cursor in the first prompt.
6. The eval suite: reasoning, the instructions of the tools, each model (MUST 1).
7. An MCP server on the session host.
8. Cleanup: remove the variant where the client sends the proposal to a server that runs the tools (`POST /chat`), if you agree; merge the new commits of the lens branch; the two lens tests of section 10.
9. For production: section 12, the limits of 14.6, and what the guards do not cover (14.7).

## 1. State of each milestone

| #   | Milestone                                                                                                 | State                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Worktree, merge of main, install, baseline                                                                | Done. The merge had no conflicts. See section 10 for the test failures that the merge caused.                         |
| 2   | Shared pipeline (tools, batches, accept, reject, derived suggestions), unit tests on a mock model         | Done. 58 tests in `packages/xl-ai/src/documentAgent`.                                                                 |
| 3   | Server mode (a user starts the run), in an example page with the AI menu, one real LLM run                | Done. I ran it in a browser with `claude-haiku-5-5`.                                                                  |
| 4   | Client mode, with the same code                                                                           | Done. I ran it in a browser. The LLM calls go through the proxy route.                                                |
| 5   | Runs that the server starts: two document sources, the proposal store, the notice, the review, the rebase | Done, with one deviation: the Yjs server is a small relay in the dev server, not y-websocket (section 7, decision 9). |
| 6   | A reason for each tool call on each suggestion, accept and reject for each tool call                      | Done. Limit: a block that two tool calls changed shows as one suggestion of the last call (section 8.1).              |
| 7   | Comparison with `html-blocks`                                                                             | Done on 13 test cases of the old engine, with three models (section 9.3).                                             |

Also done: a simple replay animation (SHOULD 1, section 3.3). Not done: a chat sidebar, MCP.

## 2. How to run it

```sh
# In the root of the worktree, in each terminal:
export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PWD/node_modules/.bin:$PATH"

# 1. The AI server on port 3111, with the API keys of the main checkout.
cd packages/xl-ai-server
set -a; source /Users/yousef/Programming/BlockNote/packages/xl-ai-server/.env.local; set +a
PORT=3111 DOCUMENT_AGENT_MODEL=anthropic:claude-haiku-5-5 node_modules/.bin/vite-node src/index.ts

# 2. The playground on port 5180 (a second terminal).
cd playground
VITE_BLOCKNOTE_AI_SERVER_BASE_URL=http://localhost:3111/ai vp dev --port 5180 --strictPort
```

The server has no hot reload: start it again after a change. Without `localhost.pem` in `packages/xl-ai-server`, it uses HTTP, as in these commands.

The example with the chat window is `http://localhost:5180/ai/document-agent-chat` (section 14). `DOCUMENT_AGENT_REASONING=none` on the server gives the first edit earlier (section 13.4).

Open `http://localhost:5180/ai/document-agent`. The links at the top select the mode:

- `?mode=server`: the loop runs on the server. Type `/ai` in the editor, or select text and click the AI button.
- `?mode=client`: the loop runs in the browser. The use is the same.
- `?mode=json`: a run that the server starts, on a document in the JSON store. Click "Start a run" in the panel, change the document while the agent works, then click "Review".
- `?mode=yjs`: the same, on a document of the Yjs relay. Open the page in two tabs to see that the shared document has no suggestion marks.

A script can start a run without the panel:

```sh
curl -X POST localhost:3111/ai/document-agent/runs -H 'content-type: application/json' \
  -d '{"documentId":"demo-json","prompt":"Fix the spelling mistakes.","source":"json"}'
curl localhost:3111/ai/document-agent/proposals/<proposalId>
```

`DOCUMENT_AGENT_MODEL` is `provider:model` (`anthropic`, `openai`, `groq`, `google`, `mistral`). The default is `anthropic:claude-haiku-5-5`.

Tests, from `packages/xl-ai`:

```sh
vp test --run src/documentAgent          # 58 tests, with a mock model
DOCUMENT_AGENT_BENCH=1 vp test --run --silent=false src/documentAgent/benchmarks
DOCUMENT_AGENT_LIVE=1 DOCUMENT_AGENT_MODEL=anthropic:claude-haiku-5-5 \
  vp test --run --silent=false src/documentAgent/comparison   # real LLM calls
```

## 3. Architecture

```
        a prompt of a user, or a script
                    |
     +--------------v---------------+   server mode:  POST /chat   (xl-ai-server)
     | the host of the loop         |   client mode:  a chat transport in the browser
     | (the only mode-specific part)|   server run:   POST /runs   (xl-ai-server)
     +--------------+---------------+
                    | createDocumentAgent(handle)
     +--------------v---------------+
     | ToolLoopAgent (AI SDK 7)     |<--- the model gets a short text for each
     +--------------+---------------+     tool result (toModelOutput)
                    | readDocument / editText / writeDocument  (plain functions)
     +--------------v---------------+        +----------------+
     | DocumentHandle               |------->| ProposalStore  |  P = origin + batches
     | load -> [rebase] -> lens     |        +----------------+
     |      -> batch -> save        |<------- DocumentSource (server run only):
     +--------------+---------------+         JSON store, or Yjs
                    | the batches: in the tool outputs of the UI message stream
                    | (a run of a user), or in the store plus a notice (a server run)
     +--------------v---------------+
     | DocumentAgentExtension       |  the copy of P of the client: replay, hash check
     |  derive: the lens JSON write of P onto the current document, base = F
     |  show:   suggestion marks in a local fork, ID = the batch of the tool call
     |  review: accept all, accept one, reject one, reject all
     +------------------------------+
```

### 3.1 The proposal

The types are in `proposal/types.ts`.

- A proposal is `{ origin, batches }`. `origin` is the main document when the run started. The proposal document is `origin` with all batches applied, in sequence. The log only grows.
- A batch is `{ seq, source, operations, changedBlockIds, hash }`. `operations` are the `BlockOperation[]` of the lens. `hash` is a hash of the proposal document after the batch.
- `source` tells where the batch comes from:
  - `tool-call` (`toolCallId`, `reason`): one editing tool call.
  - `rebase` (`forkPoint`): the changes of the main document that the proposal took.
  - `revert` (`toolCallId`): a user rejected one tool call.
  - `accept` (`toolCallId`, `forkPoint`): a user accepted one tool call. The batch has no operations.
- The fork point F is the `forkPoint` of the last `rebase` or `accept` batch, or `origin`.
- Version `n` of the proposal document is `origin` with the first `n` batches. The version token of the tools is `v<n>`. Thus, no store keeps version snapshots.

All writes are lens writes (`proposal/review.ts`, `proposal/rebase.ts`):

| Action               | Write                                                                                                                                                                        |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accept all           | JSON write of P onto the current document, `base` = F. A normal edit of the user (`updateDocument`).                                                                         |
| Reject all           | Drop P.                                                                                                                                                                      |
| Reject one tool call | JSON write to P: the document before the call, with `base` = the document after the call. A `revert` batch.                                                                  |
| Accept one tool call | JSON write onto the current document: the document after the call, with `base` = the document before it. The same write onto F gives the new fork point (an `accept` batch). |
| Rebase               | JSON write of P onto the main document, `base` = F. The result is the new P, and the main document is the new F. A `rebase` batch.                                           |
| Display              | The operations of "accept all", shown as suggestion marks. Nothing is written.                                                                                               |

### 3.2 The tools and the loop

- `tools/documentTools.ts`: `readDocument(handle)`, `writeDocument(handle, { markdown, base, reason }, toolCallId)` and `editText(handle, { old, new, reason }, toolCallId)`. They are plain functions over a `DocumentHandle`. They do not use the AI SDK. Each editing call gives at most one batch.
- An expected failure is a value: `conflict`, `not-found`, `not-unique`, `invalid-document`, `unknown-version`, `invalid-input`. The proposal does not change.
- `tools/handle.ts`: `handle.update(step)` loads the proposal, rebases it if the host can read the main document, runs the step, and saves the batch. The steps of one handle run one at a time, because the loop can call two tools of one step together.
- `tools/aiSdkTools.ts` makes AI SDK tools from the functions. The output of a tool has the batches for the client. `toModelOutput` gives the model a short text (`tools/describe.ts`): the version, the notes, or the error. The model never gets the operations. A test examines this.
- `agent/documentAgent.ts`: `createDocumentAgent(handle, options)` is a `ToolLoopAgent`. Each tool result goes back to the model. The loop stops when the model answers without a tool call, at the step limit (12), or when a tool throws.
- There is no partial tool-call streaming. The editor ignores tool input. It applies one batch when a tool call is complete.

### 3.3 The display and the review

- `client/DocumentAgentExtension.ts` keeps the copy of the proposal of the client. For each tool output in the stream, it applies the batches, replays the proposal in a headless editor, and compares the hash.
- The display is derived (`proposal/derive.ts`, `client/suggestions.ts`): remove the old suggestion marks, compute the "accept all" write on the clean document, and apply its operations as suggestion marks. For an editor that is bound to a Y.Doc, the marks go into a local fork (`ForkYDocExtension`). The shared document never has suggestion marks. A test and a browser run with two clients examine this.
- Each suggestion mark gets the suggestion ID of the tool call that changed its block (the batch number, see decision 3).
- The replay animation: the insertions of the newest batch show one after the other, and the text of each one shows from its start to its end (12 ms for each character). The document gets the full batch at once. The animation is only in the view: decorations of the extension and CSS (`replayAnimation: false` turns it off, and `prefers-reduced-motion` too).
- `client/DocumentAgentReview.tsx` shows one card for each tool call: the reason, an accept and a reject. The pointer on a card marks its suggestions, and the pointer on a suggestion marks its card.
- `client/DocumentAgentMenu.tsx` reuses `AIMenu` of the old engine with new items.

### 3.4 Shared code and mode-specific code

Shared by all modes (about 1,700 lines without tests, in `packages/xl-ai/src/documentAgent`): `proposal/`, `tools/`, `agent/`, `stores/`. Shared by all modes in the editor (about 1,100 lines): `client/DocumentAgentExtension.ts`, `client/suggestions.ts`, the menu and the review.

Mode-specific:

| Mode        | Host of the loop                                                          | How the batches reach the editor                                  | Code                                                                                           |
| ----------- | ------------------------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Server mode | `POST /ai/document-agent/chat` calls `streamDocumentAgent`                | In the tool outputs of the UI message stream                      | About 50 lines in `xl-ai-server/src/routes/documentAgent/index.ts`, and `DefaultChatTransport` |
| Client mode | `createInProcessTransport` calls `streamDocumentAgent` in the browser     | The same stream, in the tab                                       | About 30 lines in `client/transport.ts`                                                        |
| Server run  | `POST /ai/document-agent/runs` calls `runDocumentAgent` with a `readMain` | The proposal store, a notice, then `agent.openProposal(proposal)` | About 200 lines in the route, `yjsDocumentSource.ts` (81), the panel of the example            |

The only difference in the shared code is one option: a handle with `readMain` rebases before each step.

For context: the code of the old engine that this path does not use is about 4,400 lines without tests (`streamTool/` 1,416, `api/formats/` 2,030, `prosemirror/` 959), and parts of `AIExtension.ts`.

## 4. Runs that a server starts

- `DocumentSource` (`stores/documentSource.ts`) has one function: `read(documentId)`. Two implementations:
  - The in-memory JSON store (`createInMemoryDocumentStore`). The editor of the example saves its document there with `PUT /documents/:id`.
  - Yjs (`xl-ai-server/src/routes/documentAgent/yjsDocumentSource.ts`). Each read loads the state of the room into a new Y.Doc and converts it to blocks. Thus, the agent keeps no Y.Doc between two tool calls.
- The proposal store is `ProposalStore` (`load`, `save`), with an in-memory implementation.
- The notice: for the JSON store, server-sent events (`GET /documents/:id/events`). For Yjs, the server writes `{ batches, status }` into the map `document-agent-proposals` of the Y.Doc.
- The editor opens the proposal with `agent.openProposal(proposal)`. The display, the cards and the accept are the same code as for a run of the client.
- The review of a user goes back to the store (`POST /proposals/:id/batches`). Thus, an agent that still runs sees it in its next tool call.
- The rebase feedback loop: tests in `tools/documentTools.test.ts` and `agent/documentAgent.test.ts` change the main document between two tool calls. A change without a conflict stays, and the tool result has the note "the users changed the document". A conflict gives the error `conflict`, the agent reads again, and the next write applies. A change of the agent that the rebase dropped is a note in the next tool result. In the browser, I typed in the editor during a run: the proposal got one `rebase` batch, and the text of the user was not a suggestion.

## 5. No document cache, and the fill gap

- No host keeps an editor or a document between two tool calls. Each call makes a new headless editor from the proposal in the store (`replayProposal`).
- The known gap (the schema fill gives a block an ID of each editor): `writeBatch` detects a block of the result that no operation inserts. Then the operations of the batch become the operations of a JSON write of the result, which insert that block with its ID (`reproducibleOperations` in `proposal/proposal.ts`). A test writes an empty document and replays the batch on a second host. The client examines the hash of the last batch, and gives the state `out-of-sync` if it is different. I did not change the lens.

## 6. AI SDK 7 findings

The installed version is `ai` 7.0.153. I examined the facts that the prototype uses in the sources and the docs of the installed package. A research agent read the web pages. The other facts in this section are from those pages, and I did not test them.

Does the architecture fit? Yes. The SDK has the loop, the two readers of a tool output, the stream format, and the test model. Our own code is the tools, the proposal and the display.

What the prototype reuses:

- `ToolLoopAgent` with `stopWhen: [isStepCount(n), ...]` is the loop. `agent.generate()` is the run without a chat. [Building agents](https://ai-sdk.dev/docs/agents/building-agents), [loop control](https://ai-sdk.dev/docs/agents/loop-control), [ToolLoopAgent](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent).
- `createAgentUIStream({ agent, uiMessages })` validates the UI messages, converts them with the tools of the agent, and gives the UI message stream. `createUIMessageStreamResponse({ stream })` makes the HTTP response. [Reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/create-agent-ui-stream-response).
- `toModelOutput` on a tool: the UI message stream has the full output (`tool-output-available`), and the model gets the short output. It also runs in `convertToModelMessages` for the history, thus that call needs the same tools. `createAgentUIStream` does this. [tool()](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool).
- `ChatTransport`: `DefaultChatTransport` for server mode. `DirectChatTransport` runs an agent in the process, but it ignores the `body` of a request, and the proposal is in the body. Thus, client mode uses a transport of 30 lines that calls the same function as the server. [Transport](https://ai-sdk.dev/docs/ai-sdk-ui/transport), [DirectChatTransport](https://ai-sdk.dev/docs/reference/ai-sdk-ui/direct-chat-transport).
- `MockLanguageModelV4` and `simulateReadableStream` from `ai/test` for the unit tests. [Testing](https://ai-sdk.dev/docs/ai-sdk-core/testing).
- `wrapLanguageModel` with a middleware counts the tokens in the comparison.

What I found that matters for the design:

- A tool that throws does not stop the loop. The step gets a `tool-error` part, the stream gets `tool-output-error` with the fixed text "An error occurred.", and the model continues. The prototype adds a stop condition and fails the run, because the tools give their expected failures as values.
- The SDK does not examine the input of a tool with a plain `jsonSchema()` (without a validate function). Thus, the tools examine their input and give `invalid-input`.
- The model can call two tools in one step, and the SDK runs them together. The handle runs its steps in sequence.
- Tools can get state in two ways: a closure for each run (the prototype), or `contextSchema` and `toolsContext`. [Runtime and tool context](https://ai-sdk.dev/docs/ai-sdk-core/runtime-and-tool-context).

Patterns to reuse later (from the docs, not tested):

- Migration 6 to 7: `system` is `instructions`, `stepCountIs` is `isStepCount`, `onFinish` is `onEnd`, `fullStream` is `stream`. The methods `result.toUIMessageStream()` and `result.toUIMessageStreamResponse()` are deprecated: the old route (`regular.ts`) still uses them. `needsApproval` is deprecated for `toolApproval`. [Migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0), [announcement](https://vercel.com/blog/ai-sdk-7).
- Data parts: `createUIMessageStream` with `writer.write({ type: "data-...", transient })`. A tool gets the writer only through a closure. See decision 1. [Streaming data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data).
- Persistence: `toUIMessageStream({ originalMessages, generateMessageId, onEnd })`, `result.consumeStream()`, and `onUIMessageStepEnd` for a save after each step. [Persistence](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-message-persistence).
- Resumable streams: `useChat({ resume })`, `consumeSseStream` and the `resumable-stream` package. A stop of the client is then only a disconnect: a real stop needs its own endpoint. [Resume streams](https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-resume-streams).
- Tool approvals (`toolApproval`, signed approvals) are for tools that change data directly. The proposal is our approval, thus the prototype does not use them. [Tool approvals](https://ai-sdk.dev/docs/agents/tool-approvals).
- `@ai-sdk/mcp` is an MCP client (the agent uses MCP tools). An MCP server for our tools needs a different library. [MCP tools](https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools).
- Telemetry moved to `@ai-sdk/otel` (`telemetry: { functionId, ... }`). This fits MUST 2. [Telemetry](https://ai-sdk.dev/docs/ai-sdk-core/telemetry).
- `timeout: { totalMs, stepMs, toolMs }`, `prepareStep` (for context compaction), and `WorkflowAgent` (`@ai-sdk/workflow`, durable runs) are candidates for runs that a server starts.

## 7. Decisions to confirm

1. **The batches go in the tool outputs, not in data parts.** (Changed in section 13: a transient data chunk has them first, and the tool output has them for the history.) Reasons: the tool call and its batch stay together, the chat history can rebuild the proposal, and the same code works with `createAgentUIStream` and in the browser (a data part needs the stream writer in a closure of the tool). Cost: the history has the operations. The model does not get them, but each request sends them to the server again.
2. **The proposal is a log that only grows, with four kinds of batch** (section 3.1). The brief had "F plus batches" with one kind. The log makes a rebase one batch and one merge, makes each version available without snapshots, and a client that follows a run gets a rebase as a normal batch. Cost: a `rebase` and an `accept` batch contain a full document (the new fork point).
3. **The suggestion ID is the batch number of the tool call, not the tool call ID.** The suggestion marks of `AIExtension` allow only a number as their ID (`validate: "number"`). With `validate: "number|string"` there and in `parseDOM`, the ID can be the tool call ID.
4. **The display gives each changed block to one tool call: the last open call that changed it.** Accept and reject of one tool call are lens writes of the delta of that call (three-way merges), not `applySuggestion(id)` on the marks. Then the display derives again. See section 8.1.
5. **The accept of one tool call moves the fork point.** Without it, a block that the call added is in the main document and in P, but not in F, and the lens gives the block of P a new ID: the block shows two times.
6. **A tool that throws stops the loop and fails the run.** The client shows a fixed text, never the message of the exception.
7. **`readDocument` is a tool call. The document is not in the first prompt.** (Changed in section 13: the first LLM call gets the document.) This costs one LLM step for each run (about 1 s with Haiku). The alternative puts the markdown and the version in the first message.
8. **The selection goes into the prompt as quoted text.** The cursor position does not go to the model.
9. **The Yjs collaboration server of the demo is a relay in the dev server (HTTP and server-sent events), not y-websocket.** The server of `y-websocket` 2.1.0 does not start with the dependencies of this repository: its CommonJS code loads `lib0` 1.0.0-rc, which is ESM only. The relay needs no new dependency. A source for y-websocket or Hocuspocus has the same two functions (`read`, `notify`).
10. **The extension needs `AIExtension` in the editor**, for the suggestion marks and the state of the AI menu. During a run and a review the editor is locked, as in the old engine, because the AI menu is open.
11. **The server selects the model** (`DOCUMENT_AGENT_MODEL`). A client cannot.
12. **The fill gap is closed outside the lens** (section 5).
13. **The server examines only the shape of the proposal that a client sends**, and the hash of its last batch.
14. **`xl-ai-server` now depends on `@blocknote/core`, `@blocknote/server-util` (jsdom) and `yjs`.** Server mode runs the tools on the server. This is not compatible with MUST 18 for this mode. Client mode keeps the server without core.
15. **The agent works with markdown only.** It cannot change what markdown does not show (colors, alignment). The instructions tell it to make no change then.
16. **The suggestions of a proposal get a color through an attribute on the editor** (`data-agent-proposal`) and rules in `xl-ai/src/style.css`. Before this rule, an insertion of the display had no color: the rules of core for `ins` and `del` use `--user-color-light`, and only the Yjs v14 attribution marks set it. The marks are the marks of `AIExtension`, thus the old engine probably has the same problem on main. I did not examine the old engine in the browser.
17. **The tool input is examined in the tools** (`invalid-input`), because an MCP server will call the same functions.

## 8. Open questions and limits

### 8.1 A block that two tool calls changed

How it behaves:

- The derived write gives one update for the block, with the changes of the two calls. The suggestion marks of the block get the ID of the last open call. The card of the earlier call tells "A later change shows the blocks of this change."
- Accept and reject of each call are correct at the level of words, because they are three-way merges of the delta of that call. Tests: call one changes the first word of a paragraph and call two its last word. A reject of call one reverts only the first word. An accept of call two applies only the last word. After a reject of the later call, the marks that stay get the ID of the earlier call.
- A limit that the test of section 14.10 found: a reject of the call that added a block keeps the block if a later call changed it. After a reject of the two calls, the block is still in the proposal. This is a known-failure test in `proposal/review.test.ts`.

How often it occurs (`claude-haiku-5-5`, the document of the example):

- 12 runs through the server, three prompts, four runs each: 2 runs had a shared block. The two were runs of "Fix the spelling mistakes" (2 of 4): two mistakes are in one paragraph, and the model made one call for each mistake.
- "Improve the writing of the whole document" and "Make the text more formal, and add a conclusion": 0 of 8. The model made one call for each block, or one full write.
- 8 earlier runs (7 in the browser with "Fix the spelling mistakes. Then add one short sentence to the last paragraph", and 1 with a script): 3 had a shared block.
- 34 runs of the comparison (one change for each prompt): 0.

Thus, it is not rare for small corrections: the instructions ask for one call for each reason, and two corrections in one paragraph are two calls.

The fix that I recommend, not built: derive the display for each open tool call in sequence (the delta of the call onto a clean chain that starts from the current document), put all steps in one transaction, and give each step the ID of its call. `transformToSuggestionTransaction` cannot do this now: `generateId(schema, doc)` does not get the step, and the package exports only its index. A small change in `prosemirror-suggest-changes` (a callback that gets the step index) makes it possible. The accept then applies the same deltas, thus the display and the accept stay one computation.

### 8.2 Other limits

- **The replay animation is simple.** It shows inserted text and new blocks. A deletion shows at once. An insertion of more than one line shows all its lines together, from left to right. A proposal that a server made opens without the animation.
- **No chat sidebar.** The extension collects the text of the agent (`text-delta`) and shows it under the cards. The `Chat` object of the AI SDK has all messages and tool parts, thus a sidebar can show the tool input while it streams.
- **A reload during a run** loses the run in server mode. The proposal of a server run stays in the store.
- **The proposal store needs a compare and swap.** Two hosts can run tool calls for one proposal. The in-memory store is safe only in one process. The example ignores a review batch that the server refuses as stale (409).
- **Each tool call replays the proposal from the origin.** This is fast (section 9.2), but it grows with the number of batches. A store can keep the proposal document as a snapshot.
- **The requests grow.** Each request of a chat sends the proposal and the history with all operations.
- **The empty block of the slash menu stays.** The old engine removes the empty block where the user typed `/ai`.
- **The AI menu hides the page outside it from assistive technology** (the focus manager of floating-ui). The example adds the review panel to the elements of the menu. A package component must do this itself.
- **Lens limits that the agent meets.** Markdown does not show a bold space. The agent removed the bold style of "Bold text. ", and the bold space stayed (the case "drop mark and link"). The rule is correct for the lens, and the result looks equal, but the document is not equal to the expected document.
- **`gpt-4o` needed 8 LLM calls in one case**, and it once changed a paragraph to a quote for "right aligned". The descriptions of the tools and the instructions need tuning for each model. I added the rule "make no change if markdown cannot express it" after the comparison.
- **MUST 14 (reasons as comments).** The data is ready: each suggestion mark has the suggestion ID, and `toolCallsOf(proposal)` gives the reason of that ID. Open: where the thread lives. The suggestions are in a local fork, thus a thread on them must be local too (a thread store that derives its threads from the proposal), or it becomes a real comment at the accept.
- **Not tested:** tables and columns in a proposal, an abort in the middle of a run, a custom schema, documents of more than 1,000 blocks, a second prompt after a rebase.

## 9. Measurements

### 9.1 Time of a run

`claude-haiku-5-5`, the document of the example (7 blocks), server mode, the prompt "Fix the spelling mistakes": the result of `readDocument` after 1.2 s, three edits after 3.2 s, the end after 4.1 s (3 LLM steps). The 12 server runs took 3.1 s to 9.5 s for 1 to 6 tool calls. Each LLM step takes about 1 s to 1.5 s. The time of the tools is small against it for this document.

### 9.2 Work of the host for one tool call, and of the client for one batch

`benchmarks/toolCalls.test.ts`, jsdom, paragraphs of 20 words, the median of 5 to 9 runs after one warm-up run, two measurements:

| Blocks | `readDocument` | `editText`    | `writeDocument`, one change | `editText` after 10 batches | Client: replay of 10 batches | Client: derive | Hash       | One batch (JSON) |
| ------ | -------------- | ------------- | --------------------------- | --------------------------- | ---------------------------- | -------------- | ---------- | ---------------- |
| 20     | 7 to 14 ms     | 14 to 20 ms   | 10 to 11 ms                 | 17 to 19 ms                 | 3 to 4 ms                    | 5 to 7 ms      | 0.1 ms     | 356 bytes        |
| 200    | 25 to 32 ms    | 114 to 135 ms | 68 to 77 ms                 | 78 to 125 ms                | 4 to 5 ms                    | 10 to 19 ms    | 1 to 2 ms  | 357 bytes        |
| 1,000  | 157 to 199 ms  | 504 to 704 ms | 437 to 490 ms               | 592 to 677 ms               | 12 to 16 ms                  | 24 to 39 ms    | 3 to 11 ms | 357 bytes        |

The first call of a process is slower (68 ms and 350 ms for 20 blocks in a cold run). Most of the time is the markdown conversion of the lens in jsdom. The replay, the hash and the JSON write of the client are small. The display in a real editor is not in the table.

### 9.3 Comparison with `html-blocks`

`comparison/liveComparison.test.ts` runs LLM test cases of the old engine on the two engines with a real model. A case passes if the document is equal to the expected document of the old test (block IDs do not count). The documents have 1 to 3 blocks. The old engine ran with `ClientSideTransport`, as in its tests.

| Model               | Engine         | Passed   | Median time | LLM calls for each run | Input tokens for each run | Output tokens for each run |
| ------------------- | -------------- | -------- | ----------- | ---------------------- | ------------------------- | -------------------------- |
| `claude-haiku-5-5`  | document agent | 10 of 13 | 3.0 s       | 2.8                    | 4,014                     | 296                        |
| `claude-haiku-5-5`  | html-blocks    | 13 of 13 | 0.8 s       | 1                      | 1,671                     | 95                         |
| `gpt-4o-2024-08-06` | document agent | 9 of 13  | 4.2 s       | 3.5                    | 2,418                     | 100                        |
| `gpt-4o-2024-08-06` | html-blocks    | 13 of 13 | 1.5 s       | 1                      | 670                       | 39                         |
| `claude-opus-5-5`   | document agent | 6 of 8   | 3.7 s       | 2.8                    | 3,813                     | 226                        |
| `claude-opus-5-5`   | html-blocks    | 1 of 1   | 1.9 s       | 1                      | 1,645                     | 90                         |

The cases that did not pass with the document agent:

- "update block prop" (right alignment) and "clear block formatting" (colors and alignment), with all three models. Markdown does not show these. Haiku and Opus made no change and told the user. `gpt-4o` changed the paragraph to a quote.
- "drop mark and link", with Haiku and `gpt-4o`: the bold space (section 8.2).
- "fix spelling mid-word selection", with `gpt-4o`, one time. It passed in a second run.

What the comparison shows:

- On these small one-change prompts, the old engine is about 2 to 4 times faster, and it uses about 2.4 to 3.6 times fewer input tokens. The agent makes three LLM calls: the read, the edit, and the answer. Decision 7 removes the first one.
- `html-blocks` passes all cases, also the cases with colors and alignment. The agent with markdown cannot do them. An HTML format for the tools (the lens has `htmlFormat`) is the next thing to measure.
- The comparison does not measure what the new design is for: long documents (the model sends only the change, not the blocks), runs with more than one step, feedback on a failed edit, and concurrent users.

### 9.4 LLM cost

For each run of the comparison, from the token counts and the prices of the Anthropic model table (Haiku 5.5: $0.10 and $0.50 for each million tokens, Opus 5.5: $4 and $20): the agent costs about $0.0006 with Haiku and about $0.02 with Opus. `html-blocks` costs about $0.0002 and $0.008. All LLM calls of this prototype together cost about $0.40. This is an estimate: I did not read a bill, and the `gpt-4o` part uses a price from memory ($2.50 and $10).

## 10. Test failures that the merge caused

The baseline after the merge (`vp test --run` in `packages/xl-ai`): 3 failures. The full run with the prototype has the same 3 failures (3,038 tests pass).

- `src/api/v2/api.html.test.ts` > "gives an error for a table with a row span beyond the table, and does not change the document": caused by the merge.
- `src/api/v2/parse/parseText.test.ts` > "gives an error for blocks that do not fit the schema": caused by the merge.
  - The cause of the two: `fix(core): validate pasted HTML table spans (#3282)` on main. The HTML parse now limits a row span to the table. Thus, the text of these tests gives a valid table, and the lens does not give `invalid-document`. The tests need a new expected result. I did not change them.
- `src/api/formats/tests/validateTestEnvironment.test.ts` > "should have certs installed": not caused by the merge. `mkcert` is not on this machine, and I ran `vp test` without `NODE_EXTRA_CA_CERTS`.

`vp lint --type-aware` for the full repository gives 170 errors in this worktree. None is in the new code. They are in packages that need a build first (for example `xl-typst-compiler`, `math-block`).

One more note: `packages/xl-ai/src/testUtil/testAIModels.ts` names `claude-3-7-sonnet-latest`. Anthropic retired that model on 19 February 2026. The old tests replay recorded answers, thus they pass. The current Sonnet is `claude-sonnet-5-5`.

## 11. "lens:" commits

None. The prototype uses the lens only through `packages/xl-ai/src/api/v2/index.ts`: `getDocumentText`, `computeOperations`, `updateDocument`, `applyOperations`, `markdownFormat` and the types.

## 12. What production needs

- The fix for a block that two tool calls changed (section 8.1), with the change in `prosemirror-suggest-changes`.
- A proposal store on a database, with a compare and swap, a state for a closed proposal, and a limit for the size of a proposal.
- A check of the proposal that a client sends (each block and each operation against the schema), or a proposal that only the server keeps.
- The parse of untrusted markdown in a worker with a time limit (the lens README: a deep nesting overflows the stack), and the performance pass of the lens for long documents.
- Authentication and rate limits for the routes, and a document source for the real collaboration server.
- A decision on MUST 18: server mode needs core and a DOM on the server.
- An HTML format for the tools, or a tool for props, for colors and alignment.
- The document and the cursor in the first prompt, and smaller requests (the last message only, operations not in the history).
- A resume of a run after a reload, a real stop, and a save of the chat (section 6).
- The chat sidebar, the comments for the reasons (MUST 14), accessibility of the review (MUST 16 and 17), telemetry (MUST 2), and a replay animation for deletions and for text of more than one line.
- A test and tuning suite on real prompts for each model (MUST 1). `comparison/liveComparison.test.ts` is a start.
- The MCP server: the tools are plain functions over a handle, thus it needs only a host that makes the handle (with `readMain`) and returns `describeRead` and `describeWrite` as the tool results.

## 13. Changes after the first report (11 November)

Two changes for the time to the first edit, from the review of this report. Commits `f835a9a87` and `526c18c9c`.

### 13.1 The document is in the first LLM call

The first LLM call of a run gets the document with the last message of the user: `<document>`, the version, the markdown, `</document>`, then the request (`withDocument` in `agent/documentAgent.ts`, with `prepareStep`). The AI SDK keeps the messages of step 0 for the later steps, thus each LLM call of a run has the same text at the same place (for a prompt cache). Only the last message of a chat gets the document. `readDocument` stays as a tool for a conflict, a text that was not found, and a change of the users. This removes one LLM call from each run.

### 13.2 A tool call starts when the model has written it

A fact of the AI SDK (`ai` 7.0.153, `streamText`): the tools of an LLM step run only when the model call ends (`dist/index.js`, the case `model-call-end`). Thus, all changes of one step reached the editor together.

Now `withEarlyToolCalls` (`agent/earlyToolCalls.ts`) wraps the model: when the stream of the model has a complete tool call, the call starts. `createToolCalls` (`tools/toolCalls.ts`) keeps the calls of a run by tool call ID, thus the loop of the AI SDK gets the result of the early start, and each call runs one time. `streamDocumentAgent` sends the batches of the call at once, in a transient data chunk (`data-document-batches`). The tool output has the same batches later. The client ignores a batch that it has.

This is not partial tool-call streaming: a call starts only when its input is complete. `runDocumentAgent` (no stream) does not change.

Limits:

- If an LLM step ends without tool execution (for example the output limit cut the step), the calls that started early are in the proposal, but the chat has no tool output for them.
- The model must be an object (`LanguageModelObject`), not the ID of a gateway model.

### 13.3 Measurement

`comparison/timeToFirstEdit.test.ts`, `claude-haiku-5-5`, the document of the example (7 blocks), three runs for each prompt, milliseconds from the request:

| Prompt                                       | LLM calls | Tool calls | First edit in the editor | First tool output of the AI SDK | End of the run |
| -------------------------------------------- | --------- | ---------- | ------------------------ | ------------------------------- | -------------- |
| "Fix the spelling mistakes."                 | 2         | 2          | 1,128 to 2,525           | 1,505 to 2,906                  | 2,408 to 3,795 |
| "Improve the writing of the whole document." | 2         | 1          | 3,092 to 3,492           | 3,098 to 3,520                  | 4,120 to 4,275 |

Before these changes (section 9.1, the same prompt "Fix the spelling mistakes"): 3 LLM calls, the edits after 3.2 s, the end after 4.1 s.

What the numbers show:

- The first edit of the spelling prompt now comes after 1.1 s to 2.5 s (before: 3.2 s). The first run is the slowest: it includes the start of the process and the connection.
- The early start saves 0.3 s to 0.4 s here: the time that the model needs for the second tool call of the step. It saves more in a step with many tool calls.
- A full `writeDocument` is one tool call. Nothing shows until the model has written the full document: 3.1 s to 3.5 s for 7 blocks, and more for a long document. The early start cannot help. Options: tell the model to make one `editText` call for each block or section of a large change, or add a tool that writes one section.

### 13.4 Reasoning, and one edit for each paragraph

More measurements with `claude-haiku-5-5`, for the prompt "Improve the writing of the whole document." (milliseconds, two or three runs each). `DocumentAgentOptions.reasoning` is the reasoning setting of the AI SDK (commit `54158a6e4`).

| Document                  | Instructions                    | Reasoning | Tool calls        | First edit     | Last edit      | End of the run |
| ------------------------- | ------------------------------- | --------- | ----------------- | -------------- | -------------- | -------------- |
| The example (7 blocks)    | Now (one full write)            | default   | 1 `writeDocument` | 3,092 to 3,492 | the same       | 4,120 to 4,275 |
| The example (7 blocks)    | Now (one full write)            | none      | 1 `writeDocument` | 1,651 to 1,703 | the same       | 2,551 to 2,650 |
| The example (7 blocks)    | One `editText` for a paragraph  | default   | 5 to 6 `editText` | 3,830 to 3,961 | 5,593 to 5,874 | 6,614 to 6,828 |
| The example (7 blocks)    | One `editText` for a paragraph  | none      | 5 `editText`      | 1,193 to 1,486 | 3,172 to 3,466 | 3,979 to 4,310 |
| 16 paragraphs (640 words) | Now (one full write)            | none      | 1 `writeDocument` | 4,377 to 4,512 | the same       | 5,272 to 5,435 |
| 16 paragraphs (640 words) | One `editText` for a paragraph  | none      | 16 `editText`     | 1,622          | 10,985         | 12,226         |

What the numbers show:

- The reasoning of the model before the first tool call is about 2 s of a large change with Haiku. Without reasoning, the first edit of the rewrite comes after 1.7 s (before: 3.1 s to 3.5 s). The pass rates of section 9.3 are from runs with the default reasoning: the effect of `none` on the quality is not measured.
- One `editText` call for each paragraph shows the first edit early (1.6 s for 16 paragraphs, against 4.4 s), and then one edit about each 0.6 s. But the run takes 2.3 times as long (12.2 s against 5.3 s), because `editText` has the old text and the new text. In the second run on 16 paragraphs, the model did not follow the instruction: it made one full write.
- Thus, I removed these instructions again. They are not a clear gain: a small document gets slower, and a long document gets the first edit earlier and the end later.
- An option that I did not build: a tool that replaces one block without the old text (the first words of the block as the anchor, then the new markdown). It has the early first edit of `editText` and about the output of one full write. A second option is the range write of the lens with the source maps.

## 14. Sessions and the chat example (11 November)

The second request of the review: an example with a chat window, for a run that the user starts and for a run that the server starts. Commits `40e2f5545` to `595c0b87e`.

### 14.1 What changed in the design

A host can keep the proposal and the chat: a **session** for each document (`sessions/sessionHost.ts`).

```
   a message in the chat of an editor        a prompt from outside the editors
   POST /sessions/:source/:id/messages       POST /sessions/:source/:id/runs
                     \                          /
                      v                        v
              startRun(documentId, { prompt, origin })      (one function)
                               |
     the chat of the document: + the request, with its origin
     the one open proposal of the document (or a new one from the main document)
     a handle with readMain: a rebase before each tool call
                               |
              streamDocumentAgentOnHandle  ->  the UI message stream
                               |
              RunLog: all chunks from the start; the run needs no client
                 |                                   |
     the response of POST /messages          GET /sessions/.../stream
     (the editor that sent the message)      (each other editor: it gets a notice,
                                              gets the session, and follows)
```

- A document has one open proposal, as one open pull request. Each run writes to it.
- The two kinds of run use the same function. The only difference is the origin in the message of the chat (`user` or `external`).
- The stream of a run starts with the proposal before the run, in a transient chunk (`data-document-proposal`). An editor takes it as its copy. Thus, an editor that did not see the earlier runs can follow.
- `RunLog` (`sessions/runLog.ts`) records the chunks of a run. A client that comes later gets the run from its start (`resumeStreamIsReplay` of the transport).
- The extension: the chat stays for all proposals (`getChat`), `follow()` connects it to the run in progress, `dismiss()` ends a review that closed in a different place, and `aiMenu: false` locks the editor without the AI menu.
- The review of a user is in the chat: the accept or the reject of a tool call goes into the output of that call (`agent/chatReview.ts`). The model gets it in the next run, and the chat window shows it.

This is "the proposal on the server" for server mode. Client mode does not change: the proposal is in the editor, and there is no session.

### 14.2 The example

`examples/09-ai/10-document-agent-chat`, at `http://localhost:5180/ai/document-agent-chat`. Three modes: a session on the JSON store, a session on the Yjs relay, and client mode. The chat window (`src/ChatPanel.tsx`) shows the `Chat` of the AI SDK of the editor: each request, each answer, and one card for each editing tool call, with its reason, an accept and a reject. `src/session.ts` has the transport (`DefaultChatTransport` with two request hooks) and the sync with the server.

A script starts a run in the same way as the box "Run from outside":

```sh
curl -X POST localhost:3111/ai/document-agent/sessions/yjs/chat-yjs/runs \
  -H 'content-type: application/json' -d '{"prompt":"Add one short sentence to the last paragraph."}'
```

### 14.3 What I examined in a browser

With the server, `claude-haiku-5-5` and Chromium:

- JSON session: a request in the chat gives two cards and three suggestions. After a reload, the chat and the review come back from the server. An accept of one card and a reject of the other close the proposal, and the server has the accepted text only. A run from outside shows in the chat with its own label, and the editor follows it.
- Yjs session with two tabs: the second tab follows the run of the first. An accept in one tab closes the review of the other tab, and its cards show "Accepted". A run that `curl` starts shows in the two tabs.
- Client mode: the same chat window. A question without a change gives an answer, and the editor is free again.

The automated tests: 84 tests in `src/documentAgent` (26 are new in this section and in section 13).

### 14.4 Two problems that the browser found, now fixed

- **The editor saved suggestions into the main document.** `openProposal` showed the suggestions before it changed the state from `idle`. An app that saves the document in the state `idle` then saved the text of the suggestions. The example `09-document-agent` has the same save. Now the state changes first, and a test examines the rule "no suggestion marks in the state `idle`" (commit `5ebd0cded`).
- **The agent made a rejected change again.** It did not know the reject: in the next run it saw that its change was missing, and wrote "Re-apply the spelling fix". Now the output of each tool call in the chat has the decision of the user, and the model reads "The user rejected this change" (the same commit). In the next browser run, the agent made only the requested change, and told the user that it did not repeat the rejected one.

### 14.5 Decisions to confirm

18. **In a session, the server keeps the proposal and the chat** (the option that I recommended; you did not answer the question before you left). The route `POST /chat`, where the client sends its copy of the proposal, stays for the example 09.
19. **One open proposal for each document.** A run of a user and a run from outside write to the same proposal.
20. **The decision of a user is a field of the tool output in the chat** (`review`), not a separate record.
21. **A run from outside locks the editor of each user that follows it**, as each run does. The example follows each run at once. An alternative is a notice in the chat, and a follow only after a click. Your answer (11 November): this is acceptable now, and we change it later. It is possible: `follow()` is a separate call of the app, thus an app can wait for a click.
22. **The batches are in the stream two times** (a data chunk at once, and the tool output for the history). A host that keeps the proposal does not need the second one: it can go, and the requests and the stored chat get smaller.
23. **`reasoning` has no default of our own.** With `none`, the first edit is about 2 s earlier for a large change, but the quality is not measured. Your answer (11 November): no default; an eval suite examines it later.

### 14.6 Limits of this part

- The chats and the runs of the session host are in memory, for one process. The proposal store has no compare and swap (section 8.2).
- A stop of the chat stops only the stream of this editor. The example also calls `POST /stop`, which stops the run on the server.
- The label of a request in the chat is "You" for each user: the session does not know which user sent a message.
- A reload during a run of the JSON session follows the run again. The chat of a session has the tool outputs with the operations: the snapshot of a long chat is large.
- The example is not type-checked by the lint (the lint does not cover `examples/`). I examined a copy of its files in the package: only the copied `yjsRelay.ts` of the example 09 gives a type error there (the body of a `fetch`).
- `runDocumentAgent` (no stream) is still the run of the routes `POST /runs` of the example 09. It has no early start of the tool calls.

### 13.5 `replaceRange`, a tool for a part of the document

Your request (11 November): a tool that edits a part of a markdown document. `replaceRange({ from, to, new, reason })` replaces the text from `from` to `to`: the agent gives the first words and the last words, not the old text between them (commit `83777401d`). `from` must be in the markdown one time, and `to` one time after it.

Measurements with `claude-haiku-5-5`, without reasoning, on 16 paragraphs (three runs each, milliseconds):

| Prompt                          | Tools and instructions                            | Tool calls                       | First edit      | End of the run   |
| ------------------------------- | ------------------------------------------------- | -------------------------------- | --------------- | ---------------- |
| Improve the full document       | No `replaceRange` (before)                        | 1 `writeDocument`                | 4,301 to 4,495  | 5,264 to 5,353   |
| Improve the full document       | `replaceRange`, "one call for each paragraph"     | 16 `replaceRange`                | 1,422 to 2,660  | 11,420 to 13,057 |
| Improve the full document       | `replaceRange`, "one call for about 4 paragraphs" | 1 `writeDocument` in 6 of 9 runs | 4,249 to 5,171  | 5,069 to 6,099   |
| Improve the full document       | `replaceRange`, no advice on the size (now)       | 1 `writeDocument`                | 4,328 to 5,171  | 5,069 to 6,099   |
| Replace 4 paragraphs with 1     | No `replaceRange` (before)                        | 1 `editText` (2 runs)            | 2,643 to 2,710  | 3,421 to 3,873   |
| Replace 4 paragraphs with 1     | No `replaceRange` (before)                        | 1 `writeDocument` (1 run)        | 4,981           | 5,780            |
| Replace 4 paragraphs with 1     | `replaceRange` (now)                              | 1 `replaceRange` (2 runs)        | 2,146 to 2,235  | 2,885 to 2,996   |
| Replace 4 paragraphs with 1     | `replaceRange` (now)                              | 2 `replaceRange`, 3 LLM calls    | 3,992           | 4,751            |

What the numbers show:

- The tool does what it must: a change of one part of a long document is one call, without the old text. It is about 0.5 s faster than `editText` for four paragraphs, and the model does not write the full document for it. The gain grows with the size of the part.
- It costs a new kind of failure: in one of three runs, an anchor was not correct, and the model needed one more LLM call.
- It does not make a change of the full document faster. One tool call costs about 0.6 s with Haiku, almost without regard to its size: 16 calls take 10 s, with or without the old text. Thus, the number of calls decides the time, and one full write stays the fastest.
- The model does not follow advice on the size of a call reliably ("about four paragraphs": one full write in 6 of 9 runs). Thus, the instructions now name the three tools without such advice. The best instructions are a question for the eval suite.
- A full write that shows early needs a different mechanism: the host applies each complete block of a `writeDocument` call while the model writes the call. This needs the partial input of a tool call, which you do not want as it is in the old engine. It is not built.

### 14.7 Guards for the main document (11 November)

Your request: suggestions in the main document must not be possible, with assertions, throws and ejects. The cause of the problem of 14.4: the Block JSON of an editor does not have the suggestion marks, thus it has the inserted text and the deleted text of a proposal as normal text. Commit `cfb5b0429` adds these layers:

1. **The display tells no change.** The transactions that show or remove suggestions have the Tiptap meta `preventUpdate`. `editor.onChange` gets a change only for the main document: an edit of a user, or an accept. A test saves after each change, without a check of the state, and gets only the main document.
2. **`agent.mainDocument()`** is the document without the suggestions, in each state. The two examples save it, and do not save `editor.document`.
3. **A document that shows a proposal cannot change**, except through the display: the plugin of the extension throws for each other transaction, and the transaction does not apply.
4. **`assertNoSuggestions`** throws before each step that reads the editor as the main document or writes to it: the start of a proposal, the display, each accept, the end of a review.
5. **No proposal shows in an editor that is bound to a Y.Doc without a fork**: `showSuggestions` throws.
6. **A host examines a shared Yjs document** before it reads it for a run (`assertNoYjsSuggestions`). The Yjs source of the demo server uses it.

What the guards do not cover:

- An app that reads `editor.document` at a time of its own (for example a timer) during a review still gets the suggestion text. The rule for an app is: save `agent.mainDocument()`. A guard in core for this needs a decision: `editor.document` could throw, or give the main document, while the editor has suggestion marks.
- A host cannot find suggestion text in Block JSON that a client sends: the JSON has no marks.
- The check of a Y.Doc finds marks on text only. A Y.Doc does not keep the marks on nodes.
- The old engine (`AIExtension`) has the same exposure: its suggestions are in the document of the editor, and its transactions tell `editor.onChange`. I did not change it.
- The cleanest design has no suggestion marks in the document at all: the display is decorations of the view, from the proposal. Then `editor.document` is the main document in each state. This is a larger change of the display.

### 14.8 A known failure: two users accept at the same time (11 November)

You asked if this model works, and if we dismissed it before (the conversation of 5 November: the spike of a suggestion mode with the lens on two documents, and the review of the Yjs 14 suggestions). That conversation named one risk for an accept that is a write of the lens: two users who accept the same suggestion at the same time both insert the text. The prototype has no guard for it, and I had no test for it. Now there is one (`it.fails` in `client/DocumentAgentExtension.test.ts`, commit after `101212eba`):

- Two editors on one shared Y.Doc open the same proposal, and the two users accept before the editors sync.
- After the sync, the main document has the text two times: "Opening paragraph." is "OpeningOpening paragraph.".

The cause is the same as on 5 November: two writes into one Y.Doc that cross on the network. Each accept alone is correct. Yjs cannot know that the two inserts are the same change.

What this means for the model:

- **The half of the agent is sound.** The proposal has one writer at a time (the agent, and the review batches in one sequence), the rebase writes only to the proposal, and the display only reads. No user edit goes through a service. This is the difference from the design that you dismissed on 5 November, where a service was in the path of each edit of a user.
- **The half of the accept is not sound for more than one reviewer.** It needs one of these: (a) one order for the accepts: the client asks the host first (a compare and swap on the proposal), and writes to the main document only after the host agrees; (b) an accept that is the same Yjs change for each user: the shared items of the Yjs 14 suggestion layer, where the accept is idempotent; (c) a host that writes the accept to the main document itself (a central merge authority, which you do not want).
- The other limits of 5 November also apply to each lens write to a Y.Doc: a move or a type change is a delete and an insert in the binding, thus an edit of another user in that block at the same time can be lost, or the block can be there two times.
- Nothing here has a test with random concurrent edits. The tests of this prototype are one reviewer, or two reviewers one after the other.

### 14.9 The accept guard, behind a flag (11 November)

Your decision: the Yjs 14 suggestion layer is the target, and until then an accept is a write of the client at once (the base scenario, with the known failure of 14.8). A guard is optional.

- The option `acceptGuard` of the extension: the extension asks first, and writes only if the guard resolves to true. Without the option, nothing changes.
- A host gives the accept to the first claim for a state of the proposal: `SessionHost.review` for one tool call (the batch must follow the stored proposal), and `closeProposal` with the number of batches for the full proposal. The session host runs the review requests of one document one after the other.
- The example: the link "Accept guard" (the flag `guard=1` of the URL). I examined it in a browser with two tabs on the Yjs session: an accept of one card and an accept of all.
- The costs of the guard: an accept waits for the server, and an editor that stops between the claim and the write leaves an accept that the server has and the document does not have.
- The test of 14.8 stays as the known failure of the base scenario. A second test has the same case with a guard: one editor writes, and the text is there one time.

### 14.10 A test with random concurrent edits (11 November)

Item 1 of the list in section 0. The test is `sessions/session.fuzz.test.ts` (commit `30b2fd5bc`).

**One scenario** (one seed):

- Three editors, each with its own Y.Doc, and the Y.Doc of a server. An editor and the server exchange their updates at random times.
- Users change the document in each editor that shows no proposal, also during a run: a new paragraph, text at the end of a block, and (in one variant) a word in the middle of a block.
- A session host with a mock model. A run makes one to three tool calls (`editText`, or `writeDocument`, sometimes from an older version of the proposal).
- One or two reviewers take the proposal of the host, and accept or reject one tool call or the full proposal.
- At the end, all requests arrive, all editors sync, and a reviewer accepts what is open.

**The rules** that the test examines at the end: the review ended in each editor. No suggestion mark is in an editor or in the shared document (this one also after each sync). Each editor shows its Y.Doc, and all Y.Docs are the same. No block ID is there two times. No change of a user is lost, and none is there two times. No change of the agent is there two times. An accepted change is there, and a rejected change is not there. No exception.

**Results**, 100 seeds for each variant. A scenario has 60 actions: about 17 edits of users, 12 tool calls, 2 rebases, and 1 to 4 accepts.

| Accept guard | Reviewers | Delay | Seeds with a problem | The problems |
| --- | --- | --- | --- | --- |
| Yes | 1 | Yes | 0 of 100 | |
| Yes | 2 | Yes | 0 of 100 | |
| Yes | 2 | Yes, and conflicts between a user and the agent | 0 of 100 | |
| No | 1 | No | 0 of 100 | |
| No | 2 | No | 0 of 100 | |
| No | 1 | Yes | 52 of 100 | A paragraph is there two times (52). An accepted change is not there (1). |
| No | 2 | Yes | 64 of 100 | A paragraph is there two times (64). An accepted change is not there (1). One block ID is there two times (5). |

"Delay" means: a request of a reviewer to the host arrives at a random later time, and a reviewer can have an old copy of the proposal. The delays of the test are long: a request can wait during many actions. Thus, the numbers show what can occur. They do not show how frequently it occurs in an app.

In all 700 scenarios, no change of a user was lost, no suggestion mark was in the shared document, and there was no exception.

**What the test found**

1. **A bug of the host, fixed** (`a470952f7`). The host examined only the number of a review batch. A batch that an editor made from an old copy of the proposal can have the correct number by chance, after a run added a batch. The host stored it, the editors could not replay the proposal, and the review did not end. The host now replays the batch on the stored proposal and compares the hash (`batchFollows`).
2. **The base scenario is correct if no review request crosses a different change of the proposal** (0 of 200 without a delay). All its problems are races between the write of an accept and the message about it:
   - A run starts before the host has the message. The rebase finds the accepted paragraph in the main document and in the proposal. The lens gives the paragraph of the proposal a new ID, the proposal shows it again, and the next accept adds it a second time. This occurs also with one reviewer.
   - The host refuses the late message, because the proposal changed. The host then shows the accepted tool call as open. The reviewer can reject it, and the accepted change goes.
   - Two reviewers accept at the same time (section 14.8). New: for a new block, each accept inserts a block with the ID of the proposal. The shared Y.Doc has that ID two times. Each editor gives the two blocks new IDs in its own view (the UniqueID plugin), and these IDs go to the Y.Doc only with the next change of that user. Until then, the editors do not agree on the IDs of these blocks. There is a known-failure test for this in `client/DocumentAgentExtension.test.ts`.
3. **The guard removes all of these** (0 of 300). Its cost in this test: the host refused more accepts than it gave (1.3 to 2.0 refused and 1.0 given for each scenario), because of the long delays. After a refused accept, the reviewer gets the new proposal and decides again.
4. **A limit that is not a race**, and that belongs to section 8.1: a reject of the tool call that added a block keeps the block if a later tool call changed it. After a reject of the two calls, the block is still in the proposal, with the text of the first call. The cause: the revert of a call is a three-way merge that keeps the proposal on a conflict, and "remove the block" against "the block changed" is a conflict. There is a known-failure test in `proposal/review.test.ts`. It needs your decision: does a reject of a call also remove the later changes to the blocks that the call added? I recommend yes.

A possible change for the first race, not built: the rebase can treat a block with the same ID and the same content in the two documents as one block. Then the paragraph is not there two times. The host still shows the accepted call as open.

**Limits of the test**

- Users only add paragraphs and text. They do not move blocks, change the type of a block, remove blocks, or nest blocks.
- A reviewer takes the proposal of the host as a snapshot. No editor follows a run through the stream, and no reviewer decides during a run.
- The rules for an accept and a reject of one tool call do not apply to a call that shares a block with a different call (section 8.1). The rule for an accept applies only to a change that the editor of the reviewer shows: the display does not show a change of the agent that is in conflict with the main document.
- The model is a mock: each tool call is valid.

**How to run it**, from `packages/xl-ai`: `DOCUMENT_AGENT_FUZZ_SEEDS=100 vp test --run src/documentAgent/sessions/session.fuzz.test.ts`. `DOCUMENT_AGENT_FUZZ_START` sets the first seed, and `DOCUMENT_AGENT_FUZZ_REPORT=<file>` writes each problem with the log of its scenario. The default is 5 seeds for each variant (about 15 s). 100 seeds for each variant are 6 to 9 minutes.

### 14.11 Does a Yjs 14 suggestion document replace the proposal? (11 November)

Your question: a single Yjs 14 branch document replaces the full `Proposal` data structure, thus a spike now shows if the architecture is correct, and the tests can run for a proposal mode and a Yjs mode.

You are right for the document state. A suggestion document S (S is M plus the suggestion items) replaces most of the proposal:

| Part of the proposal model | In Yjs 14 mode |
| --- | --- |
| `origin`, the operations of each batch, the replay | S is the document of the agent |
| The fork point, the rebase batches, the rebase before each tool call | Not necessary: an edit in M reaches S through the Yjs sync |
| `seq`, `hash`, `batchFollows`, the out-of-sync state | Not necessary: the Yjs sync does this |
| The derived suggestions, the local fork, the six guards of 14.7 | The binding shows S against M (`SuggestionsExtension` of `@blocknote/core/y` is in this worktree) |
| The batches in the chat stream, `follow()` for the display, the proposal store | The provider of S |
| The accept batches, `acceptGuard`, `closeProposal` | An accept moves the items of S to M, and is idempotent |

Three things stay:

1. **A record for each tool call.** The Yjs 14 attribution marks have only user IDs and a time, and the accept and the reject operate on a position range (`applySuggestion(start, end)`). The review of one tool call and its reason need a small synced map: the tool call ID, its reason, and the Yjs items of that call. This is the main design question of the spike.
2. **What the agent read.** The check for a stale write (`base: v3`) needs it, but only in memory during a run.
3. **Documents that are not on Yjs 14.** The JSON store and the Yjs 13 path (`@blocknote/core/yjs`, which the prototype uses now) keep the proposal. Thus the two modes of your test matrix are two real modes, unless AI needs Yjs 14.

The Yjs 14 mode has its own risks. The review of 5 November measured them:

- A reject of a suggested deletion is not idempotent, because Yjs cannot put back deleted content: two rejects at the same time write the text two times (41 of 59 seeds). The concurrency problem moves from the accept to the reject.
- "Suggestion" means "in S and not in M", without a stored state: an edit of a user adjacent to a suggestion of the agent becomes a part of the suggestion.
- The binding makes a block again for a change of its type or a move.
- The host needs a headless editor that is bound to S for each run.

My recommendation: do the spike, with your matrix. The test of 14.10 is the harness: the tools already operate on a document handle, and the rules are the same for each mode. The smallest useful spike is a handle that writes to S, the map of the tool calls, and a third mode in the test of 14.10. It waits for your confirmation, and for your decision if Yjs 14 will be a requirement for AI or one of two modes.
