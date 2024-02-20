import { ThemedImage } from "@/components/ThemedImage";
import { SectionHeader } from "../home-shared/Headings";
import { FadeIn } from "./shared/FadeIn";

export function Sponsors() {
  return (
    <div>
      <div className="bg-white py-24 sm:py-32">
        <div
          className={
            "z-20 flex max-w-full flex-col items-center gap-12 px-4 md:max-w-screen-md xl:max-w-none"
          }>
          <FadeIn className="flex max-w-full flex-col items-center gap-2 text-center md:max-w-screen-md md:gap-4">
            <SectionHeader>Sponsors &amp; users</SectionHeader>
            {/* <SectionSubtext>
            {
              "Whether you want deep customization or a great out-of-the-box experience, BlockNote has you covered with features for any use case."
            }
          </SectionSubtext> */}
          </FadeIn>

          <div className="-mx-6 grid grid-cols-2 gap-0.5 overflow-hidden sm:mx-0 sm:rounded-2xl md:grid-cols-3">
            <div className="bg-gray-400/5 p-8 sm:p-10">
              <ThemedImage
                height={32}
                width={170}
                src="/img/sponsors/fermat.png"
                darkImage={"/img/sponsors/fermat-dark.png"}
                alt="Fermat"
              />
              {/* <p className="text-small -mb-2 text-center">hello</p> */}
            </div>
            <div className="bg-gray-400/5 p-6 sm:p-10">
              <ThemedImage
                height={32}
                width={170}
                src="/img/sponsors/nlnet.svg"
                darkImage={"/img/sponsors/nlnet-dark.svg"}
                alt="NLNet"
              />
            </div>
            <div className="bg-gray-400/5 p-6 sm:p-10">
              <ThemedImage
                height={32}
                width={170}
                src="/img/sponsors/typecell.svg"
                darkImage={"/img/sponsors/typecell-dark.svg"}
                alt="TypeCell"
              />
            </div>
            <div className="bg-gray-400/5 p-6 sm:p-10">
              <ThemedImage
                height={32}
                width={170}
                src="/img/sponsors/poggio.svg"
                darkImage={"/img/sponsors/poggio-dark.svg"}
                alt="Poggio"
              />
            </div>
            <div className="bg-gray-400/5 p-6 sm:p-10">
              <ThemedImage
                height={32}
                width={170}
                src="/img/sponsors/twenty.png"
                darkImage={"/img/sponsors/twenty-dark.png"}
                alt="Twenty"
              />
            </div>
            <div className="bg-gray-400/5 p-6 sm:p-10">
              <ThemedImage
                height={32}
                width={170}
                src="/img/sponsors/noteplan.png"
                darkImage={"/img/sponsors/noteplan-dark.png"}
                alt="Noteplan"
              />{" "}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
