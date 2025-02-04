import { ReactNode } from "react";
import { LinkToolbarProps } from "./LinkToolbarProps.js";
/**
 * By default, the LinkToolbar component will render with default buttons.
 * However, you can override the selects/buttons to render by passing
 * children. The children you pass should be:
 *
 * - Default buttons: Components found within the `/DefaultButtons` directory.
 * - Custom selects: The `ToolbarSelect` component in the
 * `components/mantine-shared/Toolbar` directory.
 * - Custom buttons: The `ToolbarButton` component in the
 * `components/mantine-shared/Toolbar` directory.
 */
export declare const LinkToolbar: (props: LinkToolbarProps & {
    children?: ReactNode;
}) => import("react/jsx-runtime").JSX.Element;
