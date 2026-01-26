import { Globe, Mail } from "lucide-react";
import { CenteredSlide } from "../../_components/CenteredSlide";
import { SlideTitle } from "../../_components/SlideTitle";

export const SlideThankYou = () => {
  return (
    <CenteredSlide>
      <img
        src="/img/logos/banner.svg"
        alt="BlockNote Logo"
        className="mb-12 h-20"
      />

      <SlideTitle className="text-5xl">Thank you!</SlideTitle>

      <div className="flex gap-12 text-3xl text-stone-600">
        <div className="flex items-center gap-3">
          <Globe className="text-purple-600" />
          <a
            href="https://blocknotejs.org"
            target="_blank"
            className="transition-colors hover:text-purple-600"
          >
            blocknotejs.org
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Mail className="text-purple-600" />
          <a
            href="mailto:team@blocknotejs.org"
            className="transition-colors hover:text-purple-600"
          >
            team@blocknotejs.org
          </a>
        </div>
      </div>
    </CenteredSlide>
  );
};
