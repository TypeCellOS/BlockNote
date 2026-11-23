import { getSortedEntries, toHashString } from "msw-snapshot";

// The historical request identity is tested independently of HTML replay,
// whose lookup uses the test title and request number, not the hash.
export async function createRequestHash(req: Request): Promise<string> {
  const url = new URL(req.url);
  // AI SDK 7 includes the OS-specific runtime user-agent. It must not make
  // otherwise identical recordings platform-dependent.
  const headers = new Headers(req.headers);
  headers.delete("user-agent");
  return toHashString([
    req.method,
    url.origin,
    url.pathname,
    getSortedEntries(url.searchParams),
    getSortedEntries(headers),
    new TextDecoder("utf-8").decode(await req.arrayBuffer()),
  ]);
}
