import { ReactNode } from "react";
import { SlideSection } from "./SlideSection";

interface ContentSlideProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}

export const ContentSlide = ({
  title,
  children,
  className = "",
  wide = false,
}: ContentSlideProps) => {
  const maxWidth = wide ? "max-w-7xl" : "max-w-5xl";
  return (
    <SlideSection>
      <div
        className={`mx-auto flex h-full w-full flex-col px-6 pt-24 text-left ${maxWidth}`}
      >
        <h2 className="mb-12 font-serif text-5xl text-stone-900">{title}</h2>
        <div
          className={`flex w-full flex-1 flex-col justify-start ${className}`}
        >
          {children}
        </div>
      </div>
    </SlideSection>
  );
};
