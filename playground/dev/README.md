# Local embed demo transport

The playground Vite dev server mounts `/__embeds/oembed` and injects
`import.meta.env.BLOCKNOTE_EMBED_DEMO_ENDPOINT`. Production builds, preview,
and standalone examples do not enable it. The resolver loads from local source,
so config loading does not require a prebuilt `@blocknote/xl-embed-server` entry.

This is a local development tool, not a deployable public proxy. It accepts only
loopback clients using a localhost/loopback Host matching the server port, a
same-origin browser Fetch Metadata header and Referer, and a matching Origin when
present. It never forwards browser cookies or authorization headers.

Outbound requests use `node-fetch` with manual redirects and
[`request-filtering-agent`](https://github.com/azu/request-filtering-agent).
The agent checks literal addresses and the DNS answers used by the actual socket
lookup, blocking non-unicast IPv4/IPv6 addresses. It does not validate DNS and then
make a separate unprotected fetch. See the agent's
[connection implementation](https://github.com/azu/request-filtering-agent/blob/master/src/request-filtering-agent.ts)
and [node-fetch agent API](https://github.com/node-fetch/node-fetch#custom-agent).
All page/discovery/redirect requests pass through this transport.
Decoded response bytes stream to the resolver, which caps HTML heads and complete
JSON responses at 512 KiB and cancels unneeded bodies. Reads honor its abort deadline.

The resolver is an optional experimental reference implementation. Image proxying,
authentication, caching, and production egress controls remain application-owned.

Run `pnpm --dir playground test:embed-demo` for local-origin guard checks and real
transport rejection of localhost/private/link-local IPv4/IPv6 destinations.
