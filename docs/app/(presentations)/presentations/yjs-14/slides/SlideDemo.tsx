import { CenteredSlide } from "../../_components/CenteredSlide";

export const SlideDemo = () => {
  return (
    <CenteredSlide>
      <div className="relative aspect-[16/10] w-[70vw] overflow-hidden rounded-xl border border-stone-200 shadow-2xl shadow-purple-200/50">
        <video
          data-autoplay
          src="/video/demo-suggestions.mp4"
          className="h-full w-full object-cover"
          muted
          playsInline
          loop
        />
      </div>
    </CenteredSlide>
  );
};
