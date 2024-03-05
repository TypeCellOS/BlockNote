import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import { ReactNode } from "react";

export function Section(props: {
  gradientBackground?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`relative flex h-fit w-full justify-center overflow-hidden ${props.className}`}>
      {props.gradientBackground && (
        <FadeIn noVertical className="absolute top-0 z-10 h-full w-full">
          <div className="section-glow h-full w-full" />
        </FadeIn>
      )}
      {props.children}
    </section>
  );
}
