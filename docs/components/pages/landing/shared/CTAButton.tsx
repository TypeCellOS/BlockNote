import Link from "next/link";
import { ReactNode } from "react";

export default function CTAButton(props: {
  href: string;
  hoverGlow?: boolean;
  color?: "default" | "pro";
  size?: "small" | "large";
  children: ReactNode;
}) {
  return (
    <div className="button-glow-parent relative flex h-fit w-fit flex-wrap">
      <Link
        className={`z-20 rounded-full font-medium text-white ${props.size === "small" ? "px-3 py-1.5 text-xs md:text-sm" : "px-4 py-2 text-base md:text-lg"} ${props.color === "pro" ? "bg-indigo-600 hover:bg-indigo-900 dark:hover:bg-indigo-700" : "bg-slate-800 hover:bg-slate-900 dark:hover:bg-slate-700"}`}
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
