# AI Integration with server LLM message persistence

This example shows how to setup to add AI integration while handling the LLM calls (in this case, using the Vercel AI SDK) on your server, using a custom executor.

Instead of sending all messages, these are kept server-side and we only submit the latest message.
