// Defines a single prop spec, which includes the default value the prop should
// take and possible values it can take.
export type PropSpec<PType extends boolean | number | string> = {
  values?: readonly PType[];
  default: PType;
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
  [PName in keyof PSchema]: PSchema[PName]["default"] extends boolean
    ? PSchema[PName]["values"] extends readonly boolean[]
      ? PSchema[PName]["values"][number]
      : boolean
    : PSchema[PName]["default"] extends number
    ? PSchema[PName]["values"] extends readonly number[]
      ? PSchema[PName]["values"][number]
      : number
    : PSchema[PName]["default"] extends string
    ? PSchema[PName]["values"] extends readonly string[]
      ? PSchema[PName]["values"][number]
      : string
    : never;
};
