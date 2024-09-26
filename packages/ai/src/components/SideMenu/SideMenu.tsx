import {
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
} from "@blocknote/core";
import { ReactNode, useMemo } from "react";
import { SideMenu as SideMenuCore, SideMenuProps } from "@blocknote/react";

export const SideMenu = <
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(
  props: SideMenuProps<BSchema, I, S> & { children?: ReactNode }
) => {
  const { children, ...rest } = props;

  const dataAttributes = useMemo(() => {
    const attrs: Record<string, string> = {};

    if (props.block.type === "ai" && props.block.props.prompt) {
      attrs["data-prompt"] = props.block.props.prompt.toString();
    }

    return attrs;
  }, [props.block]);

  return (
    <SideMenuCore {...rest} {...dataAttributes}>
      {children}
    </SideMenuCore>
  );
};
