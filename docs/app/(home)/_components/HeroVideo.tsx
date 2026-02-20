"use client";
import Link from "next/link";
import React from "react";

export const HeroVideo: React.FC = () => {
  return (
    <>
      <style>{`
        .HeroVideo_link {
          transition: transform 500ms;
        }
        .HeroVideo_link:hover {
          transform: scale(1.02);
        }
        @media (min-width: 1024px) {
          .HeroVideo_container {
            perspective: 1000px;
          }
          .HeroVideo_link {
            transform: rotateY(-10deg) rotateX(2deg);
            transform-style: preserve-3d;
          }
          .HeroVideo_link:hover {
            transform: rotateY(-10deg) rotateX(2deg) scale(1.02);
          }
        }
      `}</style>
      <div className="HeroVideo_container relative aspect-[4/3] w-full">
        {/* Editor Placeholder */}
        {/* Editor Preview */}
        <Link href="/demo" className="HeroVideo_link block h-full w-full">
          <div className="relative h-full w-full overflow-hidden rounded-xl border border-stone-200 shadow-2xl shadow-purple-200/50 hover:shadow-purple-300/50">
            <div className="flex h-full flex-col bg-white">
              {/* Browser Chrome */}
              <div
                aria-hidden="true"
                className="flex items-center gap-4 border-b border-stone-100 bg-white/50 px-4 py-3 backdrop-blur-md"
              >
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                  <div className="h-2.5 w-2.5 rounded-full bg-green-400/80" />
                </div>
                <div className="flex flex-1 items-center justify-center rounded-md bg-stone-100/50 py-1 text-[10px] font-medium text-stone-400">
                  yourproduct.org
                </div>
                <div className="w-10" />
              </div>
              {/* Video Content */}
              <div className="relative flex-1 bg-white">
                <video
                  ref={(el) => {
                    if (el) {
                      el.onended = () => {
                        setTimeout(() => {
                          el.currentTime = 0;
                          setTimeout(() => {
                            el.play();
                          }, 500);
                        }, 2000);
                      };
                    }
                  }}
                  src="/video/blocknote-explainer.mp4"
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full"
                />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </>
  );
};
