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
  const put = (format: string, body: string, base?: string) =>
    app.request(`/documents/doc/${format}`, {
      method: "PUT",
      body,
      headers: base === undefined ? {} : { "Base-Version": base },
    });
  return { get, put };
}

describe("text lens server", () => {
  it("gives the document in each format, with its version", async () => {
    const { get } = setup();
    const markdown = await get("markdown");
    expect(markdown.headers.get("Document-Version")).toBe("1");
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

    expect(response.headers.get("Document-Version")).toBe("2");
    expect(await response.json()).toMatchObject({
      version: 2,
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
      version: 1,
      operations: [],
    });
  });

  it("keeps the changes of another writer if the client sends its base version", async () => {
    const { get, put } = setup();
    // Two clients read version 1.
    const markdown = await (await get("markdown")).text();
    const text = await (await get("text")).text();

    await put("markdown", markdown.replace("The end", "The end, from A"), "1");
    await put("text", text.replace("Hello world", "Hello from B"), "1");

    expect(await (await get("text")).text()).toBe(
      "Hello from B\n\nThe end, from A",
    );
  });

  it("writes JSON back, by block ID", async () => {
    const { get, put } = setup();
    const document = await (await get("json")).json();
    document[1].props.textColor = "red";

    const response = await put("json", JSON.stringify(document), "1");

    expect(await response.json()).toMatchObject({
      operations: [
        { type: "update", id: "end", update: { props: { textColor: "red" } } },
      ],
    });
  });

  it("gives an error for an unknown base version, invalid JSON, and an unknown format", async () => {
    const { put, get } = setup();
    expect((await put("markdown", "x", "42")).status).toBe(409);
    expect((await put("json", "{")).status).toBe(400);
    expect((await put("json", '[{ "type": "unknown" }]')).status).toBe(400);
    expect((await get("pdf")).status).toBe(404);
  });
});
