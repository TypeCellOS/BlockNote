import dynamic from "next/dynamic";
import NextLink from "next/link";
import { useRouter } from "next/router";
import { useConfig, useTheme, type DocsThemeConfig } from "nextra-theme-docs";
import { useEffect, useState } from "react";
// import { ExtraContent } from "./components/ExtraContent";
// import { Footer } from "./components/Footer";
// import { HeaderLogo } from "./components/HeaderLogo";
// import { Main } from "./components/Main";
import { DiscordIcon, GitHubIcon } from "nextra/icons";
import { AuthNavButton } from "./components/AuthNavButton";
import { Footer } from "./components/Footer";
import { Logo } from "./components/Logo";
import { Navigation } from "./components/Navigation";
import { ProBadge } from "./components/example/ProBadge";
import { proExamplesList } from "./components/example/proExamplesList";
// import { Search } from "./components/Search";

// const NoSSRCommentsButton = dynamic(
//   () => import("./components/CommentsButton").then((mod) => mod.CommentsButton),
//   {
//     ssr: false,
//   }
// );

const CTA = dynamic(
  () => import("@/components/pages/landing/shared/CTAButton"),
  {
    ssr: false,
  },
);

const SITE_ROOT = "https://www.blocknotejs.org";

const METADATA_DEFAULT = {
  title: "BlockNote",
  description:
    "A beautiful text editor that just works. Easily add an editor to your app that users will love. Customize it with your own functionality like custom blocks or AI tooling.",
  image: SITE_ROOT + "/api/og",
};

interface Frontmatter {
  title: string;
  overrideTitle: string;
  description: string;
  imageTitle: string;
}

const config: DocsThemeConfig = {
  sidebar: {
    defaultMenuCollapseLevel: 1,
    toggleButton: false,
    titleComponent({ title, type }) {
      if (type === "doc") {
        return (
          <span>
            {title}
            {proExamplesList.includes(title) && <ProBadge />}
          </span>
        );
      }
      if (title === "About") {
        return <>❓ {title}</>;
      }
      return <>👉 {title}</>;
    },
  },
  docsRepositoryBase: "https://github.com/TypeCellOS/BlockNote/blob/main/docs",
  useNextSeoProps: function SEO() {
    const router = useRouter();
    const { systemTheme = "dark" } = useTheme();
    const nextraConfig = useConfig();

    const fullUrl =
      router.asPath === "/" ? SITE_ROOT : `${SITE_ROOT}${router.asPath}`;

    const frontMatter = nextraConfig.frontMatter as Frontmatter;

    // const defaultTitle = frontMatter.overrideTitle || "BlockNote";
    {
      /* <meta content={ogUrl} property="twitter:title" />
        <meta content={ogUrl} property="twitter:description" />
        <meta content={ogUrl} property="twitter:image" /> */
    }
    // console.log(nextraConfig.title, frontMatter.overrideTitle);

    const title = frontMatter.overrideTitle
      ? frontMatter.overrideTitle
      : nextraConfig.title
        ? nextraConfig.title + " - BlockNote"
        : "BlockNote";

    const imageUrl = frontMatter.imageTitle
      ? `${SITE_ROOT}/api/og?title=${encodeURIComponent(
          frontMatter.imageTitle,
        )}`
      : METADATA_DEFAULT.image;

    return {
      description: frontMatter.description,
      title,
      // defaultTitle,
      // titleTemplate: "%s – BlockNote",
      canonical: fullUrl,
      twitter: {
        handle: "@TypeCellOS",
        site: "@TypeCellOS",
        cardType: "summary_large_image",
      },
      openGraph: {
        type: "website",
        url: fullUrl,
        title,
        description: frontMatter.description,
        images: [
          {
            url: imageUrl,
          },
        ],
        siteName: "BlockNote",
        locale: "en_US",
      },
      additionalMetaTags: [
        {
          property: "twitter:title",
          content: title,
        },
        {
          property: "twitter:description",
          content: frontMatter.description,
        },
        {
          property: "twitter:image",
          content: imageUrl,
        },
        {
          name: "viewport",
          content: "width=device-width, initial-scale=1.0",
        },
      ],
      additionalLinkTags: [
        {
          as: "document",
          href: "/docs",
          rel: "prefetch",
        },
        {
          rel: "icon",
          href: `/img/logos/icon_light_400.png`,
          type: "image/png",
        },
        {
          rel: "icon",
          href: `/img/logos/icon_light_400.svg`,
          type: "image/svg",
        },
      ],
    };
  },
  gitTimestamp({ timestamp }) {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- Following Nextra docs: https://nextra.site/docs/docs-theme/theme-configuration#last-updated-date
    const [dateString, setDateString] = useState(timestamp.toISOString());

    // eslint-disable-next-line react-hooks/rules-of-hooks -- Following Nextra docs: https://nextra.site/docs/docs-theme/theme-configuration#last-updated-date
    useEffect(() => {
      try {
        setDateString(
          timestamp.toLocaleDateString(navigator.language, {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        );
      } catch (e) {
        // Ignore errors here; they get the ISO string.
        // At least one person out there has manually misconfigured navigator.language.
      }
    }, [timestamp]);

    return <>Last updated on {dateString}</>;
  },
  toc: {
    float: true,
    backToTop: true,
    // extraContent: ExtraContent,
  },
  // font: false,
  // logo: HeaderLogo, TODO
  logo: Logo,
  logoLink: false,
  head: function Head() {
    // const router = useRouter();
    // const { systemTheme = "dark" } = useTheme();
    // const nextraConfig = useConfig();

    // const frontMatter = nextraConfig.frontMatter as Frontmatter;
    // const fullUrl =
    //   router.asPath === "/" ? SITE_ROOT : `${SITE_ROOT}${router.asPath}`;

    // const asPath = router.asPath;

    return <></>;
  },
  i18n: [],
  editLink: {
    text: "Edit this page on GitHub",
  },
  navbar: {
    component: Navigation,
    extraContent: () => {
      return (
        <>
          <NextLink
            href="https://github.com/TypeCellOS/BlockNote"
            className="generic-hover">
            <span className="sr-only">GitHub</span>
            <GitHubIcon />
          </NextLink>
          <NextLink
            href="https://discord.gg/Qc2QTTH5dF"
            className="generic-hover">
            <span className="sr-only">Discord</span>
            <DiscordIcon />
          </NextLink>
          {/* <NextLink href="/pro">
            <CTA href={"/pro"} variant={"small"}>
              Sign in
            </CTA>
          </NextLink> */}
          <AuthNavButton />
        </>
      );
    },
    //   extraContent: (): JSX.Element => {
    //     // eslint-disable-next-line react-hooks/rules-of-hooks -- Nextra does not infer the type of extraContent correctly.
    //     const router = useRouter();

    //     return (
    //       <>
    //         {/* {pathHasToolbar(router) ? (
    //           <div className="w-6 h-6 ml-2 rounded-tl-none rounded-full border-2 border-white">
    //             <NoSSRCommentsButton />
    //           </div>
    //         ) : null} */}
    //         <Github />
    //         <Discord />
    //       </>
    //     );
    //   },
  },
  components: {
    //   pre: (props: ReactElement) => {
    //     function getTextContent(elem: ReactElement | string): string {
    //       if (elem instanceof Array) {
    //         return elem.map(getTextContent).join("");
    //       }
    //       if (!elem) {
    //         return "";
    //       }
    //       if (typeof elem === "string") {
    //         return elem;
    //       }
    //       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access -- `any` is technically correct here.
    //       const children = elem.props.children;
    //       if (children instanceof Array) {
    //         return children.map(getTextContent).join("");
    //       }
    //       return getTextContent(children as ReactElement | string);
    //     }
    //     // Taken from original Nextra docs theme.
    //     // Only functional change is adding `data-pagefind-weight`.
    //     return (
    //       <div className="relative mt-6" id="custom-code-block">
    //         <pre
    //           className="nx-bg-primary-700/5 nx-mb-4 nx-overflow-x-auto nx-rounded-xl nx-subpixel-antialiased dark:nx-bg-primary-300/10 nx-text-[.9em] contrast-more:nx-border contrast-more:nx-border-primary-900/20 contrast-more:nx-contrast-150 contrast-more:dark:nx-border-primary-100/40 nx-py-4"
    //           {...props}
    //           data-pagefind-weight=".5"
    //         />
    //         <div className="nx-opacity-0 nx-transition [div:hover>&amp;]:nx-opacity-100 focus-within:nx-opacity-100 nx-flex nx-gap-1 nx-absolute nx-m-[11px] nx-right-0 nx-top-0">
    //           <button
    //             className="nextra-button nx-transition-all active:nx-opacity-50 nx-bg-primary-700/5 nx-border nx-border-black/5 nx-text-gray-600 hover:nx-text-gray-900 nx-rounded-md nx-p-1.5 dark:nx-bg-primary-300/10 dark:nx-border-white/10 dark:nx-text-gray-400 dark:hover:nx-text-gray-50 md:nx-hidden"
    //             title="Toggle word wrap"
    //             type="button"
    //           >
    //             <svg
    //               className="nx-pointer-events-none nx-h-4 nx-w-4"
    //               height="24"
    //               viewBox="0 0 24 24"
    //               width="24"
    //             >
    //               <path
    //                 d="M4 19h6v-2H4v2zM20 5H4v2h16V5zm-3 6H4v2h13.25c1.1 0 2 .9 2 2s-.9 2-2 2H15v-2l-3 3l3 3v-2h2c2.21 0 4-1.79 4-4s-1.79-4-4-4z"
    //                 fill="currentColor"
    //               />
    //             </svg>
    //           </button>
    //           <button
    //             className="nextra-button nx-transition-all active:nx-opacity-50 nx-bg-primary-700/5 nx-border nx-border-black/5 nx-text-gray-600 hover:nx-text-gray-900 nx-rounded-md nx-p-1.5 dark:nx-bg-primary-300/10 dark:nx-border-white/10 dark:nx-text-gray-400 dark:hover:nx-text-gray-50"
    //             onClick={() => {
    //               void navigator.clipboard.writeText(
    //                 // @ts-expect-error -- `any` is technically correct here.
    //                 // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access -- `any` is technically correct here.
    //                 getTextContent(props.children.props.children)
    //               );
    //             }}
    //             tabIndex={0}
    //             title="Copy code"
    //             type="button"
    //           >
    //             <svg
    //               className="nextra-copy-icon nx-pointer-events-none nx-h-4 nx-w-4"
    //               fill="none"
    //               height="24"
    //               stroke="currentColor"
    //               viewBox="0 0 24 24"
    //               width="24"
    //               xmlns="http://www.w3.org/2000/svg"
    //             >
    //               <rect
    //                 height="13"
    //                 rx="2"
    //                 strokeLinecap="round"
    //                 strokeLinejoin="round"
    //                 strokeWidth="2"
    //                 width="13"
    //                 x="9"
    //                 y="9"
    //               />
    //               <path
    //                 d="M5 15H4C2.89543 15 2 14.1046 2 13V4C2 2.89543 2.89543 2 4 2H13C14.1046 2 15 2.89543 15 4V5"
    //                 strokeLinecap="round"
    //                 strokeLinejoin="round"
    //                 strokeWidth="2"
    //               />
    //             </svg>
    //           </button>
    //         </div>
    //       </div>
    //     );
    //   },
    // },
  },
  // main: (props) => <div>sdfdf </div>,
  search: {
    // component: Search,
    placeholder: "Search documentation…",
  },
  footer: {
    component: Footer,
  },
  nextThemes: {
    // defaultTheme: "dark",
  },
};

export default config;
