import Link from "next/link";
import { ReactNode } from "react";

export function CTAButton(props: {
  href: string;
  hoverGlow?: boolean;
  variant?: "small" | "large";
  children: ReactNode;
}) {
  return (
    <div className="button-glow-parent relative flex h-fit w-fit flex-wrap">
      <Link
        className={`z-20 rounded-full bg-slate-800 font-medium text-white hover:bg-slate-900 dark:hover:bg-slate-700 ${props.variant === "small" ? "px-3 py-1.5 text-xs md:text-sm" : "px-4 py-2 text-base md:text-lg"}`}
        href={props.href}>
        {props.children}
      </Link>
      {props.hoverGlow && (
        <div
          className={"button-glow absolute z-10 h-full w-full rounded-full"}
        />
      )}
    </div>
  );
}
