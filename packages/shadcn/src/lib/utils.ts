import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
  prefix: "bn-",
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
