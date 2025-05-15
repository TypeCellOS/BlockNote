# BlockNote AI Server

The BlockNote AI Server is a simple demo node.js ([Hono](http://hono.dev/)) Proxy server you can use to pass requests to third party LLM provider without exposing your LLM API keys on the client.

The server exposes the endpoint `/ai?url=<URL-TO-FETCH>&provider=<PROVIDERNAME>` which can handle LLM requests (e.g.: created with the [AI SDK](https://ai-sdk.dev/)). These are forwarded to `URL-TO-FETCH` with API keys loaded from environment variables.

## Requirements

Requirements:

- `mkcert` for local testing over https ([instructions](https://web.dev/articles/how-to-use-local-https))

## Configuration

Configure your environment variables according to `.env.example`.

## Running (dev mode):

    mkcert localhost
    pnpm run dev

## Client Usage

use `createBlockNoteAIClient` from `@blocknote/xl-ai` to create an API client to connect to the BlockNote AI Server / proxy.
