# Prototype: the text lens in `@blocknote/xl-ai` (the document agent)

Branch `proto/xl-ai-lens`, worktree `/Users/yousef/Programming/BlockNote-xl-ai-proto`. The base is `text-lens-readability` (`3d8b4d1a6`) with `origin/main` (`d4567abbf`) merged. The prototype is the commits after the merge commit `8d42ac3c8`. Nothing is pushed.

The prototype adds a second AI engine next to the old engine. An agent loop reads and writes the document as markdown through the text lens. The agent writes only to a proposal. The editor derives suggestions from the proposal, with the reason of each tool call, and the user accepts or rejects each tool call. The same code runs in the browser and on a server.

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
export PATH="$HOME/.nvm/versions/node/v24.18.0/bin:$PWD/node_modules/.bin:$PATH"

# 1. The AI server on port 3111, with the API keys of the main checkout.
cd packages/xl-ai-server
set -a; source /Users/yousef/Programming/BlockNote/packages/xl-ai-server/.env.local; set +a
PORT=3111 DOCUMENT_AGENT_MODEL=anthropic:claude-haiku-5-5 vite-node src/index.ts

# 2. The playground on port 5180 (a second terminal).
cd playground
VITE_BLOCKNOTE_AI_SERVER_BASE_URL=http://localhost:3111/ai vp dev --port 5180 --strictPort
```

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

1. **The batches go in the tool outputs, not in data parts.** Reasons: the tool call and its batch stay together, the chat history can rebuild the proposal, and the same code works with `createAgentUIStream` and in the browser (a data part needs the stream writer in a closure of the tool). Cost: the history has the operations. The model does not get them, but each request sends them to the server again.
2. **The proposal is a log that only grows, with four kinds of batch** (section 3.1). The brief had "F plus batches" with one kind. The log makes a rebase one batch and one merge, makes each version available without snapshots, and a client that follows a run gets a rebase as a normal batch. Cost: a `rebase` and an `accept` batch contain a full document (the new fork point).
3. **The suggestion ID is the batch number of the tool call, not the tool call ID.** The suggestion marks of `AIExtension` allow only a number as their ID (`validate: "number"`). With `validate: "number|string"` there and in `parseDOM`, the ID can be the tool call ID.
4. **The display gives each changed block to one tool call: the last open call that changed it.** Accept and reject of one tool call are lens writes of the delta of that call (three-way merges), not `applySuggestion(id)` on the marks. Then the display derives again. See section 8.1.
5. **The accept of one tool call moves the fork point.** Without it, a block that the call added is in the main document and in P, but not in F, and the lens gives the block of P a new ID: the block shows two times.
6. **A tool that throws stops the loop and fails the run.** The client shows a fixed text, never the message of the exception.
7. **`readDocument` is a tool call. The document is not in the first prompt.** This costs one LLM step for each run (about 1 s with Haiku). The alternative puts the markdown and the version in the first message.
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
