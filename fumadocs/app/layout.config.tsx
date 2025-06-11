import { AuthNavButton } from "@/components/AuthNavButton";
import { ThemedImage } from "@/components/ThemedImage";
import type { DocsLayoutProps } from "fumadocs-ui/layouts/notebook";
import { FaBook, FaCode, FaDiscord, FaGithub, FaUser } from "react-icons/fa";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export const baseOptions: Partial<DocsLayoutProps> = {
  nav: {
    title: (
      <>
        <ThemedImage
          height={32}
          width={170}
          src="/img/logos/banner.svg"
          darkImage={"/img/logos/banner.dark.svg"}
          alt="BlockNote"
        />
      </>
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
      url: "/about",
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
