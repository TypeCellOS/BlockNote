import { NextConfig } from "next";

export const redirects: NextConfig["redirects"] = () => [
  {
    source: "/docs/editor-api/converting-blocks",
    destination: "/docs/features/interoperability",
    permanent: true,
  },
  {
    source: "/docs/ai/setup",
    destination: "/docs/features/ai/getting-started",
    permanent: true,
  },
  {
    source: "/docs/advanced/ariakit",
    destination: "/docs/getting-started/ariakit",
    permanent: true,
  },
  {
    source: "/docs/advanced/shadcn",
    destination: "/docs/getting-started/shadcn",
    permanent: true,
  },
  {
    source: "/docs/advanced/paste-handling",
    destination: "/docs/features/interoperability",
    permanent: true,
  },
  {
    source: "/docs/ui-components/formatting-toolbar",
    destination: "/docs/react/components/formatting-toolbar",
    permanent: true,
  },
  {
    source: "/docs/ui-components/suggestion-menus",
    destination: "/docs/react/components/suggestion-menus",
    permanent: true,
  },
  {
    source: "/docs/ui-components/side-menu",
    destination: "/docs/react/components/side-menu",
    permanent: true,
  },
  {
    source: "/docs/ui-components/link-toolbar",
    destination: "/docs/react/components/link-toolbar",
    permanent: true,
  },
  {
    source: "/docs/custom-schemas/custom-blocks",
    destination: "/docs/features/custom-schemas/custom-blocks",
    permanent: true,
  },
  {
    source: "/docs/custom-schemas/custom-inline-content",
    destination: "/docs/features/custom-schemas/custom-inline-content",
    permanent: true,
  },
  {
    source: "/docs/custom-schemas/custom-styles",
    destination: "/docs/features/custom-schemas/custom-styles",
    permanent: true,
  },
  {
    source: "/docs/custom-schemas",
    destination: "/docs/features/custom-schemas",
    permanent: true,
  },
  {
    source: "/docs/editor-basics/document-structure",
    destination: "/docs/foundations/document-structure",
    permanent: true,
  },
  {
    source: "/docs/editor-basics/default-schema",
    destination: "/docs/foundations/schemas",
    permanent: true,
  },
  {
    source: "/docs/editor-api/manipulating-blocks",
    destination: "/docs/reference/editor/manipulating-content",
    permanent: true,
  },
  {
    source: "/docs/editor-api/manipulating-inline-content",
    destination: "/docs/reference/editor/manipulating-content",
    permanent: true,
  },
  {
    source: "/docs/editor-api/cursor-selections",
    destination: "/docs/reference/editor/cursor-selections",
    permanent: true,
  },
  {
    source: "/docs/advanced/code-blocks",
    destination: "/docs/features/blocks/code-blocks",
    permanent: true,
  },
  {
    source: "/docs/advanced/tables",
    destination: "/docs/features/blocks/tables",
    permanent: true,
  },
  {
    source: "/docs/ai/custom-commands",
    destination: "/docs/features/ai/custom-commands",
    permanent: true,
  },
  {
    source: "/docs/ai/getting-started",
    destination: "/docs/features/ai/getting-started",
    permanent: true,
  },
  {
    source: "/docs/ai/reference",
    destination: "/docs/features/ai/reference",
    permanent: true,
  },
  {
    source: "/docs/ai",
    destination: "/docs/features/ai",
    permanent: true,
  },
  {
    source: "/docs/styling-theming/overriding-css",
    destination: "/docs/react/styling-theming/overriding-css",
    permanent: true,
  },
  {
    source: "/docs/styling-theming/themes",
    destination: "/docs/react/styling-theming/themes",
    permanent: true,
  },
  {
    source: "/docs/styling-theming/adding-dom-attributes",
    destination: "/docs/react/styling-theming/adding-dom-attributes",
    permanent: true,
  },
  {
    source: "/docs/collaboration/real-time-collaboration",
    destination: "/docs/features/collaboration",
    permanent: true,
  },
  {
    source: "/docs/collaboration/comments",
    destination: "/docs/features/collaboration/comments",
    permanent: true,
  },
  {
    source: "/docs/editor-api/server-processing",
    destination: "/docs/features/server-processing",
    permanent: true,
  },
  { source: "/docs/introduction", destination: "/docs", permanent: true },
  {
    source: "/docs/quickstart",
    destination: "/docs/install",
    permanent: true,
  },
  {
    source: "/docs/editor",
    destination: "/docs/getting-started",
    permanent: true,
  },
  {
    source: "/docs/theming",
    destination: "/docs/react/styling-theming",
    permanent: true,
  },
  {
    source: "/docs/formatting-toolbar",
    destination: "/docs/react/components/formatting-toolbar",
    permanent: true,
  },
  {
    source: "/docs/slash-menu",
    destination: "/docs/react/components/suggestion-menus",
    permanent: true,
  },
  {
    source: "/docs/side-menu",
    destination: "/docs/react/components/side-menu",
    permanent: true,
  },
  {
    source: "/docs/ui-elements",
    destination: "/docs/react/components",
    permanent: true,
  },
  {
    source: "/docs/blocks",
    destination: "/docs/foundations/document-structure",
    permanent: true,
  },
  {
    source: "/docs/block-types",
    destination: "/docs/features/blocks",
    permanent: true,
  },
  {
    source: "/docs/editor-basics/setup",
    destination: "/docs/getting-started/editor-setup",
    permanent: true,
  },
  {
    source: "/docs/manipulating-blocks",
    destination: "/docs/reference/editor/manipulating-content",
    permanent: true,
  },
  {
    source: "/docs/inline-content",
    destination: "/docs/reference/editor/manipulating-content",
    permanent: true,
  },
  {
    source: "/docs/cursor-selections",
    destination: "/docs/reference/editor/cursor-selections",
    permanent: true,
  },
  {
    source: "/docs/converting-blocks",
    destination: "/docs/foundations/supported-formats",
    permanent: true,
  },
  {
    source: "/docs/real-time-collaboration",
    destination: "/docs/features/collaboration",
    permanent: true,
  },
  {
    source: "/docs/nextjs",
    destination: "/docs/getting-started/nextjs",
    permanent: true,
  },
  {
    source: "/docs/vanilla-js",
    destination: "/docs/getting-started/vanilla-js",
    permanent: true,
  },
  {
    source: "/docs/advanced/real-time-collaboration",
    destination: "/docs/features/collaboration",
    permanent: true,
  },
  {
    source: "/privacy-policy",
    destination: "/legal/privacy-policy",
    permanent: true,
  },
  {
    source: "/terms-and-conditions",
    destination: "/legal/terms-and-conditions",
    permanent: true,
  },
];
