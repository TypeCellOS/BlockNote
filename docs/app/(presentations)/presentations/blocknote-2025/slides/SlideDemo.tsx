import { CenteredSlide } from "../../_components/CenteredSlide";
import { SlideTitle } from "../../_components/SlideTitle";

export const SlideDemo = () => {
  return (
    <CenteredSlide className="text-left">
      <div className="flex w-full max-w-5xl flex-col px-6">
        <SlideTitle className="mb-6 text-6xl">Demo</SlideTitle>
        <p className="text-3xl font-light text-stone-500">
          Custom blocks & Schemas
        </p>
      </div>
    </CenteredSlide>
  );
};
