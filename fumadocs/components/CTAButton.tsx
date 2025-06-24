import Link from "next/link";
import { ReactNode } from "react";

export default function CTAButton(props: {
  href: string;
  hoverGlow?: boolean;
  size?: "small" | "large";
  children: ReactNode;
}) {
  return (
    <div className="not-prose button-glow-parent relative flex h-fit w-fit flex-wrap">
      <Link
        className={`bg-fd-accent border-fd-border text-fd-foreground z-20 m-0 rounded-full border font-medium ${props.size === "small" ? "px-3 py-1.5 text-xs md:text-sm" : "px-4 py-2 text-base md:text-lg"}`}
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
