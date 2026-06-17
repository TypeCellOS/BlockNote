/**
 * Compatible replacement for `IconType` from react-icons.
 * Defined locally so consumers don't need react-icons installed for
 * type-checking.
 */
export type IconType = (
  props: React.SVGAttributes<SVGElement> & {
    size?: string | number;
    color?: string;
    title?: string;
  },
) => React.ReactNode;
