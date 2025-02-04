import { ReactNode } from "react";
import { BlockTypeSelectItem } from "./DefaultSelects/BlockTypeSelect.js";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";
export declare const getFormattingToolbarItems: (blockTypeSelectItems?: BlockTypeSelectItem[]) => JSX.Element[];
/**
 * By default, the FormattingToolbar component will render with default
 * selects/buttons. However, you can override the selects/buttons to render
 * by passing children. The children you pass should be:
 *
 * - Default selects: Components found within the `/DefaultSelects` directory.
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom selects: The `ToolbarSelect` component in the
 * `components/mantine-shared/Toolbar` directory.
 * - Custom buttons: The `ToolbarButton` component in the
 * `components/mantine-shared/Toolbar` directory.
 */
export declare const FormattingToolbar: (props: FormattingToolbarProps & {
    children?: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
