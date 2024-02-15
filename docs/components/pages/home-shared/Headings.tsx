import cn from "classnames";
import gradients from "./gradients.module.css";

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
    "tracking-[-0.04em] leading-none text-7xl sm:text-[80px] text-transparent",
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
        "max-w-sm pb-1 text-center text-[32px] font-bold tracking-[-0.01em] text-transparent md:max-w-md md:text-4xl lg:max-w-2xl lg:text-[40px]",
      )}>
      {children}
    </h2>
  );
}

export function SectionSubtext({
  children,
}: {
  hero?: boolean;
  children: React.ReactNode;
}) {
  return (
    <p
      className={`font-space-grotesk text-lg leading-snug text-[#00000080] sm:text-xl dark:text-[#FFFFFFB2]`}>
      {children}
    </p>
  );
}
