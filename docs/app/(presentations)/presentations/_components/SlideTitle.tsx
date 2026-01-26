import { ReactNode } from "react";

interface SlideTitleProps {
  children: ReactNode;
  className?: string;
}

export const SlideTitle = ({ children, className = "" }: SlideTitleProps) => {
  return (
    <h2 className={`mb-12 font-serif text-4xl text-stone-900 ${className}`}>
      {children}
    </h2>
  );
};
