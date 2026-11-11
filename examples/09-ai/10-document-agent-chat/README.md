# AI document agent with a chat (prototype)

This example shows the document agent of `@blocknote/xl-ai` with a chat window. The server keeps the chat and the one open proposal of the document. A message in the chat and a prompt from outside the editor (a script, or later an external agent) start a run in the same way, and each editor of the document follows the run.

**Try it out:** Type a request in the chat, or start a run with the box "Run from outside". Then accept or reject each change in the chat. The mode "Yjs 14 suggestions" shows the changes of the agent as suggestions of Yjs 14: there, you can type in the editor during the review.

The example needs the BlockNote AI server (`packages/xl-ai-server`). See `PROTOTYPE.md` in the root of the repository.

**State on the server:** Start the AI server with `DOCUMENT_AGENT_DATA_DIR=<a directory>`. The server then keeps the chats, the proposals, the documents and the streams of the runs in files there. Reload the page during a run, or stop and start the server: the chat, the changes and the review are there. Without the variable, the state is in the memory of the server.

**Relevant Docs:**

- [Getting Stared with BlockNote AI](/docs/features/ai/getting-started)
- [Real-time Collaboration](/docs/features/collaboration)
