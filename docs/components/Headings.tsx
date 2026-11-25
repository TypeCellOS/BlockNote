import { cn } from "@/lib/fumadocs/cn";
import gradients from "./gradients.module.css";

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className={cn(
        gradients.heroHeading,
        "text-center text-[32px] font-bold tracking-[-0.01em] text-transparent md:text-[40px]",
      )}
    >
      {children}
    </h2>
  );
}
