import { describe, expect, it } from "vite-plus/test";
import { createRequestHash } from "./snapshotPath.js";

function createRequest({
  platform = "darwin",
  body = '{"prompt":"hello"}',
  version = "2023-06-01",
} = {}) {
  return new Request("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": version,
      "user-agent": `ai-sdk-anthropic/4.0.88 ai-sdk-provider-utils/5.0.68 mozilla/5.0 (${platform}) applewebkit/537.36 (khtml, like gecko) jsdom/29.0.2`,
    },
    body,
  });
}

describe("AI snapshot request hashes", () => {
  it("matches the same request on macOS and Linux", async () => {
    expect(await createRequestHash(createRequest())).toBe(
      await createRequestHash(createRequest({ platform: "linux" })),
    );
  });

  it("distinguishes request bodies", async () => {
    expect(await createRequestHash(createRequest())).not.toBe(
      await createRequestHash(createRequest({ body: '{"prompt":"goodbye"}' })),
    );
  });

  it("distinguishes API headers", async () => {
    expect(await createRequestHash(createRequest())).not.toBe(
      await createRequestHash(createRequest({ version: "2023-01-01" })),
    );
  });
});
