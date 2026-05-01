import { getCurrentTest } from "@vitest/runner";
import { getSortedEntries, toHashString } from "msw-snapshot";
import path from "node:path";

async function createRequestHash(req: Request): Promise<string> {
  const url = new URL(req.url);
  return toHashString([
    req.method,
    url.origin,
    url.pathname,
    getSortedEntries(url.searchParams),
    getSortedEntries(req.headers),
    new TextDecoder("utf-8").decode(await req.arrayBuffer()),
  ]);
}

export function createSnapshotPathFn(_basePath: string) {
  const fetchCountMap: Record<string, number> = {};

  return async (info: { request: Request }): Promise<string> => {
    const t = getCurrentTest()!;
    const mswPath = path.join(
      t.suite!.name,
      "__msw_snapshots__",
      t.suite!.suite!.name,
      t.name,
    );
    fetchCountMap[mswPath] = (fetchCountMap[mswPath] || 0) + 1;
    const counter = fetchCountMap[mswPath];
    const hash = await createRequestHash(info.request);
    return `${mswPath}_${counter}_${hash}.json`;
  };
}
