import React from "react";

export const FrameworkPill: React.FC<{
  name: string;
  color: string;
  icon?: React.ReactNode;
}> = ({ name, color, icon }) => (
  <div className="flex cursor-default items-center gap-2 whitespace-nowrap rounded-full border border-stone-200 bg-white/50 px-4 py-2 shadow-sm backdrop-blur-sm transition-colors hover:border-purple-200 hover:bg-white">
    {icon || <div className={`h-2 w-2 rounded-full ${color}`}></div>}
    <span className="text-sm font-medium text-stone-600">{name}</span>
  </div>
);
