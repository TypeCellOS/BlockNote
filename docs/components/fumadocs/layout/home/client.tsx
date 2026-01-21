"use client";
import { NavigationMenu } from "@base-ui/react";
import { useIsScrollTop } from "@fumadocs/base-ui/utils/use-is-scroll-top";
import { cva } from "class-variance-authority";
import Link from "fumadocs-core/link";
import { ChevronDown, Languages } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  Fragment,
  use,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { cn } from "../../../../lib/fumadocs/cn";
import { buttonVariants } from "../../ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../../ui/collapsible";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuRoot,
  NavigationMenuTrigger,
} from "../../ui/navigation-menu";
import { LanguageToggle, LanguageToggleText } from "../language-toggle";
import { LinkItem, MenuItemType } from "../link-item";
import { LargeSearchToggle, SearchToggle } from "../search-toggle";
import {
  type LinkItemType,
  type NavOptions,
  renderTitleNav,
  resolveLinkItems,
} from "../shared";
import { ThemeToggle } from "../theme-toggle";
import type { HomeLayoutProps } from "./index";

/*
  See `components/fumadocs/README.md` for more information on changes
*/
const MobileMenuContext = createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
} | null>(null);

export const navItemVariants = cva("[&_svg]:size-4", {
  variants: {
    variant: {
      main: "inline-flex items-center gap-1 p-2 text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary data-[popup-open]:text-fd-primary",
      button: buttonVariants({
        color: "secondary",
        className: "gap-1.5",
      }),
      icon: buttonVariants({
        color: "ghost",
        size: "icon",
      }),
    },
  },
  defaultVariants: {
    variant: "main",
  },
});

export function Header({
  nav = {},
  i18n = false,
  links,
  githubUrl,
  themeSwitch = {},
  searchToggle = {},
}: HomeLayoutProps) {
  const { navItems, menuItems } = useMemo(() => {
    const navItems: LinkItemType[] = [];
    const menuItems: LinkItemType[] = [];

    for (const item of resolveLinkItems({ links, githubUrl })) {
      switch (item.on ?? "all") {
        case "menu":
          menuItems.push(item);
          break;
        case "nav":
          navItems.push(item);
          break;
        default:
          navItems.push(item);
          menuItems.push(item);
      }
    }

    return { navItems, menuItems };
  }, [links, githubUrl]);

  const listRef = useRef<HTMLUListElement>(null);

  return (
    <MobileMenuCollapsible
      render={(_, s) => (
        <HeaderRoot
          transparentMode={nav.transparentMode}
          className={cn(s.open && "rounded-b-2xl shadow-lg")}
        >
          <NavigationMenuList className="flex h-14 w-full items-center px-4">
            {renderTitleNav(nav, {
              className: "inline-flex items-center gap-2.5 font-semibold",
            })}
            {nav.children}
            <ul
              className="flex flex-row items-center gap-2 px-6 max-sm:hidden"
              ref={listRef} // added
            >
              {navItems
                .filter((item) => !isSecondary(item))
                .map((item, i) => (
                  <NavigationMenuLinkItem
                    key={i}
                    item={item}
                    className="text-sm"
                  />
                ))}
            </ul>
            <div className="flex flex-1 flex-row items-center justify-end gap-1.5 max-lg:hidden">
              {searchToggle.enabled !== false &&
                (searchToggle.components?.lg ?? (
                  <LargeSearchToggle
                    className="w-full max-w-[240px] rounded-full ps-2.5"
                    hideIfDisabled
                  />
                ))}
              {themeSwitch.enabled !== false &&
                (themeSwitch.component ?? (
                  <ThemeToggle mode={themeSwitch?.mode} />
                ))}
              {i18n && (
                <LanguageToggle>
                  <Languages className="size-5" />
                </LanguageToggle>
              )}
              <ul className="flex flex-row items-center gap-2 empty:hidden">
                {navItems.filter(isSecondary).map((item, i) => (
                  <NavigationMenuLinkItem
                    key={i}
                    className={cn(
                      item.type === "icon" && "-mx-1 first:ms-0 last:me-0",
                    )}
                    item={item}
                  />
                ))}
              </ul>
            </div>
            <ul className="-me-1.5 ms-auto flex flex-row items-center lg:hidden">
              {searchToggle.enabled !== false &&
                (searchToggle.components?.sm ?? (
                  <SearchToggle className="p-2" hideIfDisabled />
                ))}
              <CollapsibleTrigger
                aria-label="Toggle Menu"
                className={cn(
                  buttonVariants({
                    size: "icon",
                    color: "ghost",
                    className: "[&_svg]:size-5.5 group",
                  }),
                )}
              >
                <ChevronDown className="transition-transform duration-300 group-data-[panel-open]:rotate-180" />
              </CollapsibleTrigger>
            </ul>
          </NavigationMenuList>
          <CollapsibleContent className="flex flex-col px-4">
            {menuItems
              .filter((item) => !isSecondary(item))
              .map((item, i) => (
                <MobileMenuLinkItem
                  key={i}
                  item={item}
                  className="first:mt-4 sm:hidden"
                />
              ))}
            <div className="-ms-1.5 flex flex-row items-center justify-end gap-2 pb-4 pt-2">
              {menuItems.filter(isSecondary).map((item, i) => (
                <MobileMenuLinkItem
                  key={i}
                  item={item}
                  className={cn(item.type === "icon" && "-mx-1 first:ms-0")}
                />
              ))}
              <div role="separator" className="flex-1 sm:hidden" />
              {i18n && (
                <LanguageToggle>
                  <Languages className="size-5" />
                  <LanguageToggleText />
                  <ChevronDown className="text-fd-muted-foreground size-3" />
                </LanguageToggle>
              )}
              {themeSwitch.enabled !== false &&
                (themeSwitch.component ?? (
                  <ThemeToggle mode={themeSwitch?.mode} />
                ))}
            </div>
          </CollapsibleContent>
          <NavigationMenu.Portal>
            <NavigationMenu.Positioner
              sideOffset={5}
              align="start" // added
              anchor={listRef} // added
              className="h-(--positioner-height) w-(--positioner-width) max-w-(--available-width) duration-(--duration) ease-(--easing) z-200 transition-[left,right] data-[instant]:transition-none"
              style={{
                ["--duration" as string]: "0.35s",
                ["--easing" as string]: "cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {/* bg changed from fd-background/80 to white */}
              <NavigationMenu.Popup className="w-(--popup-width) h-(--popup-height) max-w-(--fd-layout-width,1400px) origin-(--transform-origin) duration-(--duration) ease-(--easing) relative rounded-xl border bg-white shadow-lg backdrop-blur-lg transition-[opacity,transform,width,height,scale,translate] data-[ending-style]:scale-90 data-[starting-style]:scale-90 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 data-[ending-style]:duration-150">
                <NavigationMenu.Viewport className="relative size-full overflow-hidden" />
              </NavigationMenu.Popup>
            </NavigationMenu.Positioner>
          </NavigationMenu.Portal>
        </HeaderRoot>
      )}
    />
  );
}

function MobileMenuCollapsible(props: ComponentProps<typeof Collapsible>) {
  const [open, setOpen] = useState(false);

  const onClick = useEffectEvent((e: Event) => {
    if (!open) return;
    const header = document.getElementById("nd-nav");
    if (header && !header.contains(e.target as HTMLElement)) setOpen(false);
  });

  useEffect(() => {
    window.addEventListener("click", onClick);

    return () => {
      window.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <MobileMenuContext
      value={useMemo(
        () => ({
          open,
          setOpen,
        }),
        [open],
      )}
    >
      <Collapsible open={open} onOpenChange={setOpen} {...props} />
    </MobileMenuContext>
  );
}

function isSecondary(item: LinkItemType): boolean {
  if ("secondary" in item && item.secondary != null) return item.secondary;

  return item.type === "icon";
}

function HeaderRoot({
  transparentMode = "none",
  children,
  className,
  ...props
}: ComponentProps<"div"> & {
  transparentMode?: NavOptions["transparentMode"];
}) {
  const isTop = useIsScrollTop({ enabled: transparentMode === "top" }) ?? true;
  const isTransparent =
    transparentMode === "top" ? isTop : transparentMode === "always";

  return (
    <header id="nd-nav" className="sticky top-0 z-40 h-14">
      <NavigationMenuRoot
        delay={10} // added
        render={(_, s) => (
          <nav
            className={cn(
              "max-w-(--fd-layout-width) mx-auto w-full border-b backdrop-blur-lg transition-colors",
              (!isTransparent || s.open) && "bg-fd-background/80",
              className,
            )}
            {...props}
          >
            {children}
          </nav>
        )}
      />
    </header>
  );
}

function NavigationMenuLinkItem({
  item,
  ...props
}: {
  item: LinkItemType;
  className?: string;
}) {
  if (item.type === "custom") return <div {...props}>{item.children}</div>;

  if (item.type === "menu") {
    // modified significantly to make groups
    const groups = new Map<string, MenuItemType["items"]>();

    for (const child of item.items) {
      const groupName =
        (child.type !== "custom" ? child.groupName : undefined) ?? "default";
      const list = groups.get(groupName) ?? [];
      list.push(child);
      groups.set(groupName, list);
    }

    const children = Array.from(groups.entries()).map(
      ([groupName, items], j) => (
        <li key={j} className={cn("flex w-[248px] flex-col gap-4")}>
          {groupName !== "default" && (
            <h5
              className="text-fd-muted-foreground pl-2.5 text-sm font-semibold"
              id={`nav-group-${groupName}-${j}`}
            >
              {groupName}
            </h5>
          )}
          <ul
            className={cn("flex flex-col gap-2")}
            aria-labelledby={
              groupName !== "default"
                ? `nav-group-${groupName}-${j}`
                : undefined
            }
          >
            {items.map((child, k) => {
              if (child.type === "custom") {
                return (
                  <li key={k}>
                    <Fragment>{child.children}</Fragment>
                  </li>
                );
              }

              const {
                banner = child.icon ? (
                  <div className="bg-fd-muted mt-1 w-fit rounded-md border p-1 [&_svg]:size-5">
                    {child.icon}
                  </div>
                ) : null,
                ...rest
              } = child.menu ?? {};

              return (
                // added <li>
                <li key={k}>
                  <NavigationMenuLink
                    render={
                      <Link
                        href={child.url}
                        external={child.external}
                        {...rest}
                        className={cn(
                          "hover:bg-fd-accent hover:text-fd-accent-foreground flex flex-row items-start gap-3 rounded-lg p-2.5 transition-colors",
                          rest.className,
                        )}
                      >
                        {rest.children ?? (
                          <>
                            {banner}
                            <div className="flex flex-col gap-0.5">
                              <p className="text-sm font-medium">
                                {child.text}
                              </p>
                              <p className="text-fd-muted-foreground text-xs empty:hidden">
                                {child.description}
                              </p>
                            </div>
                          </>
                        )}
                      </Link>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </li>
      ),
    );

    return (
      <NavigationMenuItem {...props}>
        <NavigationMenuTrigger className={cn(navItemVariants(), "rounded-md")}>
          {item.url ? (
            <Link href={item.url} external={item.external}>
              {item.text}
            </Link>
          ) : (
            item.text
          )}
        </NavigationMenuTrigger>
        <NavigationMenuContent
          className={"flex"}
          // className="grid grid-cols-1 gap-2 p-4 md:grid-cols-2 lg:grid-cols-3"
          render={({ children, ...props }) => <ul {...props}>{children}</ul>} // added
        >
          {children}
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem {...props}>
      <NavigationMenuLink
        render={
          <LinkItem
            item={item}
            aria-label={item.type === "icon" ? item.label : undefined}
            className={cn(navItemVariants({ variant: item.type }))}
          >
            {item.type === "icon" ? item.icon : item.text}
          </LinkItem>
        }
      />
    </NavigationMenuItem>
  );
}

function MobileMenuLinkItem({
  item,
  className,
}: {
  item: LinkItemType;
  className?: string;
}) {
  if (item.type === "custom")
    return <div className={cn("grid", className)}>{item.children}</div>;
  const { setOpen } = use(MobileMenuContext)!;

  if (item.type === "menu") {
    const header = (
      <>
        {item.icon}
        {item.text}
      </>
    );

    return (
      <div className={cn("mb-4 flex flex-col", className)}>
        <p className="text-fd-muted-foreground mb-1 text-sm">
          {item.url ? (
            <Link
              href={item.url}
              external={item.external}
              onClick={() => setOpen(false)}
            >
              {header}
            </Link>
          ) : (
            header
          )}
        </p>
        {item.items.map((child, i) => (
          <MobileMenuLinkItem key={i} item={child} />
        ))}
      </div>
    );
  }

  return (
    <LinkItem
      item={item}
      className={cn(
        (!item.type || item.type === "main") &&
          "hover:text-fd-popover-foreground/50 data-[active=true]:text-fd-primary inline-flex items-center gap-2 py-1.5 transition-colors data-[active=true]:font-medium [&_svg]:size-4",
        item.type === "icon" &&
          buttonVariants({
            size: "icon",
            color: "ghost",
          }),
        item.type === "button" &&
          buttonVariants({
            color: "secondary",
            className: "gap-1.5 [&_svg]:size-4",
          }),
        className,
      )}
      aria-label={item.type === "icon" ? item.label : undefined}
      onClick={() => setOpen(false)}
    >
      {item.icon}
      {item.type !== "icon" && item.text}
    </LinkItem>
  );
}
