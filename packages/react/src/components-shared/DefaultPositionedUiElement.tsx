import {
  BlockNoteEditor,
  BlockSchema,
  DefaultBlockSchema,
  DefaultInlineContentSchema,
  DefaultStyleSchema,
  InlineContentSchema,
  StyleSchema,
  UiElementPosition,
} from "@blocknote/core";
import { flip, offset, UseFloatingOptions } from "@floating-ui/react";
import { FC } from "react";
import { useUiElement } from "../hooks/useUiElement";
import { useUiElementPosition } from "../hooks/useUiElementPosition";

export const DefaultPositionedUiElement = <
  State extends UiElementPosition,
  BSchema extends BlockSchema = DefaultBlockSchema,
  I extends InlineContentSchema = DefaultInlineContentSchema,
  S extends StyleSchema = DefaultStyleSchema
>(props: {
  editor: BlockNoteEditor<BSchema, I, S>;
  onUpdate: (callback: (state: State) => void) => void;
  zIndex: number;
  options?: Partial<UseFloatingOptions>;
  component: FC<
    { editor: BlockNoteEditor<BSchema, I, S> } & Omit<
      State,
      keyof UiElementPosition
    >
  >;
}) => {
  const state = useUiElement(props.onUpdate);
  const { isMounted, ref, style } = useUiElementPosition(
    state?.show || false,
    state?.referencePos || null,
    5000,
    {
      placement: "bottom",
      middleware: [offset(10), flip()],
    }
  );

  if (!isMounted || !state) {
    return null;
  }

  const { show, referencePos, ...rest } = state;

  const Component = props.component;

  return (
    <div ref={ref} style={style}>
      <Component editor={props.editor} {...rest} />
    </div>
  );
};
