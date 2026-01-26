import { ReactNode } from "react";

interface SlideSectionProps {
  children: ReactNode;
  className?: string;
  bg?: string;
}

export const SlideSection = ({
  children,
  className = "",
  bg = "#fdfbf7",
}: SlideSectionProps) => {
  return (
    <section data-background-color={bg} className={`h-full ${className}`}>
      {children}
    </section>
  );
};
