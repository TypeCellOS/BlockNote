import {
  BlockNoteSchema,
  BlockSchema,
  InlineContentSchema,
  PropSchema,
  StyleSchema,
  defaultProps,
} from "@blocknote/core";
import { SimpleJSONObjectSchema } from "./JSONSchema.js";
import { mergeSchemas } from "./mergeSchema.js";
/*
{
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "array",
    "items": {
      "type": "object",
      "properties": {
        "id": {
          "type": "string",
          "format": "uuid"
        },
        "type": {
          "type": "string",
          "enum": ["paragraph", "heading"]
        },
        "props": {
          "type": "object",
          "properties": {
            "textColor": {
              "type": "string",
              "enum": ["default"]
            },
            "backgroundColor": {
              "type": "string",
              "enum": ["default"]
            },
            "textAlignment": {
              "type": "string",
              "enum": ["left"]
            },
            "level": {
              "type": "integer",
              "minimum": 1,
              "maximum": 6
            }
          },
          "required": ["textColor", "backgroundColor", "textAlignment"],
          "additionalProperties": false
        },
        "content": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": {
                "type": "string",
                "enum": ["text"]
              },
              "text": {
                "type": "string"
              },
              "styles": {
                "type": "object",
                "properties": {
                  "bold": {
                    "type": "boolean"
                  },
                  "italic": {
                    "type": "boolean"
                  }
                },
                "additionalProperties": false
              }
            },
            "required": ["type", "text"],
            "additionalProperties": false
          }
        }
      },
      "required": ["id", "type", "props", "content"],
      "additionalProperties": false
    }
  }*/

function styleSchemaToJSONSchema(schema: StyleSchema): SimpleJSONObjectSchema {
  return {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(schema).map(([key, val]) => {
        return [
          key,
          {
            type: val.propSchema,
          },
        ];
      }),
    ),
    additionalProperties: false,
  };
}

function styledTextToJSONSchema() {
  return {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["text"],
      },
      text: {
        type: "string",
      },
      styles: {
        $ref: "#/$defs/styles",
      },
    },
    additionalProperties: false,
    required: ["type", "text"],
  };
}

export function propSchemaToJSONSchema(
  propSchema: PropSchema,
): SimpleJSONObjectSchema {
  return {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(propSchema)
        .filter(([_key, val]) => {
          // for now skip optional props
          return val.default !== undefined;
          //&& key !== "language";
        })
        .map(([key, val]) => {
          return [
            key,
            {
              type: typeof val.default,
              enum: val.values,
            },
          ];
        }),
    ),
    additionalProperties: false,
  };
}

function inlineContentSchemaToJSONSchema(schema: InlineContentSchema) {
  return {
    type: "array",
    items: {
      anyOf: Object.entries(schema).map(([_key, val]) => {
        if (val === "text") {
          return {
            $ref: "#/$defs/styledtext",
          };
        }
        if (val === "link") {
          return {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["link"],
              },
              content: {
                type: "array",
                items: {
                  $ref: "#/$defs/styledtext",
                },
              },
              href: {
                type: "string",
              },
            },
            additionalProperties: false,
            required: ["type", "href", "content"],
          };
        }
        return {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [val.type],
            },
            content:
              val.content === "styled"
                ? {
                    type: "array",
                    items: {
                      $ref: "#/$defs/styledtext",
                    },
                  }
                : undefined,
            props: propSchemaToJSONSchema(val.propSchema),
          },
          additionalProperties: false,
          required: ["type", ...(val.content === "styled" ? ["content"] : [])],
        };
      }),
    },
  };
}

function blockSchemaToJSONSchema(schema: BlockSchema) {
  return {
    anyOf: mergeSchemas(
      Object.entries(schema).map(([_key, val]) => {
        return {
          type: "object",
          properties: {
            type: {
              type: "string",
              enum: [val.type],
            },
            content:
              val.content === "inline"
                ? { $ref: "#/$defs/inlinecontent" }
                : val.content === "table"
                  ? { type: "object", properties: {} } // TODO
                  : undefined,
            // filter out default props (TODO: make option)
            props: propSchemaToJSONSchema(val.propSchema),
            // Object.fromEntries(
            //   Object.entries(val.propSchema).filter(
            //     (key) => typeof (defaultProps as any)[key[0]] === "undefined"
            //   )
            // )
            // ),
          },
          additionalProperties: false,
          required: ["type"], //, ...(val.content === "inline" ? ["content"] : [])],
        };
      }),
    ),
  };
}

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

function schemaOps(
  schema: Pick<
    BlockNoteSchema<BlockSchema, InlineContentSchema, StyleSchema>,
    "blockSchema" | "inlineContentSchema" | "styleSchema"
  >,
) {
  const clone: Writeable<typeof schema> = JSON.parse(
    JSON.stringify({
      blockSchema: schema.blockSchema,
      inlineContentSchema: schema.inlineContentSchema,
      styleSchema: schema.styleSchema,
    }),
  );
  return {
    removeFileBlocks() {
      clone.blockSchema = Object.fromEntries(
        Object.entries(clone.blockSchema).filter(
          ([_key, val]) => !val.isFileBlock,
        ),
      );
      return this;
    },
    removeDefaultProps() {
      clone.blockSchema = Object.fromEntries(
        Object.entries(clone.blockSchema).map(([key, val]) => {
          return [
            key,
            {
              ...val,
              propSchema: Object.fromEntries(
                Object.entries(val.propSchema).filter(
                  (key) => typeof (defaultProps as any)[key[0]] === "undefined",
                ),
              ) as any,
            },
          ];
        }),
      );
      return this;
    },

    get() {
      return clone;
    },
  };
}

export function blockNoteSchemaToJSONSchema(
  schema: Pick<
    BlockNoteSchema<BlockSchema, InlineContentSchema, StyleSchema>,
    "blockSchema" | "inlineContentSchema" | "styleSchema"
  >,
) {
  schema = schemaOps(schema).removeFileBlocks().removeDefaultProps().get();
  return {
    $defs: {
      styles: styleSchemaToJSONSchema(schema.styleSchema),
      styledtext: styledTextToJSONSchema(),
      inlinecontent: inlineContentSchemaToJSONSchema(
        schema.inlineContentSchema,
      ),
      block: blockSchemaToJSONSchema(schema.blockSchema),
    },
  };
}
