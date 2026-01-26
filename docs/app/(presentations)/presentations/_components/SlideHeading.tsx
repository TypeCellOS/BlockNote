import { ReactNode } from "react";

interface SlideHeadingProps {
  children: ReactNode;
  className?: string;
}

export const SlideHeading = ({
  children,
  className = "",
}: SlideHeadingProps) => {
  return (
    <h3 className={`mb-2 font-serif text-3xl text-stone-800 ${className}`}>
      {children}
    </h3>
  );
};
