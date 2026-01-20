import { Header } from "@/components/fumadocs/layout/home/client";
import { buttonVariants } from "@/components/fumadocs/ui/button";
import { cn } from "@/lib/fumadocs/cn";
import { baseOptions } from "@/lib/layout.shared";
import { SidebarTrigger } from "fumadocs-ui/components/sidebar/base";
import { DocsLayout, DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import { SidebarIcon } from "lucide-react";
import { FaBook, FaCode } from "react-icons/fa6";

/**
 * We wrap the default fumadocs docs layout
 * to add the header (navbar) from the customized home layout
 *
 * The default Docs layout doesn't support a navbar on all screensizes
 */
export function CustomDocsLayout({
  children,
  tree,
}: Pick<DocsLayoutProps, "tree" | "children">) {
  const base = baseOptions();

  return (
    // width needed for our header
    <main className={cn("flex flex-1 flex-col [--fd-layout-width:1400px]")}>
      <DocsLayout
        tree={tree}
        {...base}
        links={[]}
        searchToggle={{ enabled: false }}
        themeSwitch={{ enabled: false }}
        // inject regular header
        nav={{
          component: (
            <div className="col-span-full [grid-area:header]">
              <Header
                {...base}
                themeSwitch={{ enabled: false }}
                nav={{
                  ...base.nav,
                  children: (
                    <>
                      {/* 
                      Added custom sidebar toggle button for mobile views. 
                      This is specific to Docs, because it triggers the left sidebar (not the top nav)
                      */}
                      <SidebarTrigger
                        className={cn(
                          buttonVariants({
                            color: "ghost",
                            size: "icon-sm",
                            className: "p-2",
                          }),
                          "md:hidden",
                        )}
                      >
                        <SidebarIcon />
                      </SidebarTrigger>
                      {base.nav?.children}
                    </>
                  ),
                }}
              />
            </div>
          ),
        }}
        // We override the gridTemplate to add support for our full-width header
        // (the default can be seen when ejecting the docs layout, or
        // https://github.com/fuma-nama/fumadocs/blob/e2fbe21c8aca4485ee189f3bf2a83ceb1edc336e/packages/base-ui/src/layouts/docs/client.tsx#L61 )
        containerProps={{
          style: {
            gridTemplate: `"header header header"
          "sidebar main toc" 1fr / minmax(var(--fd-sidebar-col), 1fr) minmax(0, calc(var(--fd-layout-width,97rem) - var(--fd-sidebar-width) - var(--fd-toc-width))) minmax(var(--fd-toc-width), 1fr)`,
            "--fd-docs-row-1": "var(--fd-banner-height, 0px)",
            "--fd-docs-row-2":
              "calc(var(--fd-docs-row-1) + var(--fd-header-height))",
            "--fd-docs-row-3":
              "calc(var(--fd-docs-row-2) + var(--fd-toc-popover-height))",
            // '--fd-sidebar-col': collapsed ? '0px' : 'var(--fd-sidebar-width)',
          } as object,
          className: "[--fd-layout-width:1400px]",
        }}
        sidebar={{
          // don't allow collapsing when sidebar when not on mobile
          collapsible: false,
          // tabs for the dropdown (top of sidebar)
          tabs: [
            {
              icon: (
                <FaBook className="border-fd-primary text-fd-primary bg-fd-primary/10 h-full w-full rounded-sm border p-2 md:p-0.5" />
              ),
              title: "Documentation",
              description: "Learn how to use BlockNote",
              url: "/docs",
            },
            {
              icon: (
                <FaCode className="border-fd-primary text-fd-primary bg-fd-primary/10 h-full w-full rounded-sm border p-2 md:p-0.5" />
              ),
              title: "Examples",
              description: "See BlockNote in action",
              url: "/examples",
            },
          ],
        }}
      >
        {children}
      </DocsLayout>
    </main>
  );
}
