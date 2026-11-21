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

  it("gives the ETag of the text that the client wrote: a second write from it keeps the change of another writer", async () => {
    const { get, put } = setup();
    const text = await (await get("text")).text();
    await put(
      "text",
      text.replace("The end", "The end, from A"),
      fromBase('"1"'),
    );

    // B writes from version 1. B does not read the document again.
    const ownText = text.replace("Hello world", "Hello from B");
    const first = await (await put("text", ownText, fromBase('"1"'))).json();
    expect(first).toMatchObject({
      changesOfOthers: [{ id: "end", change: "update" }],
    });
    // The next write of B is its own text, from the ETag of its first write.
    const second = await put(
      "text",
      ownText.replace("from B", "again from B"),
      fromBase(first.etag),
    );

    expect(await second.json()).toMatchObject({ warnings: [] });
    expect(await (await get("text")).text()).toBe(
      "Hello again from B\n\nThe end, from A",
    );
  });

  it("gives the ETag of the current document only in a read, if the write merged", async () => {
    const { get, put } = setup();
    const text = await (await get("text")).text();
    await put(
      "text",
      text.replace("The end", "The end, from A"),
      fromBase('"1"'),
    );

    const response = await put(
      "text",
      text.replace("Hello world", "Hello from B"),
      fromBase('"1"'),
    );

    // Version 3 is the current document. Version 4 is the document that B
    // wrote, without the change of A. The response does not have the current
    // text: a text and the ETag of a different document must not come
    // together.
    expect(await response.json()).toEqual({
      etag: '"4"',
      operations: [expect.objectContaining({ type: "update", id: "intro" })],
      warnings: [],
      changesOfOthers: [{ id: "end", change: "update" }],
    });
    const read = await get("text");
    expect(read.headers.get("ETag")).toBe('"3"');
    expect(await read.text()).toBe("Hello from B\n\nThe end, from A");

    // A write from the text and the ETag of the read keeps all changes too.
    await put("text", "Hello from B\n\nThe end, from A and B", fromBase('"3"'));
    expect(await (await get("text")).text()).toBe(
      "Hello from B\n\nThe end, from A and B",
    );
    // The next version of the document is 5: a strict write needs its ETag.
    expect((await get("text")).headers.get("ETag")).toBe('"5"');
    expect((await put("text", "x", { "If-Match": '"4"' })).status).toBe(412);
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
      operations: [
        { type: "update", id: "end", update: { props: { textColor: "red" } } },
      ],
    });
    expect(await (await get("json")).json()).toMatchObject([
      { id: "intro" },
      { id: "end", props: { textColor: "red" } },
    ]);
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

  it("rejects a merge with a conflict (On-Conflict: reject, the default)", async () => {
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

    // Without `On-Conflict`, the merge also rejects the conflict.
    const byDefault = await put(
      "text",
      text.replace("Hello world", "Hello from B"),
      fromBase('"1"'),
    );
    expect(byDefault.status).toBe(409);
    expect(await byDefault.json()).toMatchObject({ error: "conflict" });
    expect(await (await get("text")).text()).toBe("Hello from A\n\nThe end");

    // With `On-Conflict: keep-current`, the change of A stays, with a warning.
    const kept = await put(
      "text",
      text.replace("Hello world", "Hello from B"),
      fromBase('"1"', "keep-current"),
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
