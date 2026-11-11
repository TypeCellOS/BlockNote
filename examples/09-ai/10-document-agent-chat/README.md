# AI document agent with a chat (prototype)

This example shows the document agent of `@blocknote/xl-ai` with a chat window. The server keeps the chat and the one open proposal of the document. A message in the chat and a prompt from outside the editor (a script, or later an external agent) start a run in the same way, and each editor of the document follows the run.

**Try it out:** Type a request in the chat, or start a run with the box "Run from outside". Then accept or reject each change in the chat. The mode "Yjs 14 suggestions" shows the changes of the agent as suggestions of Yjs 14: there, you can type in the editor during the review.

The example needs the BlockNote AI server (`packages/xl-ai-server`). See `PROTOTYPE.md` in the root of the repository.

**Relevant Docs:**

- [Getting Stared with BlockNote AI](/docs/features/ai/getting-started)
- [Real-time Collaboration](/docs/features/collaboration)
