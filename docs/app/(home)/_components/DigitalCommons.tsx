"use client";
import Link from "next/link";
import React, { useRef, useState } from "react";

export const DigitalCommons: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <section className="relative overflow-hidden bg-[#1e1e2f] py-20">
      {/* Warm gradient overlay to harmonize with cream hero */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-900/5 via-transparent to-purple-900/20" />
      {/* Top edge gradient for smoother transition */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-stone-200/10 to-transparent" />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Asymmetric layout: content + video (vertically centered) */}
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          {/* Left: Editorial content */}
          <div className="flex-1 lg:max-w-md">
            {/* Eyebrow with EU flag only */}
            <div className="mb-6 flex items-center gap-3">
              <span className="text-xl">🇪🇺</span>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-200/80">
                Digital Commons
              </span>
            </div>

            {/* Headline - editorial style */}
            <h2 className="mb-6 font-serif text-3xl leading-tight text-white md:text-4xl">
              Three nations choose
              <br />
              <span className="bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
                open source
              </span>{" "}
              to power
              <br />
              their digital future.
            </h2>

            {/* Short punchy copy */}
            <p className="mb-8 text-base leading-relaxed text-stone-400">
              France, Germany, and the Netherlands partner to build{" "}
              <strong className="text-white">Docs</strong> — a collaborative
              writing tool for thousands of public servants.{" "}
              <strong className="text-white">BlockNote is the engine.</strong>
            </p>

            {/* Compelling social proof - simpler */}
            <p className="mb-8 text-sm italic text-stone-500">
              "Building Digital Commons means better tools, data sovereignty,
              and shared progress."
            </p>

            {/* CTA */}
            <Link
              href="https://lasuite.numerique.gouv.fr/en/produits/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-purple-300 transition-colors hover:text-purple-200"
            >
              <span>Watch the story</span>
              <span>→</span>
            </Link>
          </div>

          {/* Right: Video - vertically centered */}
          <div className="relative flex-1 lg:flex-[1.2]">
            {/* Glow effect */}
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-purple-500/15 via-blue-500/10 to-amber-500/5 blur-2xl" />

            <div className="relative overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-purple-900/20">
              <video
                ref={videoRef}
                className="aspect-video w-full cursor-pointer bg-[#2a2a3d] object-cover"
                poster="/video/docs-poster.png"
                onClick={handlePlayPause}
                onEnded={() => setIsPlaying(false)}
                playsInline
              >
                <source src="/video/docs.mp4" type="video/mp4" />
              </video>

              {/* Play button overlay */}
              {!isPlaying && (
                <button
                  onClick={handlePlayPause}
                  className="absolute inset-0 flex items-center justify-center bg-black/20 transition-all hover:bg-black/30"
                  aria-label="Play video"
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-xl transition-transform hover:scale-110">
                    <svg
                      className="ml-1 h-8 w-8 text-purple-600"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
