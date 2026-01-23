"use client";
import {
  AudioWaveform,
  ChevronRight,
  Code2,
  FileText,
  Heading,
  Image,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Pilcrow,
  Puzzle,
  Quote,
  Table,
  Video,
} from "lucide-react";
import React from "react";

const BlockCatalogItem: React.FC<{ name: string; icon: React.ReactNode }> = ({
  name,
  icon,
}) => (
  <div className="group relative flex cursor-default flex-col items-center justify-center overflow-hidden rounded-xl border border-stone-100 bg-white p-3 transition-all duration-300 hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl hover:shadow-purple-500/10">
    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-purple-50/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    <div className="relative mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-stone-50 text-stone-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-purple-100 group-hover:text-purple-600">
      {icon}
    </div>
    <span className="relative text-xs font-medium text-stone-500 transition-colors group-hover:text-stone-900">
      {name}
    </span>
  </div>
);

export const BlockCatalog: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-stone-50 via-white to-purple-50/30 py-32">
      {/* Subtle decorative elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full bg-purple-100/40 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple-50/50 to-blue-50/50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mb-20 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-100 bg-white/50 text-3xl shadow-sm backdrop-blur-sm">
            🧩
          </div>
          <h2 className="mb-6 font-serif text-4xl text-stone-900 md:text-6xl">
            A universe of blocks.
          </h2>
          <p className="mx-auto max-w-2xl text-xl font-light leading-relaxed text-stone-600">
            Every BlockNote document is a collection of blocks—headings, lists,
            images, and more. Use the built-in blocks, customize them to fit
            your needs, or create entirely new ones.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          <BlockCatalogItem
            name="Paragraph"
            icon={<Pilcrow className="h-4 w-4" />}
          />
          <BlockCatalogItem
            name="Headings"
            icon={<Heading className="h-4 w-4" />}
          />
          <BlockCatalogItem name="List" icon={<List className="h-4 w-4" />} />
          <BlockCatalogItem
            name="Ordered List"
            icon={<ListOrdered className="h-4 w-4" />}
          />
          <BlockCatalogItem
            name="Checklist"
            icon={<ListTodo className="h-4 w-4" />}
          />
          <BlockCatalogItem
            name="Toggle List"
            icon={<ChevronRight className="h-4 w-4" />}
          />
          <BlockCatalogItem name="Code" icon={<Code2 className="h-4 w-4" />} />
          <BlockCatalogItem name="Quote" icon={<Quote className="h-4 w-4" />} />
          <BlockCatalogItem
            name="Divider"
            icon={<Minus className="h-4 w-4" />}
          />
          <BlockCatalogItem name="Table" icon={<Table className="h-4 w-4" />} />
          <BlockCatalogItem name="Image" icon={<Image className="h-4 w-4" />} />
          <BlockCatalogItem name="Video" icon={<Video className="h-4 w-4" />} />
          <BlockCatalogItem
            name="Audio"
            icon={<AudioWaveform className="h-4 w-4" />}
          />
          <BlockCatalogItem
            name="File"
            icon={<FileText className="h-4 w-4" />}
          />
          <BlockCatalogItem
            name="Your Own"
            icon={<Puzzle className="h-4 w-4" />}
          />
        </div>
      </div>
    </section>
  );
};
