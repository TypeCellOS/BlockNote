import * as z from "zod/v4/core";

export type PropSchema<Output = any, Input = any> = {
  // might not be needed, but otherwise it will say Output unused
  _output: Output;
  // might not be needed,  but otherwise it will say Input unused
  _input: Input;
  // We keep access to zod source, but typed as generic z.$ZodObject
  // This makes sure downstream consumers only have the extracted Output / Input types,
  // and reduces load on typescript compiler by not having to parse the zod source on every use
  _zodSource: z.$ZodObject;
};

// Props type is derived from the Zod schema output
export type Props<PSchema extends PropSchema<any, any>> =
  PSchema extends PropSchema<infer O, any> ? O : never;

// We infer Output/Input from the provided schema using z.output / z.input
export function createPropSchemaFromZod<S extends z.$ZodObject>(schema: S) {
  return {
    _output: undefined as any,
    _input: undefined as any,
    _zodSource: schema,
  } as PropSchema<z.output<S>, z.input<S>>;
}

export type PropSchemaFromZod<S extends z.$ZodObject> = PropSchema<
  z.output<S>,
  z.input<S>
>;
