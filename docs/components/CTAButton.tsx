import Link from "next/link";
import { ReactNode } from "react";

export default function CTAButton(props: {
  href: string;
  hoverGlow?: boolean;
  size?: "default" | "small";
  variant?: "default" | "colored";
  children: ReactNode;
}) {
  return (
    <div className="not-prose button-glow-parent relative flex h-fit w-fit flex-wrap text-nowrap">
      <Link
        className={`z-20 m-0 rounded-full font-medium ${props.variant === "colored" ? "text-fd-background dark:text-fd-foreground bg-indigo-600 hover:bg-indigo-500" : "bg-fd-accent border-fd-border text-fd-foreground border"} ${props.size === "small" ? "px-3 py-1.5 text-xs md:text-sm" : "px-4 py-2 text-base md:text-lg"}`}
        href={props.href}
        suppressHydrationWarning
      >
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
