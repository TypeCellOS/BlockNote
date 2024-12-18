import {
  BlockNoteSchema,
  createBlockSpec,
  createInlineContentSpec,
  createStyleSpec,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultStyleSpecs,
} from "@blocknote/core";
import { testDocument } from "@shared/testDocument.js";
import AdmZip from "adm-zip";
import { describe, expect, it } from "vitest";
import { odtDefaultSchemaMappings } from "./defaultSchema/index.js";
import { ODTExporter } from "./odtExporter.js";

describe("ODT Exporter", () => {
  it("should create an exporter with default schema", () => {
    const schema = BlockNoteSchema.create();
    const exporter = new ODTExporter(schema, odtDefaultSchemaMappings);
    expect(exporter).toBeDefined();
  });

  it("should handle schema with extra block", () => {
    const schema = BlockNoteSchema.create({
      blockSpecs: {
        ...defaultBlockSpecs,
        extraBlock: createBlockSpec(
          {
            type: "extraBlock",
            content: "none",
            propSchema: {},
          },
          {} as any
        ),
      },
    });

    new ODTExporter(schema, {
      ...odtDefaultSchemaMappings,
      blockMapping: {
        ...odtDefaultSchemaMappings.blockMapping,
        extraBlock: () => createElement("text:p", null, "Extra Block"),
      },
    });
  });

  it("should handle schema with extra inline content", () => {
    const schema = BlockNoteSchema.create({
      inlineContentSpecs: {
        ...defaultInlineContentSpecs,
        extraInline: createInlineContentSpec(
          {
            type: "extraInline",
            content: "styled",
            propSchema: {},
          },
          {} as any
        ),
      },
    });

    new ODTExporter(schema, {
      ...odtDefaultSchemaMappings,
      inlineContentMapping: {
        ...odtDefaultSchemaMappings.inlineContentMapping,
        extraInline: () => createElement("text:span", null, "Extra Inline"),
      },
    });
  });

  it("should handle schema with extra style", () => {
    const schema = BlockNoteSchema.create({
      styleSpecs: {
        ...defaultStyleSpecs,
        extraStyle: createStyleSpec(
          {
            type: "extraStyle",
            propSchema: "boolean",
          },
          {} as any
        ),
      },
    });

    new ODTExporter(schema, {
      ...odtDefaultSchemaMappings,
      styleMapping: {
        ...odtDefaultSchemaMappings.styleMapping,
        extraStyle: () => ({ "custom:style": "value" }),
      },
    });
  });

  it("should export a document", async () => {
    const exporter = new ODTExporter(
      BlockNoteSchema.create(),
      odtDefaultSchemaMappings
    );

    const blob = await exporter.toODTDocument(testDocument);
    expect(blob).toBeDefined();
    expect(blob.type).toBe("application/vnd.oasis.opendocument.text");

    // Convert blob to buffer to check content

    // const buffer = await blob.arrayBuffer();

    const buffer = Buffer.from(await new Response(blob).arrayBuffer());
    const zip = new AdmZip(buffer);

    const entries = zip.getEntries();
    console.log(entries);
    const contentXml = zip.getEntry("content.xml")?.getData().toString();
    const manifestXml = zip
      .getEntry("META-INF/manifest.xml")
      ?.getData()
      .toString();

    expect(contentXml).toContain("office:document-content");
    expect(contentXml).toContain("office:body");
    expect(contentXml).toContain("office:text");
    expect(manifestXml).toContain("manifest:manifest");
  });
});
