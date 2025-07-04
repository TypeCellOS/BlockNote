import type { PageTree } from "fumadocs-core/server";
import { type HTMLAttributes, type ReactNode, useMemo } from "react";
import { cn } from "fumadocs-ui/utils/cn";
import {
  Sidebar,
  SidebarHeader,
  SidebarPageTree,
  SidebarViewport,
} from "fumadocs-ui/components/layout/sidebar";
import { type LinkItemType } from "fumadocs-ui/layouts/links";
import { RootToggle } from "fumadocs-ui/components/layout/root-toggle";
import { type BaseLayoutProps, getLinks } from "fumadocs-ui/layouts/shared";
import {
  CollapsibleControl,
  LayoutBody,
  Navbar,
  NavbarSidebarTrigger,
} from "fumadocs-ui/layouts/docs-client";
import { TreeContextProvider } from "fumadocs-ui/contexts/tree";
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
    "[--fd-layout-offset:0px] [--fd-layout-width:1566px] [--fd-page-width:1566px] md:[--fd-sidebar-width:286px] md:[--fd-toc-width:286px]",
    !nav.component && nav.enabled !== false
      ? "[--fd-nav-height:56px]"
      : undefined,
  );

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
            {tabs.length > 0 && <RootToggle options={tabs} />}
            {sidebarBanner}
          </SidebarHeader>
        </HideIfEmpty>
        <SidebarViewport>
          <SidebarPageTree components={sidebarComponents} />
        </SidebarViewport>
      </Sidebar>
    </>
  );

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        <Header
          {...props}
          nav={{
            ...nav,
            children: (
              <>
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
          <div className="flex w-screen items-start justify-center">
            <div className="flex max-w-full flex-row">
              {sidebarEnabled && sidebar}
              {children}
            </div>
          </div>
        </LayoutBody>
      </NavProvider>
    </TreeContextProvider>
  );
}

export { CollapsibleControl, Navbar, NavbarSidebarTrigger, type LinkItemType };
