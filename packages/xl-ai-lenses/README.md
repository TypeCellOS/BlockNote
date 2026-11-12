# @blocknote/xl-ai-lenses (prototype)

A document agent for BlockNote: an AI agent that edits a document through the text lens of `@blocknote/xl-ai`, and a review of its changes in the editor.

This package is a prototype. It is private, and its API can change at each commit. It is a package of its own so that a change here cannot break a build of `@blocknote/xl-ai`.

The entry points:

- `@blocknote/xl-ai-lenses`: the editor side (the extension, the menu, the review), in proposal mode.
- `@blocknote/xl-ai-lenses/server`: the host side (the agent loop, the tools, the sessions, the stores). It has no React code.
- `@blocknote/xl-ai-lenses/yjs14` and `@blocknote/xl-ai-lenses/yjs14-server`: the Yjs 14 mode. They need `@y/y`.
- `@blocknote/xl-ai-lenses/style.css`: the styles of the review and of the replay animation.

What it uses of `@blocknote/xl-ai`, through public entry points only: the text lens (`@blocknote/xl-ai/text-lens`), `AIExtension`, and the AI menu.

See `PROTOTYPE.md` in the root of the repository.
