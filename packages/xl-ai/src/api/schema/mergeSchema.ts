import type { SimpleJSONObjectSchema } from "./JSONSchema.js";

/**
 * Merges schemas that only differ by the "type" field.
 * @param schemas The array of schema objects to be processed.
 * @returns A new array with merged schema objects where applicable.
 */
export function mergeSchemas(
  schemas: SimpleJSONObjectSchema[],
): SimpleJSONObjectSchema[] {
  const groupedSchemas: { [signature: string]: string[] } = {};
  const signatureToSchema: { [signature: string]: SimpleJSONObjectSchema } = {};

  schemas.forEach((schemaObj) => {
    // Extract the schema properties except for the "type" field
    const { type, ...rest } = schemaObj.properties;
    const schemaSignature = JSON.stringify(rest); // Generate a signature for comparison

    // If the signature already exists, add the "type" to the enum
    if (groupedSchemas[schemaSignature]) {
      groupedSchemas[schemaSignature].push(type.enum[0]);
    } else {
      // Create a new group if it doesn't exist
      groupedSchemas[schemaSignature] = [type.enum[0]];
      signatureToSchema[schemaSignature] = schemaObj;
    }
  });

  // Create the new merged schema array
  const mergedSchemas: SimpleJSONObjectSchema[] = Object.keys(
    groupedSchemas,
  ).map((signature) => {
    const baseSchema = signatureToSchema[signature];
    return {
      ...baseSchema,
      properties: {
        ...baseSchema.properties,
        type: {
          type: "string",
          enum: groupedSchemas[signature],
        },
      },
    };
  });

  return mergedSchemas;
}

// // Example usage:
// const exampleSchemas: Schema[] = [
//   {
//     type: "object",
//     properties: {
//       type: { type: "string", enum: ["paragraph"] },
//       content: { $ref: "#/$defs/inlinecontent" },
//       props: {
//         type: "object",
//         properties: {
//           backgroundColor: { type: "string" },
//           textColor: { type: "string" },
//           textAlignment: {
//             type: "string",
//             enum: ["left", "center", "right", "justify"],
//           },
//         },
//         additionalProperties: false,
//       },
//     },
//     additionalProperties: false,
//     required: ["type"],
//   },
//   {
//     type: "object",
//     properties: {
//       type: { type: "string", enum: ["bulletListItem"] },
//       content: { $ref: "#/$defs/inlinecontent" },
//       props: {
//         type: "object",
//         properties: {
//           backgroundColor: { type: "string" },
//           textColor: { type: "string" },
//           textAlignment: {
//             type: "string",
//             enum: ["left", "center", "right", "justify"],
//           },
//         },
//         additionalProperties: false,
//       },
//     },
//     additionalProperties: false,
//     required: ["type"],
//   },
//   {
//     type: "object",
//     properties: {
//       type: { type: "string", enum: ["heading"] },
//       content: { $ref: "#/$defs/inlinecontent" },
//       props: {
//         type: "object",
//         properties: {
//           backgroundColor: { type: "string" },
//           textColor: { type: "string" },
//           textAlignment: {
//             type: "string",
//             enum: ["left", "center", "right", "justify"],
//           },
//           level: {
//             type: "number",
//             enum: [1, 2, 3],
//           },
//         },
//         additionalProperties: false,
//       },
//     },
//     additionalProperties: false,
//     required: ["type"],
//   },
// ];

// const mergedSchemas = mergeSchemas(exampleSchemas);
// console.log(JSON.stringify(mergedSchemas, null, 2));
