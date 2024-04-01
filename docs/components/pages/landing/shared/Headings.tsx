import cn from "classnames";
import gradients from "./gradients.module.css";
import { FadeIn } from "@/components/pages/landing/shared/FadeIn";
import { ReactNode } from "react";

export function HeroText({
  children,
  className,
  h1,
}: {
  children: React.ReactNode;
  className?: string;
  h1?: boolean;
}) {
  const combinedClassname = cn(
    gradients.heroHeading,
    "leading-none text-6xl text-transparent font-medium md:text-7xl",
    className,
  );

  if (h1) {
    return <h1 className={combinedClassname}>{children}</h1>;
  }
  return <h2 className={combinedClassname}>{children}</h2>;
}

export function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className={cn(
        gradients.heroHeading,
        "text-center text-[32px] font-bold tracking-[-0.01em] text-transparent md:text-[40px]",
      )}>
      {children}
    </h2>
  );
}

export function SectionSubHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className={cn(
        gradients.heroHeading,
        "text-center text-[22px] font-bold tracking-[-0.01em] text-transparent md:text-[28px]",
      )}>
      {children}
    </h2>
  );
}

export function SectionSubtext({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "font-space-grotesk text-lg leading-snug text-[#00000080] dark:text-[#FFFFFFB2] md:text-xl",
        className,
      )}>
      {children}
    </p>
  );
}

export function SectionIntro({
  header,
  subtext,
}: {
  header: ReactNode;
  subtext: ReactNode;
}) {
  return (
    <FadeIn className="flex max-w-full flex-col items-center gap-2 text-center md:max-w-screen-md md:gap-4">
      <SectionHeader>{header}</SectionHeader>
      <SectionSubtext>{subtext}</SectionSubtext>
    </FadeIn>
  );
}
