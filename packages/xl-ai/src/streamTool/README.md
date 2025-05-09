# StreamTools

This directory implements the concept of a a StreamTool.

A StreamTool is similar to a Tool in the Vercel AI SDK, but:

- a collection of StreamTools can be wrapped in a single LLM Tool to issue multiple operations (tool calls) at once.
- StreamTools can be used in a streaming manner (i.e.: non-complete tool calls can be evaluated)

## Notes

We should keep the code in this directory generic (non-BlockNote specific)
