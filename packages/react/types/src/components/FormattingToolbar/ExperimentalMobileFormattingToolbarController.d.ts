import { UseFloatingOptions } from "@floating-ui/react";
import { FC } from "react";
import { FormattingToolbarProps } from "./FormattingToolbarProps.js";
/**
 * Experimental formatting toolbar controller for mobile devices.
 * Uses Visual Viewport API to position the toolbar above the virtual keyboard.
 *
 * Currently marked experimental due to the flickering issue with positioning cause by the use of the API (and likely a delay in its updates).
 */
export declare const ExperimentalMobileFormattingToolbarController: (props: {
    formattingToolbar?: FC<FormattingToolbarProps>;
    floatingOptions?: Partial<UseFloatingOptions>;
}) => import("react/jsx-runtime").JSX.Element | null;
