// Install the DOM before BlockNote is used.
import "./dom.js";

import { describe, expect, it } from "vite-plus/test";

import { createApp } from "./app.js";
import { createDocumentStore } from "./documents.js";

function setup() {
  const app = createApp(
    createDocumentStore([
      {
        id: "intro",
        type: "paragraph",
        props: { textColor: "blue" },
        content: "Hello world",
      },
      { id: "end", type: "paragraph", content: "The end" },
    ]),
  );
  const get = (format: string) => app.request(`/documents/doc/${format}`);
  const put = (
    format: string,
    body: string,
    headers: Record<string, string> = {},
  ) =>
    app.request(`/documents/doc/${format}`, { method: "PUT", body, headers });
  return { get, put };
}

/** The headers of a merge from the version with the ETag `etag`. */
function fromBase(etag: string, onConflict?: string) {
  return onConflict === undefined
    ? { "Base-Version": etag }
    : { "Base-Version": etag, "On-Conflict": onConflict };
}

describe("text lens server", () => {
  it("gives the document in each format, with the ETag of its version", async () => {
    const { get } = setup();
    const markdown = await get("markdown");
    expect(markdown.headers.get("ETag")).toBe('"1"');
    expect(markdown.headers.get("Content-Type")).toContain("text/markdown");
    expect(await markdown.text()).toBe("Hello world\n\nThe end\n");
    expect(await (await get("html")).text()).toContain(
      'data-text-color="blue"',
    );
    expect(await (await get("text")).text()).toBe("Hello world\n\nThe end");
    expect(await (await get("json")).json()).toMatchObject([
      { id: "intro", props: { textColor: "blue" } },
      { id: "end" },
    ]);
  });

  it("writes markdown back, and keeps the data that markdown does not show", async () => {
    const { get, put } = setup();
    const response = await put("markdown", "Hello brave world\n\nThe end\n");

    // The new ETag is in the body. The stored document is not the content of
    // the request, thus RFC 9110 does not allow an ETag header here.
    expect(response.headers.get("ETag")).toBeNull();
    expect(await response.json()).toMatchObject({
      etag: '"2"',
      operations: [{ type: "update", id: "intro" }],
      warnings: [],
    });
    expect(await (await get("json")).json()).toMatchObject([
      { id: "intro", props: { textColor: "blue" } },
      { id: "end" },
    ]);
  });

  it("does not make a new version if the text did not change", async () => {
    const { get, put } = setup();
    const text = await (await get("markdown")).text();
    expect(await (await put("markdown", text)).json()).toMatchObject({
      etag: '"1"',
      operations: [],
    });
  });

  it("keeps the changes of another writer if the client sends its base version", async () => {
    const { get, put } = setup();
    // Two clients read version 1.
    const markdown = await (await get("markdown")).text();
    const text = await (await get("text")).text();

    await put(
      "markdown",
      markdown.replace("The end", "The end, from A"),
      fromBase('"1"'),
    );
    await put(
      "text",
      text.replace("Hello world", "Hello from B"),
      fromBase('"1"'),
    );

    expect(await (await get("text")).text()).toBe(
      "Hello from B\n\nThe end, from A",
    );
  });

  it("gives the document after the write, with the changes of other writers, for the next write", async () => {
    const { get, put } = setup();
    const text = await (await get("text")).text();
    await put(
      "text",
      text.replace("The end", "The end, from A"),
      fromBase('"1"'),
    );

    // B writes from version 1. The response has the change of A too.
    const response = await put(
      "text",
      text.replace("Hello world", "Hello from B"),
      fromBase('"1"'),
    );
    const result = await response.json();
    expect(result).toMatchObject({
      etag: '"3"',
      text: "Hello from B\n\nThe end, from A",
    });

    // The next write of B is from the version of the text that B has.
    await put(
      "text",
      result.text.replace("from B", "again from B"),
      fromBase(result.etag),
    );
    expect(await (await get("text")).text()).toBe(
      "Hello again from B\n\nThe end, from A",
    );
  });

  it("writes JSON back, by block ID", async () => {
    const { get, put } = setup();
    const document = await (await get("json")).json();
    document[1].props.textColor = "red";

    const response = await put(
      "json",
      JSON.stringify(document),
      fromBase('"1"'),
    );

    expect(await response.json()).toMatchObject({
      etag: '"2"',
      document: [{ id: "intro" }, { id: "end", props: { textColor: "red" } }],
      operations: [
        { type: "update", id: "end", update: { props: { textColor: "red" } } },
      ],
    });
  });

  it("reads children: null as no children", async () => {
    const { get, put } = setup();
    const document = await (await get("json")).json();
    document[1].children = null;

    const response = await put(
      "json",
      JSON.stringify(document),
      fromBase('"1"'),
    );

    expect(response.status).toBe(200);
  });

  it("gives an error for an unknown base version, invalid JSON, and an unknown format", async () => {
    const { put, get } = setup();
    expect((await put("markdown", "x", fromBase('"42"'))).status).toBe(409);
    expect((await put("markdown", "x", fromBase("latest"))).status).toBe(409);
    // The ETag has quotes: a version number alone is not an ETag.
    expect((await put("markdown", "x", fromBase("1"))).status).toBe(409);
    expect((await put("json", "{")).status).toBe(400);
    expect((await get("pdf")).status).toBe(404);
    expect((await get("toString")).status).toBe(404);
    expect((await put("toString", "x")).status).toBe(404);
  });

  it("gives an error for an HTML table that does not fit the schema", async () => {
    const { put, get } = setup();
    const html =
      '<table><tbody><tr><td rowspan="3">A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></tbody></table>';

    const response = await put("html", html);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid-document" });
    expect((await get("markdown")).headers.get("ETag")).toBe('"1"');
  });

  it("gives an error for JSON that is not a valid document, and does not change the document", async () => {
    const { put, get } = setup();
    for (const body of [
      "{}",
      "[1]",
      '[{ "type": "unknown" }]',
      '[{ "type": "toString" }]',
      '[{ "type": "paragraph", "children": "x" }]',
      '[{ "type": "paragraph", "content": [{ "type": "unknown" }] }]',
      // 20,000 levels of children.
      "[" +
        '{ "type": "paragraph", "children": ['.repeat(20_000) +
        "]}".repeat(20_000) +
        "]",
    ]) {
      expect(await (await put("json", body)).json()).toEqual({
        error: "invalid-document",
      });
    }
    expect((await get("markdown")).headers.get("ETag")).toBe('"1"');
    expect(await (await get("text")).text()).toBe("Hello world\n\nThe end");
  });

  it("applies a strict write (If-Match) only if no other writer changed the document", async () => {
    const { get, put } = setup();
    const text = await (await get("text")).text();
    const strict = { "If-Match": '"1"' };

    const first = await put(
      "text",
      text.replace("The end", "The end, from A"),
      strict,
    );
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ etag: '"2"' });

    // B also read version 1, but the document is at version 2 now.
    const second = await put(
      "text",
      text.replace("Hello world", "Hello from B"),
      strict,
    );
    expect(second.status).toBe(412);
    expect(await second.json()).toEqual({ error: "document-changed" });
    expect(await (await get("text")).text()).toBe(
      "Hello world\n\nThe end, from A",
    );

    // `*` matches each version. A weak ETag never matches (strong comparison).
    expect((await put("text", "x", { "If-Match": 'W/"2"' })).status).toBe(412);
    expect((await put("text", "x", { "If-Match": '"1", "2"' })).status).toBe(
      200,
    );
    expect((await put("text", "y", { "If-Match": "*" })).status).toBe(200);
  });

  it("rejects a merge with a conflict if the client asks for it (On-Conflict: reject)", async () => {
    const { get, put } = setup();
    const text = await (await get("text")).text();
    await put(
      "text",
      text.replace("Hello world", "Hello from A"),
      fromBase('"1"'),
    );

    // B changed the same words from version 1: a conflict.
    const rejected = await put(
      "text",
      text.replace("Hello world", "Hello from B"),
      fromBase('"1"', "reject"),
    );
    expect(rejected.status).toBe(409);
    expect(await rejected.json()).toEqual({
      error: "conflict",
      conflicts: [{ type: "conflicting-change", id: "intro" }],
    });
    expect(await (await get("text")).text()).toBe("Hello from A\n\nThe end");

    // The default (keep-current): the change of A stays, with a warning.
    const kept = await put(
      "text",
      text.replace("Hello world", "Hello from B"),
      fromBase('"1"'),
    );
    expect(kept.status).toBe(200);
    expect(await kept.json()).toMatchObject({
      warnings: [{ type: "conflicting-change", id: "intro" }],
    });
  });

  it("gives an error for On-Conflict without Base-Version, and for an unknown On-Conflict", async () => {
    const { put } = setup();
    const withoutBase = await put("text", "x", { "On-Conflict": "reject" });
    expect(withoutBase.status).toBe(400);
    expect(await withoutBase.json()).toEqual({
      error: "on-conflict-without-base-version",
    });
    const unknown = await put("text", "x", fromBase('"1"', "maybe"));
    expect(unknown.status).toBe(400);
    expect(await unknown.json()).toEqual({ error: "unknown-on-conflict" });
  });
});
