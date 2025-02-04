import type { SimpleJSONObjectSchema } from "../util/JSONSchema.js";
/**
 * Merges schemas that only differ by the "type" field.
 * @param schemas The array of schema objects to be processed.
 * @returns A new array with merged schema objects where applicable.
 */
export declare function mergeSchemas(schemas: SimpleJSONObjectSchema[]): SimpleJSONObjectSchema[];
