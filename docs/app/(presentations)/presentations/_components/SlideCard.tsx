import { ReactNode } from "react";

interface SlideCardProps {
  children: ReactNode;
  className?: string;
}

export const SlideCard = ({ children, className = "" }: SlideCardProps) => {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
};
