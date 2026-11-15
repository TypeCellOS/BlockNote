# Experimental discovery-only oEmbed resolver

`@blocknote/xl-embed-server` is an optional reference
implementation, not a production unfurling platform or broad Iframely replacement.
BlockNote clients can use another standard oEmbed service instead.

```ts
import { createEmbedResolver } from "@blocknote/xl-embed-server";
import { protectedFetch } from "./protected-egress.js";

export default createEmbedResolver({
  protectedFetch,
  timeoutMs: 5000,
  maxResponseBytes: 512 * 1024,
  maxRedirects: 3,
});
```

The Fetchable factory returns `{ fetch(request: Request): Promise<Response> }`.
The application owns routing, authentication, CORS, rate limits, caching and
deployment. There is no listener, renderer or hosted iframe/card HTML endpoint.
Runtime code uses web-standard APIs and the incremental `htmlparser2` parser,
not Node APIs. Bundled dependency notices are in `THIRD-PARTY-LICENSES`.

## Resolution: deliberately no provider registry

1. Fetch the submitted HTTP(S) source unchanged, including its existing query.
2. For JSON, recognize usable oEmbed media and copy its known fields.
3. For HTML, inspect the head for JSON oEmbed `<link rel="alternate">` discovery.
   Resolve relative endpoints against the first `<base href>` (falling back to
   the final fetched page URL if absent or unusable). Ignore unusable discovery
   links and continue to the first usable endpoint. Add `format=json`
   and requested dimension hints; add `url` with the submitted source only when
   the discovery link does not already declare it.
4. Return the provider response when usable, filling missing title, description,
   image and icon hints from the page's OG/Twitter/title metadata. Otherwise keep
   the page metadata. If the page itself cannot be fetched or parsed,
   return a plain `link` for the submitted source. No retry or alternate-provider
   search is performed.

**Tradeoff:** there is no bundled catalog, hostname matching, endpoint guessing,
custom registry, or catalog refresh tooling. Sites without HTML discovery return
metadata only. Direct oEmbed URLs must already include any parameters their
server requires (such as `format=json`); they are never rewritten.
XML/Link-header discovery, login handling and anti-bot bypass are not implemented.

Persist the original submitted URL, not redirect destinations, nested endpoint
parameters or returned photo URLs. Source identity and HTTP URL syntax are not
network-security guarantees.

## Required network boundary

**`protectedFetch` is mandatory and application-supplied. Plain global fetch is
not SSRF-safe.** It must enforce public-only actual connections, DNS rebinding
protections and IPv4/IPv6 private/loopback/link-local/cloud-metadata exclusions.
The policy applies to source URLs, discovered endpoints and every redirect.
The syntax-only `parseHttpUrl` helper cannot enforce these connection guarantees.

The adapter receives credential-free GET requests with manual redirect handling.
Honor its abort signal, stream decoded bodies, and preserve upstream status,
Content-Type and Location. Do not forward application/service credentials to
target sites or expose this resolver as an unrestricted arbitrary-URL proxy.
Tests use transport stubs; they do not certify deployment security.

## HTTP and response contract

```text
GET /oembed?url=https%3A%2F%2Fexample.com%2Farticle&format=json&maxwidth=600
```

- Mount at any path; the handler does not interpret the incoming pathname.
- `url`: the source to enrich. Unsupported/malformed sources fall back without
  making an outbound request. HTTP(S)/credential restrictions live at the fetch
  boundary, not in the HTTP adapter.
- The response is always JSON; `format` is not interpreted.
- `maxwidth`/`maxheight` are passed unchanged to discovered endpoints, without
  numeric coercion or validation. They do not restrict returned media sizes.
- Output is raw version `"1.0"` oEmbed JSON, not a custom envelope. Usable media
  requires its basic fields; incomplete media degrades to a `link`. There are no
  strict upstream version checks, per-field length caps or provider-specific
  exceptions. Unknown fields are dropped; the total body limit still applies.
- Expected upstream failures (including invalid JSON, unsupported content, byte/
  depth limits and timeouts) produce a link fallback with HTTP 200, not an error
  taxonomy. Non-GET requests return 405; other HTTP routing is application-owned.
  Unexpected exceptions still propagate to the application's reporting boundary.

Optional `description`, `image_url` and `icon_url` extensions carry metadata.
Image/icon URLs extracted from page metadata retain their HTTP(S) scheme and
resolve relative to the final document base. Provider-supplied image/icon URLs
are returned as received, without document-base resolution. No asset fetching,
HTTPS guessing or external favicon lookup occurs.
Returned data and HTML are untrusted and never executed. Consumers validate
display URLs and own safe rendering, iframe policies and image proxy/signing.
The frontend applies its own rendering limits; this server does not duplicate
them. A fallback is a valid link response, not a signal to retain an older snapshot.

## Bounds and ownership

`AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)])` supplies one
5-second default deadline for the operation, including already-aborted requests.
The injected fetch must honor its signal; there is no second promise-racing
implementation to compensate for a nonconforming transport. Configuration is
typed, not runtime-validated. Each resource permits 3 manual redirects and 512 KiB
decoded bytes by default; resolution uses at most a source and one discovered
endpoint, plus their redirects.

HTML streaming stops at a real `</head>` or opening `<body>`, ignoring apparent
boundaries inside comments, quoted attributes and raw-text elements. The single
incremental parser bounds nesting to 128 simultaneous open elements. A
`WritableStream` collects JSON or parsed head data; `pipeTo` handles backpressure,
abort propagation and upstream cancellation when the head ends or a limit is hit.
It is a sink rather than a `TransformStream`: no transformed stream is consumed.
A timer cannot interrupt synchronous parsing;
depth/byte limits supply complementary bounds. HTML error recovery is not
browser-identical, and non-UTF-8 pages may extract incorrectly.

`src/index.ts` owns the small HTTP adapter and operation lifecycle;
`src/resolve.ts` owns the source/JSON/discovery/metadata pipeline. Network, schema
and incremental head parsing stay separate, without a provider framework.

Verification from this package: `vp run test`, `vp run lint`, `vp run build`.
