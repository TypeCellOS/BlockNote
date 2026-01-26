import { CenteredSlide } from "../../_components/CenteredSlide";

export const Slide1 = () => {
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
        BlockNote 2025
      </h1>
      <p className="max-w-xl text-center text-3xl font-light leading-relaxed text-stone-600">
        Building the modern block-based editing layer for the open web.
      </p>
      <p className="mt-8 text-xl font-medium text-stone-400">
        Nick Perez & Yousef El-Dardiry
      </p>
    </CenteredSlide>
  );
};
