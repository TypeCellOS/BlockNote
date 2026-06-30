import { useEffect, useState } from "react";

import type { User } from "@blocknote/core/extensions";

import { USERS } from "./userdata.js";

const STORAGE_KEY = "bn-multi-doc-user";

/**
 * Per-tab identity via sessionStorage so two browser tabs can hold different
 * users simultaneously. The `?as=<id>` URL param takes precedence and is
 * persisted into sessionStorage.
 */
export const getCurrentUser = (): User | null => {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("as");
    if (fromUrl && USERS.some((u) => u.id === fromUrl)) {
      sessionStorage.setItem(STORAGE_KEY, fromUrl);
      return USERS.find((u) => u.id === fromUrl)!;
    }
    const id = sessionStorage.getItem(STORAGE_KEY);
    return USERS.find((u) => u.id === id) ?? null;
  } catch {
    return null;
  }
};

export const setCurrentUser = (id: string | null): void => {
  try {
    if (id) {
      sessionStorage.setItem(STORAGE_KEY, id);
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
  // Keep the ?as= URL param in sync
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("as")) {
      if (id) {
        url.searchParams.set("as", id);
      } else {
        url.searchParams.delete("as");
      }
      window.history.replaceState(null, "", url.toString());
    }
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("bn-identity-change"));
};

export const useCurrentUser = (): User | null => {
  const [user, setUser] = useState(getCurrentUser);
  useEffect(() => {
    const handler = () => setUser(getCurrentUser());
    window.addEventListener("bn-identity-change", handler);
    return () => window.removeEventListener("bn-identity-change", handler);
  }, []);
  return user;
};
