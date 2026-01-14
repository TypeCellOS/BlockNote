import { Logo } from "@/app/Shared";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <div className="flex items-center gap-2">
          <Logo className="h-5 w-5" />
          <span className="font-serif font-medium">BlockNote</span>
          <span className="rounded-full border border-purple-200 bg-gradient-to-r from-purple-100 to-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-900">
            AI Native
          </span>
        </div>
      ),
    },
    links: [
      {
        text: "Features",
        url: "#",
      },
      {
        text: "Enterprise",
        url: "#",
      },
      {
        text: "Documentation",
        url: "/docs",
      },
    ],
  };
}
