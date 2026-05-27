/**
 * Compatible replacement for `IconType` from react-icons.
 * Defined locally so consumers don't need react-icons installed for
 * type-checking.
 */
export type IconType = React.ComponentType<
  React.SVGAttributes<SVGElement> & {
    size?: string | number;
    color?: string;
    title?: string;
  }
>;
