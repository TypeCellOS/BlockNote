# AI document agent (prototype)

This example shows the document agent of `@blocknote/xl-ai`: an agent loop that reads and writes the document as markdown through the text lens. The agent writes to a proposal. The editor shows the proposal as suggestions, with the reason of each tool call, and the user accepts or rejects each tool call.

Select a mode at the top. In "Server" and "Client" mode, type `/ai` or select text and click the AI button. In the two "Server run" modes, start a run with the panel on the right, change the document while the agent works, then review the proposal.

The example needs the BlockNote AI server (`packages/xl-ai-server`). That server also has the small Yjs relay of the mode "Server run (Yjs)". See `PROTOTYPE.md` in the root of the repository.

**Relevant Docs:**

- [Getting Stared with BlockNote AI](/docs/features/ai/getting-started)
- [Changing the Formatting Toolbar](/docs/react/components/formatting-toolbar)
- [Changing Slash Menu Items](/docs/react/components/suggestion-menus)
