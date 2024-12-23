// The PropSpec specifies the type of a prop and possibly a default value.
// Note that props are always optional when used as "input"
// (i.e., when creating a PartialBlock, for example by calling `insertBlocks({...})`)
//
// However, internally they're always set to `default`, unless a prop is marked optional
//
// At some point we should migrate this to zod or effect-schema
export type PropSpec<PType extends boolean | number | string> =
  | {
      // We infer the type of the prop from the default value
      default: PType;
      // a list of possible values, for example for a string prop (this will then be used as a string union type)
      values?: readonly PType[];
    }
  | {
      default: undefined;
      // Because there is no default value (for an optional prop, the default value is undefined),
      // we need to specify the type of the prop manually (we can't infer it from the default value)
      type: "string" | "number" | "boolean";
      values?: readonly PType[];
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
