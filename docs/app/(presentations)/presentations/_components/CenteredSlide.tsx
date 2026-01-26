import { ReactNode } from "react";
import { SlideSection } from "./SlideSection";

interface CenteredSlideProps {
  children: ReactNode;
  className?: string;
}

export const CenteredSlide = ({
  children,
  className = "",
}: CenteredSlideProps) => {
  return (
    <SlideSection>
      <div
        className={`mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-center px-6 text-center ${className}`}
      >
        {children}
      </div>
    </SlideSection>
  );
};
