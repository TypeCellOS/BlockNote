// Defines a single prop spec, which includes the default value the prop should
// take and possible values it can take.
export type PropSpec<PType extends boolean | number | string> =
  | {
      values?: readonly PType[];
      default: PType;
    }
  | {
      values?: readonly PType[];
      type: "string" | "number" | "boolean";
      optional: true;
    };

// Defines multiple block prop specs. The key of each prop is the name of the
// prop, while the value is a corresponding prop spec. This should be included
// in a block config or schema. From a prop schema, we can derive both the props'
// internal implementation (as TipTap node attributes) and the type information
// for the external API.
export type PropSchema = Record<string, PropSpec<boolean | number | string>>;

// Defines Props objects for use in Block objects in the external API. Converts
// each prop spec into a union type of its possible values, or a string if no
// values are specified.
export type Props<PSchema extends PropSchema> = {
  // for required props, get type from type of "default" value,
  // and if values are specified, get type from values
  [PName in keyof PSchema]: (
    PSchema[PName] extends { default: boolean } | { type: "boolean" }
      ? PSchema[PName]["values"] extends readonly boolean[]
        ? PSchema[PName]["values"][number]
        : boolean
      : PSchema[PName] extends { default: number } | { type: "number" }
      ? PSchema[PName]["values"] extends readonly number[]
        ? PSchema[PName]["values"][number]
        : number
      : PSchema[PName] extends { default: string } | { type: "string" }
      ? PSchema[PName]["values"] extends readonly string[]
        ? PSchema[PName]["values"][number]
        : string
      : never
  ) extends infer T
    ? PSchema[PName] extends { optional: true }
      ? T | undefined
      : T
    : never;
};
