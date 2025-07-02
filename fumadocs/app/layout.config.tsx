import { AuthNavButton } from "@/components/AuthNavButton";
import ThemedImage from "@/components/ThemedImage";
import LogoLight from "@/public/img/logos/banner.svg";
import LogoDark from "@/public/img/logos/banner.dark.svg";
import type { DocsLayoutProps } from "fumadocs-ui/layouts/notebook";
import { FaBook, FaCode, FaDiscord, FaGithub } from "react-icons/fa";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: Partial<DocsLayoutProps> = {
  themeSwitch: {
    enabled: false,
  },
  tabMode: "sidebar",
  nav: {
    mode: "top",
    title: (
      <ThemedImage
        src={{ light: LogoLight, dark: LogoDark }}
        alt="BlockNote"
        className="w-40"
      />
    ),
  },
  links: [
    // {
    //   type: "menu",
    //   icon: <FaUser />,
    //   text: "Profile",
    //   items: [
    //     {
    //       text: "Getting Started",
    //       description: "Learn to use Fumadocs",
    //       url: "/docs",
    //     },
    //   ],
    // },
    {
      text: "Docs",
      url: "/docs",
      active: "nested-url",
    },
    {
      text: "AI",
      url: "/docs/ai",
      active: "nested-url",
    },
    {
      text: "Examples",
      url: "/examples",
      active: "nested-url",
    },
    {
      text: "Pricing",
      url: "/pricing",
      active: "url",
    },
    {
      text: "About",
      url: "/pages/about",
      active: "url",
    },
    {
      type: "icon",
      icon: <FaDiscord />,
      text: "Discord",
      url: "https://discord.gg/Qc2QTTH5dF",
    },
    {
      type: "icon",
      icon: <FaGithub />,
      text: "GitHub",
      url: "https://github.com/TypeCellOS/BlockNote",
    },

    {
      type: "custom",
      // only displayed on navbar, not mobile menu
      on: "nav",
      children: <AuthNavButton />,
    },
  ],
  sidebar: {
    // footer: <div>THIS IS A FOOTER</div>,
    tabs: [
      {
        icon: (
          <FaBook
            className="h-8 w-8 rounded-md p-2 ring-2"
            style={{
              color: "var(--ui-color, var(--color-fd-foreground))",
              borderColor:
                "color-mix(in oklab, var(--ui-color, var(--color-fd-foreground)) 50%, transparent)",
              // @ts-ignore
              "--tw-ring-color":
                "color-mix(in oklab, var(--ui-color, var(--color-fd-foreground)) 20%, transparent)",
            }}
          />
        ),
        title: "Documentation",
        description: "Learn how to use BlockNote",
        url: "/docs",
      },
      {
        icon: (
          <FaCode
            className="h-8 w-8 rounded-md p-2 ring-2"
            style={{
              color: "var(--ui-color, var(--color-fd-foreground))",
              borderColor:
                "color-mix(in oklab, var(--ui-color, var(--color-fd-foreground)) 50%, transparent)",
              // @ts-ignore
              "--tw-ring-color":
                "color-mix(in oklab, var(--ui-color, var(--color-fd-foreground)) 20%, transparent)",
            }}
          />
        ),
        title: "Examples",
        description: "See BlockNote in action",
        url: "/examples",
      },
    ],
  },
};
