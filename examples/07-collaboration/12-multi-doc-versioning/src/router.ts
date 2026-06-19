import { useEffect, useState } from "react";

const parse = (): string[] => {
  const raw = window.location.hash.replace(/^#\/?/, "");
  const segments = raw.split("?")[0].split("/").filter(Boolean);
  return segments;
};

export const useHashRoute = (): string[] => {
  const [segments, setSegments] = useState(parse);
  useEffect(() => {
    const handler = () => setSegments(parse());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  return segments;
};

export const navigate = (path: string): void => {
  const target = path.startsWith("#")
    ? path
    : "#" + (path.startsWith("/") ? path : "/" + path);
  if (window.location.hash === target) {
    return;
  }
  window.location.hash = target.slice(1);
};

export const replaceRoute = (path: string): void => {
  const target = path.startsWith("#")
    ? path
    : "#" + (path.startsWith("/") ? path : "/" + path);
  const url = window.location.pathname + window.location.search + target;
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
};
