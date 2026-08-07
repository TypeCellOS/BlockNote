import { isTouchDevice } from "@blocknote/core";
import { useEffect, useState } from "react";

/**
 * Whether the editor is being used on a mobile (touch) device. Used to decide
 * between the desktop and mobile formatting toolbar controllers.
 *
 * The check runs after mount rather than during render so it's SSR-safe: the
 * server (and the first client render) assume desktop, then switch to mobile on
 * the client if it's a touch device - avoiding a hydration mismatch. Touch
 * capability doesn't change during a session, so a one-off check is enough.
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(isTouchDevice());
  }, []);

  return isMobile;
};
