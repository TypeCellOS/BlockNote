"use client";
import { Check, ChevronsUpDown } from "lucide-react";
import { type ComponentProps, type ReactNode, useMemo, useState } from "react";
import Link from "fumadocs-core/link";
import { usePathname } from "fumadocs-core/framework";
import { cn } from "../../../../../lib/fumadocs/cn";
import { normalize, isActive } from "../../../../../lib/fumadocs/urls";
import { useSidebar } from "../base";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";
import type { SidebarTab } from "./index";

export interface SidebarTabWithProps extends SidebarTab {
  props?: ComponentProps<"a">;
}

export function SidebarTabsDropdown({
  options,
  placeholder,
  ...props
}: {
  placeholder?: ReactNode;
  options: SidebarTabWithProps[];
} & ComponentProps<"button">) {
  const [open, setOpen] = useState(false);
  const { closeOnRedirect } = useSidebar();
  const pathname = usePathname();

  const selected = useMemo(() => {
    return options.findLast((item) => isTabActive(item, pathname));
  }, [options, pathname]);

  const onClick = () => {
    closeOnRedirect.current = false;
    setOpen(false);
  };

  const item = selected ? (
    <>
      <div className="size-9 shrink-0 empty:hidden md:size-5">
        {selected.icon}
      </div>
      <div>
        <p className="text-sm font-medium">{selected.title}</p>
        <p className="text-fd-muted-foreground text-sm empty:hidden md:hidden">
          {selected.description}
        </p>
      </div>
    </>
  ) : (
    placeholder
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {item && (
        <PopoverTrigger
          {...props}
          className={cn(
            "flex items-center gap-2 rounded-lg p-2 border bg-fd-secondary/50 text-start text-fd-secondary-foreground transition-colors hover:bg-fd-accent data-[open]:bg-fd-accent data-[open]:text-fd-accent-foreground",
            props.className,
          )}
        >
          {item}
          <ChevronsUpDown className="text-fd-muted-foreground ms-auto size-4 shrink-0" />
        </PopoverTrigger>
      )}
      <PopoverContent className="fd-scroll-container flex w-(--anchor-width) flex-col gap-1 p-1">
        {options.map((item) => {
          const isActive = selected && item.url === selected.url;
          if (!isActive && item.unlisted) {
            return;
          }

          return (
            <Link
              key={item.url}
              href={item.url}
              onClick={onClick}
              {...item.props}
              className={cn(
                "flex items-center gap-2 rounded-lg p-1.5 hover:bg-fd-accent hover:text-fd-accent-foreground",
                item.props?.className,
              )}
            >
              <div className="size-9 shrink-0 empty:hidden md:mb-auto md:size-5">
                {item.icon}
              </div>
              <div>
                <p className="text-sm leading-none font-medium">{item.title}</p>
                <p className="text-fd-muted-foreground mt-1 text-[0.8125rem] empty:hidden">
                  {item.description}
                </p>
              </div>

              <Check
                className={cn(
                  "shrink-0 ms-auto size-3.5 text-fd-primary",
                  !isActive && "invisible",
                )}
              />
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function isTabActive(tab: SidebarTab, pathname: string) {
  if (tab.urls) {
    return tab.urls.has(normalize(pathname));
  }

  return isActive(tab.url, pathname, true);
}
