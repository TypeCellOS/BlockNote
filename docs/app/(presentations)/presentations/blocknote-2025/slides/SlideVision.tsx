import { ArrowRight } from "lucide-react";
import { CenteredSlide } from "../../_components/CenteredSlide";
import { SlideHeading } from "../../_components/SlideHeading";
import { SlideTitle } from "../../_components/SlideTitle";

export const SlideVision = () => {
  return (
    <CenteredSlide className="text-left">
      <div className="flex w-full max-w-5xl flex-col px-6">
        <SlideTitle>Vision</SlideTitle>

        <p className="mb-12 max-w-3xl text-4xl font-light leading-relaxed text-stone-600">
          Interoperability, extensibility, and standards.
        </p>

        <div className="space-y-6">
          <SlideHeading>Coming up:</SlideHeading>
          <ul className="space-y-4 text-3xl text-stone-600">
            <li className="flex items-center gap-3">
              <ArrowRight className="text-purple-600" size={32} />
              Document Imports
            </li>
            <li className="flex items-center gap-3">
              <ArrowRight className="text-purple-600" size={32} />
              Extension API and community ecosystem
            </li>
            <li className="flex items-center gap-3">
              <ArrowRight className="text-purple-600" size={32} />
              Standardizing documents
            </li>
          </ul>
        </div>
      </div>
    </CenteredSlide>
  );
};
