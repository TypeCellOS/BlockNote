import { ReactNode } from "react";
import { SlideSection } from "./SlideSection";

interface ContentSlideProps {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}

export const ContentSlide = ({
  title,
  children,
  className = "",
}: ContentSlideProps) => {
  return (
    <SlideSection>
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col px-6 pt-24 text-left">
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
