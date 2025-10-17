import * as z from "zod/v4/core";

// TODO: maybe remove file

// PropSchema is now a Zod object schema (using mini types for type constraints)
export type PropSchema = z.$ZodObject;

// Props type is derived from the Zod schema output
// TODO: z.infer or z.output?
export type Props<PSchema extends PropSchema> = z.infer<PSchema>;
