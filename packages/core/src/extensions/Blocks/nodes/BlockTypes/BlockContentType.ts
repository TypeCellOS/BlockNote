export type BlockContent<
  Name extends string,
  Attrs extends Record<string, string>
> = {
  name: Name;
  attrs?: Attrs;
};
