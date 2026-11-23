import { BlockNoteSchema } from "../../blocks/BlockNoteSchema.js";
import { defaultBlockSpecs } from "../../blocks/defaultBlocks.js";

type WithMetadata<T> = T & {
  config: { propSchema: { metadata: { default: string } } };
};

export function withMetadata<
  T extends { config: { propSchema: Record<string, unknown> } },
>(spec: T): WithMetadata<T> {
  return {
    ...spec,
    config: {
      ...spec.config,
      propSchema: {
        ...spec.config.propSchema,
        metadata: { default: "" },
      },
    },
  };
}

export function createExtendedSchema() {
  const blockSpecs = Object.fromEntries(
    Object.entries(defaultBlockSpecs).map(([key, spec]) => [
      key,
      withMetadata(spec),
    ]),
  ) as {
    [K in keyof typeof defaultBlockSpecs]: WithMetadata<
      (typeof defaultBlockSpecs)[K]
    >;
  };
  return BlockNoteSchema.create({ blockSpecs });
}
