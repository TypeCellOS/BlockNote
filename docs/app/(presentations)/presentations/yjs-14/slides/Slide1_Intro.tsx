import { CenteredSlide } from "../../_components/CenteredSlide";

export const Slide1_Intro = () => {
  return (
    <CenteredSlide>
      <div className="mb-[2vh] inline-flex items-center gap-[0.5vmin] rounded-full border border-purple-200 bg-white/60 px-[1.5vmin] py-[0.5vmin] text-[1.5vmin] font-bold uppercase tracking-widest text-purple-700 backdrop-blur-sm">
        <img
          src="https://fosdem.org/2026/apple-touch-icon.png"
          alt="FOSDEM Logo"
          className="h-[2vmin] w-[2vmin]"
        />
        <span>FOSDEM</span>
      </div>
      <h1 className="mb-6 font-serif text-7xl leading-tight text-stone-900">
        Yjs 14 & BlockNote update
      </h1>
      <p className="max-w-xl text-center text-3xl font-light leading-relaxed text-stone-600">
        Suggestions and Attributions
      </p>
      <p className="mt-8 text-xl font-medium text-stone-400">
        Nick Perez, Kevin Jahns ⛷️, Yousef El-Dardiry
      </p>
      <div className="mt-12 grid place-items-center">
        {/* State 1: BlockNote & Yjs (Fades out) */}
        <div
          className="fragment fade-out col-start-1 row-start-1 flex items-center justify-around gap-12 rounded-xl border border-stone-100 bg-white p-8 shadow-sm"
          data-fragment-index="0"
        >
          <img
            src="https://yjs.dev/_next/static/media/yjslogo.a1275f44.svg"
            alt="Yjs"
            className="h-10 opacity-90"
          />
          <img
            src="/img/logos/banner.svg"
            alt="BlockNote"
            className="h-10 opacity-90"
          />
        </div>

        {/* State 2: Partners (Fades in) */}
        <div
          className="fragment fade-in col-start-1 row-start-1 flex items-center justify-around gap-12 rounded-xl border border-stone-100 bg-white p-8 shadow-sm"
          data-fragment-index="0"
        >
          <img
            src="/img/sponsors/zendis.svg"
            alt="ZenDiS"
            className="h-14 opacity-90"
          />
          <img
            src="/img/sponsors/dinumLight.svg"
            alt="DINUM"
            className="h-14 opacity-90"
          />
          <img
            src="/img/sponsors/lasuite-docs.svg"
            alt="Docs"
            className="h-14 opacity-90"
          />
        </div>
      </div>
    </CenteredSlide>
  );
};
