import { ReactNode } from "react";

interface SlideTextProps {
  children: ReactNode;
  className?: string;
}

export const SlideText = ({ children, className = "" }: SlideTextProps) => {
  return <p className={`text-2xl text-stone-600 ${className}`}>{children}</p>;
};
