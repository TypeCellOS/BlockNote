// Custom Docs Layout adapted from base fumadocs Docs Layout:
// https://github.com/fuma-nama/fumadocs/blob/dev/packages/ui/src/layouts/docs.tsx

// We customize the docs layout for 2 main reasons:
// 1. Navbar customization - The base Docs Layout can't have  a navbar at all,
// while the Notebook & Home Layout navbars are quite different. The custom
// layout allows us to use the Home Layout navbar for all pages.
// 2. Sidebar customization - We can now offset the sidebar from the side of
// the viewport, and have better control of its content for smaller viewports.
// This is useful as the bas Docs Layout e.g. moves navbar items to the side
// bar, and forces displaying a footer element even with no content.

// The Custom Docs Layout generally tries to ensure that the options from
// `layout.config.tsx` all still work, with the exception of items that are
// already in the navbar.

import type { PageTree } from "fumadocs-core/server";
import { type HTMLAttributes, type ReactNode, useMemo } from "react";
import { LuLanguages as Languages } from "react-icons/lu";
import { cn } from "fumadocs-ui/utils/cn";
import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarPageTree,
  SidebarViewport,
} from "fumadocs-ui/components/layout/sidebar";
import { type LinkItemType } from "fumadocs-ui/layouts/links";
import { RootToggle } from "fumadocs-ui/components/layout/root-toggle";
import { type BaseLayoutProps, getLinks } from "fumadocs-ui/layouts/shared";
import {
  LanguageToggle,
  LanguageToggleText,
} from "fumadocs-ui/components/layout/language-toggle";
import {
  CollapsibleControl,
  LayoutBody,
  Navbar,
  NavbarSidebarTrigger,
} from "fumadocs-ui/layouts/docs-client";
import { TreeContextProvider } from "fumadocs-ui/contexts/tree";
import { ThemeToggle } from "fumadocs-ui/components/layout/theme-toggle";
import {
  getSidebarTabsFromOptions,
  type SidebarOptions,
} from "fumadocs-ui/layouts/docs/shared";
import { NavProvider } from "fumadocs-ui/contexts/layout";
import { HideIfEmpty } from "fumadocs-core/hide-if-empty";
import { Header } from "fumadocs-ui/layouts/home";

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: Partial<SidebarOptions> & {
    enabled?: boolean;
    component?: ReactNode;
  };

  /**
   * Props for the `div` container
   */
  containerProps?: HTMLAttributes<HTMLDivElement>;
}

export function CustomDocsLayout({
  nav: { transparentMode, ...nav } = {},
  sidebar: {
    tabs: sidebarTabs,
    footer: sidebarFooter,
    banner: sidebarBanner,
    enabled: sidebarEnabled = true,
    collapsible: sidebarCollapsible = true,
    component: sidebarComponent,
    components: sidebarComponents,
    ...sidebarProps
  } = {},
  searchToggle = {},
  disableThemeSwitch = false,
  themeSwitch = { enabled: !disableThemeSwitch },
  i18n = false,
  children,
  ...props
}: DocsLayoutProps) {
  const tabs = useMemo(
    () => getSidebarTabsFromOptions(sidebarTabs, props.tree) ?? [],
    [sidebarTabs, props.tree],
  );
  const links = getLinks(props.links ?? [], props.githubUrl);

  const variables = cn(
    "[--fd-layout-offset:0px] [--fd-layout-width:100vw] [--fd-page-width:1280px] md:[--fd-sidebar-width:286px] md:[--fd-toc-width:286px]",
    !nav.component && nav.enabled !== false
      ? "[--fd-nav-height:56px]"
      : undefined,
  );

  // TODO: The scroll container for the sidebar is slightly too tall and gets cut off
  // at the bottom.
  const sidebar = sidebarComponent ?? (
    <>
      {sidebarCollapsible ? <CollapsibleControl /> : null}
      <Sidebar
        {...sidebarProps}
        collapsible={sidebarCollapsible}
        className="md:sticky md:top-[calc(var(--fd-sidebar-top)+32px)] md:h-[calc(100vh-var(--fd-sidebar-top))]"
      >
        <HideIfEmpty>
          <SidebarHeader className="data-[empty=true]:hidden">
            {/* Removed navbar links & title. */}
            {/* Also removed optional collapse button since it messes with
              the layout. */}
            {tabs.length > 0 && <RootToggle options={tabs} />}
            {sidebarBanner}
          </SidebarHeader>
        </HideIfEmpty>
        <SidebarViewport>
          {/* Removed navbar links. */}
          <SidebarPageTree components={sidebarComponents} />
        </SidebarViewport>
        <HideIfEmpty>
          <SidebarFooter className="data-[empty=true]:hidden">
            {/* Removed navbar links. */}
            <div className="flex items-center justify-end empty:hidden">
              {i18n ? (
                <LanguageToggle className="me-1.5">
                  <Languages className="size-4.5" />
                  <LanguageToggleText className="md:hidden" />
                </LanguageToggle>
              ) : null}
              {themeSwitch.enabled !== false &&
                (themeSwitch.component ?? (
                  <ThemeToggle className="p-0" mode={themeSwitch.mode} />
                ))}
            </div>
            {sidebarFooter}
          </SidebarFooter>
        </HideIfEmpty>
      </Sidebar>
    </>
  );

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        {/* Replaced default navbar with Home Layout Header. */}
        <Header
          {...props}
          nav={{
            ...nav,
            children: (
              <>
                {/* Added custom sidebar toggle button for mobile views. */}
                <NavbarSidebarTrigger className="ml-1.5 p-2 md:hidden" />
                {nav.children}
              </>
            ),
          }}
          links={links}
          searchToggle={searchToggle}
          disableThemeSwitch={disableThemeSwitch}
          themeSwitch={themeSwitch}
          i18n={i18n}
        />
        <LayoutBody
          {...props.containerProps}
          className={cn(
            variables,
            props.containerProps?.className,
            "!mx-0 flex flex-row",
          )}
        >
          {/* Added structuring/styling div */}
          <div className="flex w-screen flex-row items-start justify-center">
            {sidebarEnabled && sidebar}
            {children}
          </div>
        </LayoutBody>
      </NavProvider>
    </TreeContextProvider>
  );
}

export { CollapsibleControl, Navbar, NavbarSidebarTrigger, type LinkItemType };
