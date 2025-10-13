import {
  BlockNoteSchema,
  BlockSchema,
  InlineContentSchema,
  PropSchema,
  StyleSchema,
  defaultProps,
} from "@blocknote/core";
import * as z4 from "zod/v4";
import * as z from "zod/v4/core";
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
  // FIXME: we can use something like zod-to-json-schema to generate this
  // (for now this code is not used by default, only in experimental JSON mode)
  return {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(propSchema._zod.def.shape)
        .filter(([_key, val]) => {
          // for now skip optional props
          return !(val instanceof z.$ZodOptional);
          //&& key !== "language";
        })
        .map(([key, val]) => {
          const v = val instanceof z.$ZodDefault ? val._zod.def.innerType : val;

          // hardcoded for now (see note above to migrate to zod-to-json-schema)
          if (v instanceof z.$ZodUnion) {
            let type = "object";
            // [0] assumes all options have the same type
            if (v._zod.def.options[0] instanceof z.$ZodLiteral) {
              type = typeof v._zod.def.options[0]._zod.def.values[0];
            }
            return [
              key,
              {
                type,
                enum: v._zod.def.options.flatMap((v) =>
                  v instanceof z.$ZodLiteral ? v._zod.def.values : undefined,
                ),
              },
            ];
          }

          return [
            key,
            {
              type: v._zod.def.type,
              enum: undefined,
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

function schemaOps(
  schema: BlockNoteSchema<BlockSchema, InlineContentSchema, StyleSchema>,
) {
  const clone = {
    blockSchema: schema.blockSchema,
    inlineContentSchema: schema.inlineContentSchema,
    styleSchema: schema.styleSchema,
  };

  return {
    // TODO
    removeFileBlocks() {
      clone.blockSchema = Object.fromEntries(
        Object.entries(clone.blockSchema).filter(
          ([_key, val]) =>
            !schema.blockSpecs[val.type].implementation.meta?.fileBlockAccept,
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
              propSchema: z4.object(
                Object.fromEntries(
                  Object.entries(val.propSchema._zod.def.shape).filter(
                    ([key]) => !(key in defaultProps._zod.def.shape),
                  ),
                ),
              ),
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
  schema: BlockNoteSchema<any, any, any>,
) {
  schema = schemaOps(schema)
    .removeFileBlocks()
    .removeDefaultProps()
    .get() as BlockNoteSchema<BlockSchema, InlineContentSchema, StyleSchema>;
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
