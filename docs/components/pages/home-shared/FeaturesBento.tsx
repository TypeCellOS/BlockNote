import { FeaturesCardData } from "../landing/PackFeatures";
import { FadeIn } from "./FadeIn";
import { FeatureBox } from "./FeatureBox";
import { SectionHeader, SectionSubtext } from "./Headings";

export function FeaturesBento({
  header,
  body,
  features,
}: {
  header: string;
  body: string;
  features: FeaturesCardData[];
}) {
  return (
    <section className="relative flex flex-col items-center px-6 py-16 pb-16 font-sans md:pb-24 lg:pb-32 gap-9 lg:gap-14">
      <FadeIn className="flex flex-col items-center gap-5 md:gap-6">
        <SectionHeader>{header}</SectionHeader>
        <SectionSubtext>{body}</SectionSubtext>
      </FadeIn>
      <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-6 max-w-[1200px]">
        {features.map((feature) => (
          <FadeIn className="flex" key={feature.title}>
            <FeatureBox
              description={feature.description}
              iconDark={feature.bgImgDark}
              iconLight={feature.bgImgLight}
              name={feature.title}
            />
          </FadeIn>
        ))}
      </div>
    </section>
  );
}
