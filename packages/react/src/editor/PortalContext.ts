import { createContext } from "react";

/**
 * Context to override the portal root of dropdowns/popovers in `ComponentsContext`. If not present
 * or left undefined, the default render location of the dropdown/popover will be used, which is
 * library-specific.
 */
export const PortalContext = createContext<HTMLElement | null>(null);
